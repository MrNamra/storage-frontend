import { fetchDataFromAPI } from './api';

export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

export interface ChunkUploadProgress {
  phase: 'init' | 'uploading_chunks' | 'assembling' | 'uploading_to_telegram' | 'completed' | 'error';
  percent: number; // 0..100
  chunkIndex: number;
  totalChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  message: string;
  resumed?: boolean;
  error?: string;
}

export interface UploadFileOptions {
  file: File;
  bucketId?: string | number;
  code?: string;
  password?: string;
  token?: string;
  chunkSize?: number;
  onProgress?: (progress: ChunkUploadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Upload a file using resilient, resumable chunked uploading.
 * Handles large files (200MB - 2GB+) seamlessly without timing out.
 */
export async function uploadFileChunked(options: UploadFileOptions): Promise<{
  uploadId: string;
  fileName: string;
  message: string;
}> {
  const {
    file,
    bucketId,
    code,
    password,
    token,
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new Error('Upload cancelled before start');
  }

  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  // Deterministic identifier based on file properties so resumes match across refreshes
  const fileIdentifier = `${file.name}_${file.size}_${file.lastModified}`;

  onProgress?.({
    phase: 'init',
    percent: 0,
    chunkIndex: 0,
    totalChunks,
    uploadedBytes: 0,
    totalBytes: file.size,
    message: 'Checking existing upload status on server...',
  });

  // 1. Handshake with server: check if chunks already exist (resumability)
  const initPayload: Record<string, any> = {
    file_name: file.name,
    file_size: file.size,
    total_chunks: totalChunks,
    chunk_size: chunkSize,
    file_identifier: fileIdentifier,
  };

  if (bucketId) {
    initPayload.bucket_id = bucketId;
  }
  if (code) {
    initPayload.code = code;
    if (password) {
      initPayload.password = password;
    }
  }

  const initRes = await fetchDataFromAPI<{
    success: boolean;
    data: {
      upload_id: string;
      uploaded_chunks: number[];
      total_chunks: number;
      resumed: boolean;
    };
    message: string;
  }>('upload/init', 'post', initPayload, token);

  const uploadId = initRes.data.upload_id;
  const existingChunks = new Set<number>(initRes.data.uploaded_chunks || []);
  const isResumed = existingChunks.size > 0;

  if (isResumed) {
    const initialPercent = Math.min(80, Math.round((existingChunks.size / totalChunks) * 80));
    onProgress?.({
      phase: 'uploading_chunks',
      percent: initialPercent,
      chunkIndex: existingChunks.size,
      totalChunks,
      uploadedBytes: Math.min(file.size, existingChunks.size * chunkSize),
      totalBytes: file.size,
      message: `Resuming upload from chunk ${existingChunks.size + 1} of ${totalChunks}...`,
      resumed: true,
    });
  }

  // 2. Upload chunks sequentially (skipping already uploaded ones)
  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    if (signal?.aborted) {
      throw new Error('Upload cancelled');
    }

    // Skip chunk if already present on server
    if (existingChunks.has(chunkIdx)) {
      continue;
    }

    const start = chunkIdx * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', String(chunkIdx));
    formData.append('chunk', chunkBlob, `chunk_${chunkIdx}`);

    // Retry loop: retry up to 3 times on transient network error
    let attempts = 0;
    const maxAttempts = 3;
    let uploaded = false;
    let lastError: any = null;

    while (attempts < maxAttempts && !uploaded) {
      if (signal?.aborted) {
        throw new Error('Upload cancelled');
      }

      attempts++;
      try {
        await fetchDataFromAPI('upload/chunk', 'post', formData, token);
        uploaded = true;
        existingChunks.add(chunkIdx);
      } catch (err: any) {
        lastError = err;
        if (attempts < maxAttempts && !signal?.aborted) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, attempts * 1200));
        }
      }
    }

    if (!uploaded) {
      throw new Error(
        lastError?.response?.data?.message ||
          lastError?.message ||
          `Failed uploading chunk ${chunkIdx + 1} of ${totalChunks} after ${maxAttempts} attempts`
      );
    }

    // Progress updates: Chunks account for 0% to 80% of total progress
    const chunkProgress = Math.min(80, Math.round((existingChunks.size / totalChunks) * 80));
    const percentOverall = Math.round((end / file.size) * 100);

    onProgress?.({
      phase: 'uploading_chunks',
      percent: chunkProgress,
      chunkIndex: chunkIdx + 1,
      totalChunks,
      uploadedBytes: end,
      totalBytes: file.size,
      message: `Uploading chunk ${chunkIdx + 1} of ${totalChunks} (${percentOverall}%)...`,
      resumed: isResumed,
    });
  }

  if (signal?.aborted) {
    throw new Error('Upload cancelled');
  }

  // 3. Signal server to assemble chunks and transfer to Telegram in background
  onProgress?.({
    phase: 'assembling',
    percent: 82,
    chunkIndex: totalChunks,
    totalChunks,
    uploadedBytes: file.size,
    totalBytes: file.size,
    message: 'All chunks uploaded. Assembling file on server...',
    resumed: isResumed,
  });

  const completeRes = await fetchDataFromAPI<{
    success: boolean;
    data: {
      upload_id: string;
      status: string;
      file_name: string;
    };
    message: string;
  }>('upload/complete', 'post', { upload_id: uploadId }, token);

  // 4. Poll background status until complete (prevents HTTP timeouts!)
  onProgress?.({
    phase: 'uploading_to_telegram',
    percent: 85,
    chunkIndex: totalChunks,
    totalChunks,
    uploadedBytes: file.size,
    totalBytes: file.size,
    message: 'Transferring to Telegram Cloud in background...',
  });

  return new Promise((resolve, reject) => {
    let pollInterval: any = null;
    let pollCount = 0;
    const maxPolls = 1800; // 45 minutes max (handles even 2GB uploads)

    const checkStatus = async () => {
      if (signal?.aborted) {
        clearInterval(pollInterval);
        reject(new Error('Upload cancelled'));
        return;
      }

      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        reject(new Error('Upload timed out waiting for Telegram confirmation'));
        return;
      }

      try {
        const statusRes = await fetchDataFromAPI<{
          success: boolean;
          data: {
            status: 'processing' | 'uploading_to_telegram' | 'completed' | 'failed';
            progress?: number;
            message?: string;
            error?: string;
          };
        }>(`upload/status/${uploadId}`, 'get', null, token);

        const s = statusRes.data;

        if (s.status === 'completed') {
          clearInterval(pollInterval);
          onProgress?.({
            phase: 'completed',
            percent: 100,
            chunkIndex: totalChunks,
            totalChunks,
            uploadedBytes: file.size,
            totalBytes: file.size,
            message: 'File successfully uploaded to Telegram Cloud!',
          });
          resolve({
            uploadId,
            fileName: file.name,
            message: s.message || 'File uploaded successfully',
          });
          return;
        }

        if (s.status === 'failed') {
          clearInterval(pollInterval);
          const errorMsg = s.error || s.message || 'Telegram upload failed';
          onProgress?.({
            phase: 'error',
            percent: 0,
            chunkIndex: totalChunks,
            totalChunks,
            uploadedBytes: file.size,
            totalBytes: file.size,
            message: errorMsg,
            error: errorMsg,
          });
          reject(new Error(errorMsg));
          return;
        }

        // Telegram upload in progress (maps 0..100% to overall 80..99%)
        const tgProgress = Math.max(0, Math.min(100, s.progress ?? 0));
        const overall = 80 + Math.round((tgProgress * 19) / 100);

        onProgress?.({
          phase: 'uploading_to_telegram',
          percent: overall,
          chunkIndex: totalChunks,
          totalChunks,
          uploadedBytes: file.size,
          totalBytes: file.size,
          message: s.message || `Transferring to Telegram Cloud (${tgProgress}%)...`,
        });
      } catch (err: any) {
        // If single poll fails, don't crash immediately, wait for next tick
        console.warn('Status poll error:', err);
      }
    };

    pollInterval = setInterval(checkStatus, 1500);
    // Initial immediate poll
    checkStatus();
  });
}

/**
 * Cancel an upload on the server and remove stored chunks.
 */
export async function cancelChunkUpload(uploadId: string, token?: string): Promise<void> {
  try {
    await fetchDataFromAPI(`upload/cancel/${uploadId}`, 'post', null, token);
  } catch (err) {
    console.warn('Failed to cancel upload on server:', err);
  }
}
