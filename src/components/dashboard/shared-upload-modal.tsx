import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Upload,
  X,
  Folder,
  Image as ImageIcon,
  Plus,
  AlertCircle,
  Sparkles,
  Video,
  File as FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchDataFromAPI } from '@/lib/api';
import { uploadFileChunked } from '@/lib/chunkedUpload';
import {
  getAuthToken,
  getDefaultBackupBucket,
  setDefaultBackupBucket,
  isAutoUploadOnShareEnabled,
  setAutoUploadOnShare,
} from '@/lib/constants';
import { getPendingSharedFiles, clearPendingSharedFiles } from '@/lib/sharedMedia';
import toast from 'react-hot-toast';

interface BucketItem {
  id: string | number;
  bucketName: string;
}

interface SharedUploadModalProps {
  onUploadSuccess?: () => void;
}

export function SharedUploadModal({ onUploadSuccess }: SharedUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [buckets, setBuckets] = useState<BucketItem[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberDefault, setRememberDefault] = useState(false);

  const location = useLocation();

  // Create thumbnail URLs for image previews and clean up on change/unmount
  useEffect(() => {
    const urls = sharedFiles.map((file) => {
      if (file && file.type && file.type.startsWith('image/')) {
        try {
          return URL.createObjectURL(file);
        } catch {
          return '';
        }
      }
      return '';
    });
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [sharedFiles]);

  const fetchBuckets = async (token?: any): Promise<BucketItem[]> => {
    const userToken = token || getAuthToken();
    if (!userToken) return [];
    setLoadingBuckets(true);
    try {
      const res = await fetchDataFromAPI<{ data?: { bucket?: BucketItem[] } }>('user/dashboard', 'get', '', userToken);
      const list = res?.data?.bucket || [];
      setBuckets(list);

      const defaultBucket = getDefaultBackupBucket();
      if (defaultBucket && list.some((b) => String(b.id) === String(defaultBucket))) {
        setSelectedBucket(defaultBucket);
      } else if (list.length > 0) {
        setSelectedBucket((prev) => prev || String(list[0].id));
      }
      return list;
    } catch (err) {
      console.error('[SharedUploadModal] Failed to fetch buckets:', err);
      return [];
    } finally {
      setLoadingBuckets(false);
    }
  };

  const triggerDirectUpload = async (filesToUpload: File[], targetBucketId: string, tokenToUse: string) => {
    if (isUploading || filesToUpload.length === 0 || !targetBucketId) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg('');

    const targetBucketObj = buckets.find((b) => String(b.id) === String(targetBucketId));
    const targetName = targetBucketObj ? targetBucketObj.bucketName : 'Backup';

    const toastId = toast.loading(`⚡ Auto-uploading ${filesToUpload.length} item(s) to "${targetName}"...`);
    let completedCount = 0;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setCurrentFileIndex(i + 1);
        setCurrentFileName(file.name);

        await uploadFileChunked({
          file,
          bucketId: targetBucketId,
          token: tokenToUse,
          onProgress: (p) => {
            setUploadProgress(p.percent);
            toast.loading(`[${i + 1}/${filesToUpload.length}] ${file.name} (${p.percent}%)`, {
              id: toastId,
            });
          },
        });

        completedCount++;
      }

      await clearPendingSharedFiles();

      toast.success(`🎉 Auto-uploaded ${completedCount} file(s) to "${targetName}"!`, {
        id: toastId,
      });

      setIsOpen(false);
      setSharedFiles([]);

      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[SharedUploadModal] Auto-upload error:', err);
      toast.error(err?.message || 'Upload failed', { id: toastId });
      setErrorMsg(err?.message || 'Upload encountered an error');
    } finally {
      setIsUploading(false);
    }
  };

  // Check for shared files in IndexedDB on mount, navigation, focus, or SW message
  const checkQueue = async () => {
    if (isUploading) return;
    const userToken = getAuthToken();
    if (!userToken) return; // User must be logged in to upload

    try {
      const files = await getPendingSharedFiles();
      if (files && files.length > 0) {
        setSharedFiles(files);
        setIsOpen(true);
        const list = await fetchBuckets(userToken);

        const defaultBucket = getDefaultBackupBucket();
        const autoShare = isAutoUploadOnShareEnabled();

        // Clean URL ?shared=1 if present
        if (window.location.search.includes('shared=1')) {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }

        // Check if Auto-Upload on share is active
        if (autoShare && defaultBucket && list.some((b) => String(b.id) === String(defaultBucket))) {
          setSelectedBucket(defaultBucket);
          setTimeout(() => {
            triggerDirectUpload(files, defaultBucket, userToken);
          }, 500);
        }
      }
    } catch (e) {
      console.warn('[SharedUploadModal] Error checking shared queue:', e);
    }
  };

  useEffect(() => {
    checkQueue();

    const handleFocus = () => checkQueue();
    const handleCustomTrigger = () => checkQueue();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkQueue();
      }
    };
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CLOUDVULT_SHARED_FILES_READY') {
        checkQueue();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('cloudvault:check_shared_queue', handleCustomTrigger);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('cloudvault:check_shared_queue', handleCustomTrigger);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [location.pathname, location.search]);

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    const userToken = getAuthToken();
    if (!userToken) return;

    if (!newBucketName.trim()) {
      setErrorMsg('Please enter a bucket name');
      return;
    }
    setErrorMsg('');
    try {
      const res = await fetchDataFromAPI<{ message?: string }>('bucket/create', 'post', { name: newBucketName.trim() }, userToken);
      toast.success(res?.message || 'Bucket created successfully');
      const createdName = newBucketName.trim();
      setNewBucketName('');
      setIsCreatingBucket(false);

      // Reload bucket list
      const updatedRes = await fetchDataFromAPI<{ data?: { bucket?: BucketItem[] } }>('user/dashboard', 'get', '', userToken);
      const list = updatedRes?.data?.bucket || [];
      setBuckets(list);

      // Automatically select newly created bucket
      const created = list.find((b: BucketItem) => b.bucketName.toLowerCase() === createdName.toLowerCase());
      if (created) {
        setSelectedBucket(String(created.id));
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to create bucket');
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updated = sharedFiles.filter((_, idx) => idx !== indexToRemove);
    setSharedFiles(updated);
    if (updated.length === 0) {
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    if (isUploading) return;
    await clearPendingSharedFiles();
    setSharedFiles([]);
    setIsOpen(false);
  };

  const handleStartUpload = async () => {
    const userToken = getAuthToken();
    if (!userToken) {
      setErrorMsg('Please log in to upload files');
      return;
    }
    if (!selectedBucket) {
      setErrorMsg('Please choose a destination bucket');
      return;
    }
    if (sharedFiles.length === 0) return;

    if (rememberDefault) {
      setDefaultBackupBucket(selectedBucket);
      setAutoUploadOnShare(true);
      toast.success('Saved as default backup bucket with auto-upload enabled!');
    }

    await triggerDirectUpload(sharedFiles, selectedBucket, userToken);
  };

  if (!isOpen || sharedFiles.length === 0) {
    return null;
  }

  const selectedBucketObj = buckets.find((b) => String(b.id) === String(selectedBucket));

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-lg text-white flex items-center gap-2">
                Upload Shared Media
                <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 font-medium">
                  {sharedFiles.length} file{sharedFiles.length > 1 ? 's' : ''}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Received from Android Gallery share sheet
              </p>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              title="Close">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* File Preview List */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wider">
            Files to Upload ({sharedFiles.length})
          </label>
          <div className="max-h-44 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {sharedFiles.map((file, idx) => {
              const previewUrl = previewUrls[idx];
              const isVideo = file.type.startsWith('video/');

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-600/40">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isVideo ? (
                        <Video className="w-5 h-5 text-purple-400" />
                      ) : file.type.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatFileSize(file.size)} &bull; {file.type || 'file'}
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors ml-2"
                      title="Remove file">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Destination Bucket Selection */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Choose Destination Bucket <span className="text-red-400">*</span>
            </label>
            {!isUploading && !isCreatingBucket && (
              <button
                type="button"
                onClick={() => setIsCreatingBucket(true)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Bucket
              </button>
            )}
          </div>

          {/* New Bucket inline form */}
          {isCreatingBucket ? (
            <form onSubmit={handleCreateBucket} className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2">
              <p className="text-xs font-medium text-purple-300">Create new bucket for this upload:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Gallery Backup"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                  autoFocus
                />
                <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs px-3">
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingBucket(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs px-2.5">
                  Cancel
                </Button>
              </div>
            </form>
          ) : buckets.length === 0 && !loadingBuckets ? (
            <div className="p-3 bg-slate-800/80 border border-purple-500/30 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300">You don't have any buckets yet.</span>
              <Button
                size="sm"
                type="button"
                onClick={() => setIsCreatingBucket(true)}
                className="bg-purple-600 hover:bg-purple-700 text-xs px-3 py-1 h-auto">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create One
              </Button>
            </div>
          ) : (
            <Select
              disabled={isUploading || loadingBuckets}
              value={selectedBucket}
              onValueChange={setSelectedBucket}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white focus:ring-purple-500">
                <SelectValue placeholder={loadingBuckets ? 'Loading buckets...' : 'Select a bucket'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {buckets.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-purple-400" />
                      <span>{b.bucketName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Option: Remember as default / Google Photos auto-upload */}
          {!isUploading && selectedBucket && (
            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberDefault}
                onChange={(e) => setRememberDefault(e.target.checked)}
                className="rounded border-slate-600 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Always auto-upload to this bucket in future (like Google Photos)
              </span>
            </label>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-800/40 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Live Upload Progress */}
        {isUploading && (
          <div className="mb-6 p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-purple-300 truncate max-w-[70%]">
                Uploading {currentFileIndex} of {sharedFiles.length}: {currentFileName}
              </span>
              <span className="text-purple-400 font-bold">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 bg-slate-800" />
            <p className="text-[11px] text-slate-400 text-center animate-pulse">
              Sending chunks securely to Telegram storage...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isUploading && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300">
              Discard
            </Button>
          )}
          <Button
            type="button"
            disabled={isUploading || !selectedBucket}
            onClick={handleStartUpload}
            className={`flex-1 font-semibold ${
              isUploading
                ? 'bg-purple-800 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25'
            }`}>
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="loader h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Upload to {selectedBucketObj ? `"${selectedBucketObj.bucketName}"` : 'Bucket'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
