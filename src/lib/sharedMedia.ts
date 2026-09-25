/**
 * Utility to manage files shared via Android System Share Sheet (Web Share Target API)
 * stored in IndexedDB by the Service Worker.
 */

const DB_NAME = 'cloudvault_share_target';
const DB_VERSION = 2;
const STORE_NAME = 'shared_files';

function openShareDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSharedFiles(): Promise<File[]> {
  try {
    const db = await openShareDB();
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        return resolve([]);
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAllReq = store.getAll();

      getAllReq.onerror = () => resolve([]);
      getAllReq.onsuccess = () => {
        const records = getAllReq.result || [];
        const files: File[] = [];

        for (const rec of records) {
          if (!rec) continue;
          const items = Array.isArray(rec.files) ? rec.files : (rec.files ? [rec.files] : []);
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item) continue;

            const ext = item.type?.startsWith('video/')
              ? '.mp4'
              : item.type?.startsWith('audio/')
              ? '.mp3'
              : item.type === 'application/pdf'
              ? '.pdf'
              : item.type?.includes('png')
              ? '.png'
              : '.jpg';
            const fallbackName = `shared_${rec.timestamp || Date.now()}_${i + 1}${ext}`;
            const fileName = item.name || (item instanceof File ? item.name : '') || fallbackName;
            const fileType = item.type || item.blob?.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');

            if (item instanceof File) {
              files.push(item);
            } else if (item instanceof Blob) {
              const file = new File([item], fileName, {
                type: fileType,
                lastModified: Date.now(),
              });
              files.push(file);
            } else if (item.blob instanceof Blob) {
              const file = new File([item.blob], item.name || fileName, {
                type: fileType,
                lastModified: item.lastModified || Date.now(),
              });
              files.push(file);
            } else if (item.data || item.buffer) {
              const bufferData = item.data || item.buffer;
              const file = new File([bufferData], fileName, {
                type: fileType,
                lastModified: item.lastModified || Date.now(),
              });
              files.push(file);
            }
          }
        }

        resolve(files);
      };
    });
  } catch (err) {
    console.warn('[SharedMedia] Could not read shared files from DB:', err);
    return [];
  }
}

export async function clearPendingSharedFiles(): Promise<void> {
  try {
    const db = await openShareDB();
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        return resolve();
      }
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('[SharedMedia] Could not clear shared files DB:', err);
  }
}
