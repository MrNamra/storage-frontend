import JSZip from 'jszip';
import { uploadFileChunked } from './chunkedUpload';
import { bulkDownloadFiles, triggerBlobDownload, parseFilenameFromHeaders } from './bulkDownload';
import { fetchDataFromAPI } from './api';

export interface RestoreProgress {
  stage: 'inspecting' | 'extracting' | 'uploading' | 'completed' | 'cancelled' | 'error';
  currentFileName: string;
  currentIndex: number;
  totalFiles: number;
  percent: number;
  message: string;
}

export interface RestoreOptions {
  filesOrZip: File[] | FileList | File;
  bucketId: string | number;
  token?: string;
  signal?: AbortSignal;
  onProgress?: (progress: RestoreProgress) => void;
}

/**
 * Automatically inspects files or a ZIP archive, unzips any backup packages,
 * and streams every file directly into the selected cloud drive/bucket.
 */
export async function restoreBackupToBucket(options: RestoreOptions): Promise<{
  totalRestored: number;
  message: string;
}> {
  const { filesOrZip, bucketId, token, signal, onProgress } = options;

  if (signal?.aborted) {
    throw new Error('Restore cancelled before start');
  }

  const rawList: File[] =
    filesOrZip instanceof File
      ? [filesOrZip]
      : Array.from(filesOrZip);

  if (rawList.length === 0) {
    throw new Error('No files provided to restore');
  }

  onProgress?.({
    stage: 'inspecting',
    currentFileName: '',
    currentIndex: 0,
    totalFiles: rawList.length,
    percent: 0,
    message: 'Analyzing files and backup archives...',
  });

  const filesToUpload: File[] = [];

  // Step 1: Unpack any ZIP archives or collect direct files
  for (let i = 0; i < rawList.length; i++) {
    if (signal?.aborted) throw new Error('Restore cancelled');
    const f = rawList[i];

    const isZip =
      f.name.toLowerCase().endsWith('.zip') ||
      f.type === 'application/zip' ||
      f.type === 'application/x-zip-compressed';

    if (isZip) {
      onProgress?.({
        stage: 'extracting',
        currentFileName: f.name,
        currentIndex: i + 1,
        totalFiles: rawList.length,
        percent: Math.round(((i + 1) / rawList.length) * 100),
        message: `Extracting backup archive: ${f.name}...`,
      });

      try {
        const zip = await JSZip.loadAsync(f);
        const entries = Object.entries(zip.files);

        for (const [pathInZip, entry] of entries) {
          if (entry.dir) continue;
          if (
            pathInZip.includes('__MACOSX') ||
            pathInZip.endsWith('.DS_Store') ||
            pathInZip.endsWith('desktop.ini') ||
            pathInZip.startsWith('.')
          ) {
            continue;
          }

          const blob = await entry.async('blob');
          const cleanName = pathInZip.split('/').pop() || pathInZip;
          const extractedFile = new File([blob], cleanName, {
            type: blob.type || 'application/octet-stream',
            lastModified: entry.date ? entry.date.getTime() : Date.now(),
          });
          filesToUpload.push(extractedFile);
        }
      } catch (err: any) {
        console.warn(`Could not extract ${f.name} as zip, uploading as regular file:`, err);
        filesToUpload.push(f);
      }
    } else {
      filesToUpload.push(f);
    }
  }

  if (filesToUpload.length === 0) {
    throw new Error('No valid files found inside backup archive');
  }

  // Step 2: Upload all files chunked to the selected drive
  let restoredCount = 0;
  for (let i = 0; i < filesToUpload.length; i++) {
    if (signal?.aborted) throw new Error('Restore cancelled');

    const file = filesToUpload[i];
    const filePercent = Math.round(((i) / filesToUpload.length) * 100);

    onProgress?.({
      stage: 'uploading',
      currentFileName: file.name,
      currentIndex: i + 1,
      totalFiles: filesToUpload.length,
      percent: filePercent,
      message: `Restoring (${i + 1}/${filesToUpload.length}): ${file.name}`,
    });

    await uploadFileChunked({
      file,
      bucketId,
      token,
      signal,
      onProgress: (chunkP) => {
        const subProgress = Math.round(
          ((i + chunkP.percent / 100) / filesToUpload.length) * 100
        );
        onProgress?.({
          stage: 'uploading',
          currentFileName: file.name,
          currentIndex: i + 1,
          totalFiles: filesToUpload.length,
          percent: subProgress,
          message: `Restoring (${i + 1}/${filesToUpload.length}): ${file.name} (${Math.round(chunkP.percent)}%)`,
        });
      },
    });

    restoredCount++;
  }

  onProgress?.({
    stage: 'completed',
    currentFileName: '',
    currentIndex: restoredCount,
    totalFiles: restoredCount,
    percent: 100,
    message: `Successfully restored ${restoredCount} file(s) to cloud drive!`,
  });

  return {
    totalRestored: restoredCount,
    message: `Restored ${restoredCount} file(s) to your cloud drive!`,
  };
}

export interface BackupDriveOptions {
  bucketId: string | number;
  bucketName: string;
  token?: string;
  signal?: AbortSignal;
  onProgress?: (progress: { current: number; total: number; percent: number; statusText: string }) => void;
}

/**
 * Downloads all files stored in a cloud drive and packages them into a clean ZIP backup.
 */
export async function backupDriveToZip(options: BackupDriveOptions): Promise<void> {
  const { bucketId, bucketName, token, signal, onProgress } = options;

  onProgress?.({
    current: 0,
    total: 0,
    percent: 0,
    statusText: 'Fetching drive file list...',
  });

  // Fetch up to 1000 files from this drive
  const res = await fetchDataFromAPI<any>(`bucket/display/${bucketId}?page=1&limit=1000`, 'get', '', token);
  const files: any[] = Array.isArray(res?.data) ? res.data : (res?.data?.files || []);

  if (!files || files.length === 0) {
    throw new Error('This drive has no files to backup');
  }

  const cleanName = (bucketName || `drive_${bucketId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const zipFilename = `${cleanName}_backup_${dateStr}.zip`;

  await bulkDownloadFiles({
    files,
    zipFilename,
    signal,
    onProgress: (p) => {
      onProgress?.({
        current: p.current,
        total: p.total,
        percent: p.percent,
        statusText: `Archiving (${p.current}/${p.total}): ${p.currentFileName}`,
      });
    },
    fetchFileBlob: async (item) => {
      const downloadEndpoint = item.stream_url
        ? `${item.stream_url}?dl=1`
        : `/api/bucket/file/download/${bucketId}/${item.msg_id}`;

      const fileRes: any = await fetchDataFromAPI(
        downloadEndpoint.replace(/^\/api\//, ''),
        'get',
        '',
        token,
        undefined,
        'blob'
      );

      const blob = fileRes.data instanceof Blob ? fileRes.data : new Blob([fileRes.data]);
      return {
        blob,
        filename: item.file_name || `file_${item.msg_id}`,
      };
    },
  });
}

