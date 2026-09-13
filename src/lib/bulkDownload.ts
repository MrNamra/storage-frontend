import JSZip from 'jszip';

export interface BulkProgress {
  current: number;
  total: number;
  percent: number;
  currentFileName: string;
  stage: 'downloading' | 'zipping' | 'saving' | 'done';
}

export interface BulkDownloadOptions {
  files: Array<{
    msg_id: string | number;
    file_name?: string;
    [key: string]: any;
  }>;
  fetchFileBlob: (file: any, signal?: AbortSignal) => Promise<{ blob: Blob; filename: string }>;
  zipFilename?: string;
  onProgress?: (progress: BulkProgress) => void;
  signal?: AbortSignal;
}

/**
 * Triggers a browser download of a given Blob.
 */
export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {}
  }, 4000);
};

/**
 * Parses RFC 6266 Content-Disposition header to get filename.
 */
export const parseFilenameFromHeaders = (headers: any, fallback: string): string => {
  if (!headers) return fallback;
  const contentDisposition = headers['content-disposition'] || headers['Content-Disposition'];
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]*)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch (e) {}
  }

  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (filenameMatch && filenameMatch[1]) {
    const raw = filenameMatch[1].replace(/^['"]|['"]$/g, '').trim();
    try {
      return decodeURIComponent(raw);
    } catch (e) {
      return raw;
    }
  }

  return fallback;
};

/**
 * Makes filename unique in case multiple files share the exact same name.
 */
const getUniqueFilename = (filename: string, existingNames: Set<string>): string => {
  if (!existingNames.has(filename)) {
    existingNames.add(filename);
    return filename;
  }

  const dotIndex = filename.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;
  const ext = dotIndex !== -1 ? filename.substring(dotIndex) : '';

  let counter = 1;
  let candidate = `${baseName} (${counter})${ext}`;
  while (existingNames.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})${ext}`;
  }

  existingNames.add(candidate);
  return candidate;
};

/**
 * Downloads multiple files sequentially or concurrently and packages them into a ZIP archive.
 * If only 1 file is selected, it downloads directly without ZIP packaging.
 */
export const bulkDownloadFiles = async ({
  files,
  fetchFileBlob,
  zipFilename = 'cloudvault-files.zip',
  onProgress,
  signal,
}: BulkDownloadOptions): Promise<void> => {
  if (!files || files.length === 0) {
    return;
  }

  // If only 1 file, download directly without ZIP
  if (files.length === 1) {
    const file = files[0];
    onProgress?.({
      current: 1,
      total: 1,
      percent: 30,
      currentFileName: file.file_name || 'downloading...',
      stage: 'downloading',
    });

    const { blob, filename } = await fetchFileBlob(file, signal);

    onProgress?.({
      current: 1,
      total: 1,
      percent: 100,
      currentFileName: filename,
      stage: 'done',
    });

    triggerBlobDownload(blob, filename);
    return;
  }

  // Multiple files -> Package into ZIP
  const zip = new JSZip();
  const existingNames = new Set<string>();
  const total = files.length;
  let completed = 0;

  // Process files with concurrency of 2 to avoid choking network/server while staying fast
  const concurrency = 2;
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < total) {
      if (signal?.aborted) {
        throw new DOMException('Download aborted by user', 'AbortError');
      }

      const currentIndex = index++;
      const file = files[currentIndex];

      onProgress?.({
        current: completed,
        total,
        percent: Math.round((completed / total) * 85),
        currentFileName: file.file_name || `File ${currentIndex + 1}`,
        stage: 'downloading',
      });

      try {
        const { blob, filename } = await fetchFileBlob(file, signal);
        const uniqueName = getUniqueFilename(filename || `file_${file.msg_id}`, existingNames);
        zip.file(uniqueName, blob);
      } catch (err: any) {
        if (signal?.aborted || err?.name === 'AbortError') {
          throw err;
        }
        console.error(`Failed to download file ${file.msg_id}:`, err);
        // Continue downloading other files even if one fails
      }

      completed++;
      onProgress?.({
        current: completed,
        total,
        percent: Math.round((completed / total) * 85),
        currentFileName: file.file_name || `File ${currentIndex + 1}`,
        stage: 'downloading',
      });
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  if (signal?.aborted) {
    throw new DOMException('Download aborted by user', 'AbortError');
  }

  // Generate ZIP
  onProgress?.({
    current: total,
    total,
    percent: 90,
    currentFileName: 'Packaging ZIP archive...',
    stage: 'zipping',
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      // Photos and videos are already compressed, so STORE avoids CPU overhead and builds instantly
      compression: 'STORE',
    },
    (metadata) => {
      const zippingPercent = 85 + Math.round(metadata.percent * 0.14);
      onProgress?.({
        current: total,
        total,
        percent: Math.min(zippingPercent, 99),
        currentFileName: 'Packaging ZIP archive...',
        stage: 'zipping',
      });
    }
  );

  onProgress?.({
    current: total,
    total,
    percent: 100,
    currentFileName: zipFilename,
    stage: 'done',
  });

  triggerBlobDownload(zipBlob, zipFilename);
};
