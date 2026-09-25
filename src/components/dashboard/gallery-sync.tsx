import { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CheckCircle2,
  FolderSync,
  Upload,
  Sparkles,
  Settings2,
  Folder,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Check,
  ShieldCheck,
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
import toast from 'react-hot-toast';

interface BucketItem {
  id: string | number;
  bucketName: string;
}

const SYNCED_STORAGE_KEY = 'cloudvault_synced_signatures';

function getSyncedSignatures(): Set<string> {
  try {
    const raw = localStorage.getItem(SYNCED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSyncedSignature(sig: string) {
  try {
    const set = getSyncedSignatures();
    set.add(sig);
    localStorage.setItem(SYNCED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Could not save sync signature:', e);
  }
}

export function GallerySync() {
  const token = getAuthToken();

  const [buckets, setBuckets] = useState<BucketItem[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [autoShare, setAutoShare] = useState<boolean>(false);
  const [syncedCount, setSyncedCount] = useState<number>(0);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncFile, setCurrentSyncFile] = useState('');
  const [syncFileIndex, setSyncFileIndex] = useState(0);
  const [totalToSync, setTotalToSync] = useState(0);

  const [isCreatingBucket, setIsCreatingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('Camera Backup');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAutoShare(isAutoUploadOnShareEnabled());
    setSyncedCount(getSyncedSignatures().size);
    if (token) {
      loadBuckets();
    }
  }, [token]);

  const loadBuckets = async () => {
    setLoadingBuckets(true);
    try {
      const res = await fetchDataFromAPI<{ data?: { bucket?: BucketItem[] } }>('user/dashboard', 'get', '', token || '');
      const list = res?.data?.bucket || [];
      setBuckets(list);

      // Check saved default or auto-assign
      const savedDefault = getDefaultBackupBucket();
      if (savedDefault && list.some((b) => String(b.id) === String(savedDefault))) {
        setSelectedBucket(savedDefault);
      } else if (list.length > 0) {
        // Look for existing 'Camera Backup' or 'Gallery' or use first
        const found = list.find((b) => /camera|gallery|photo|backup/i.test(b.bucketName)) || list[0];
        setSelectedBucket(String(found.id));
        setDefaultBackupBucket(String(found.id));
      }
    } catch (err) {
      console.error('Failed to load buckets for auto-sync:', err);
    } finally {
      setLoadingBuckets(false);
    }
  };

  const handleBucketChange = (bucketId: string) => {
    setSelectedBucket(bucketId);
    setDefaultBackupBucket(bucketId);
    const chosen = buckets.find((b) => String(b.id) === String(bucketId));
    toast.success(`Default backup bucket set to "${chosen?.bucketName || 'Bucket'}"`);
  };

  const handleToggleAutoShare = (enabled: boolean) => {
    setAutoShare(enabled);
    setAutoUploadOnShare(enabled);
    if (enabled) {
      toast.success('⚡ Auto-upload enabled: Gallery shares will upload immediately without prompting!');
    } else {
      toast('Prompt mode enabled: You will be asked which bucket to upload to on share.', { icon: 'ℹ️' });
    }
  };

  const handleCreateNewBackupBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;

    try {
      const res = await fetchDataFromAPI<{ message?: string }>('bucket/create', 'post', { name: newBucketName.trim() }, token || '');
      toast.success(res?.message || 'Backup bucket created');
      const name = newBucketName.trim();
      setNewBucketName('');
      setIsCreatingBucket(false);

      // Reload buckets
      const updatedRes = await fetchDataFromAPI<{ data?: { bucket?: BucketItem[] } }>('user/dashboard', 'get', '', token || '');
      const list = updatedRes?.data?.bucket || [];
      setBuckets(list);

      const created = list.find((b) => b.bucketName.toLowerCase() === name.toLowerCase());
      if (created) {
        setSelectedBucket(String(created.id));
        setDefaultBackupBucket(String(created.id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create bucket');
    }
  };

  // Trigger media picker for gallery sync
  const triggerPicker = () => {
    if (!selectedBucket) {
      toast.error('Please select or create a destination bucket first');
      return;
    }
    fileInputRef.current?.click();
  };

  // Handle selected photos/videos from user's gallery
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const filesArray = Array.from(rawFiles);
    const signatures = getSyncedSignatures();

    // Filter out photos/videos already backed up
    const newFilesToUpload = filesArray.filter((f) => {
      const sig = `${f.name}_${f.size}_${f.lastModified}`;
      return !signatures.has(sig);
    });

    // Reset input so user can pick again if needed
    e.target.value = '';

    if (newFilesToUpload.length === 0) {
      toast.success('✓ All selected items are already backed up to CloudVault!', {
        icon: '✨',
      });
      return;
    }

    // Start auto sync upload
    setIsSyncing(true);
    setTotalToSync(newFilesToUpload.length);
    setSyncProgress(0);

    const targetBucketObj = buckets.find((b) => String(b.id) === String(selectedBucket));
    const targetName = targetBucketObj ? targetBucketObj.bucketName : 'Backup';

    const toastId = toast.loading(`Syncing ${newFilesToUpload.length} new photos/videos to "${targetName}"...`);
    let uploadedCount = 0;

    try {
      for (let i = 0; i < newFilesToUpload.length; i++) {
        const file = newFilesToUpload[i];
        setSyncFileIndex(i + 1);
        setCurrentSyncFile(file.name);

        await uploadFileChunked({
          file,
          bucketId: selectedBucket,
          token: token || '',
          onProgress: (p) => {
            setSyncProgress(p.percent);
            toast.loading(`[${i + 1}/${newFilesToUpload.length}] ${file.name} (${p.percent}%)`, {
              id: toastId,
            });
          },
        });

        // Record signature as synced
        const sig = `${file.name}_${file.size}_${file.lastModified}`;
        saveSyncedSignature(sig);
        uploadedCount++;
      }

      setSyncedCount(getSyncedSignatures().size);
      toast.success(`🎉 Successfully synced ${uploadedCount} new item(s) to "${targetName}"!`, {
        id: toastId,
      });

      // Dispatch event to refresh bucket metrics
      window.dispatchEvent(new CustomEvent('cloudvault:refresh_buckets'));
    } catch (err: any) {
      console.error('Gallery sync error:', err);
      toast.error(err?.message || 'Sync failed on some items', { id: toastId });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const selectedBucketObj = buckets.find((b) => String(b.id) === String(selectedBucket));

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-poppins font-bold text-lg text-white">
                Google Photos Auto-Sync
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instant gallery backup, automated photo syncing, and one-tap cloud storage.
            </p>
          </div>
        </div>

        {/* Synced Count Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-800/80 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">
            <strong className="text-white font-semibold">{syncedCount}</strong> items backed up
          </span>
        </div>
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-purple-500/20">
        {/* Backup Destination Bucket */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-purple-400" />
              Default Backup Bucket
            </label>
            {!isCreatingBucket && (
              <button
                type="button"
                onClick={() => setIsCreatingBucket(true)}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> New Bucket
              </button>
            )}
          </div>

          {isCreatingBucket ? (
            <form onSubmit={handleCreateNewBackupBucket} className="flex gap-2">
              <input
                type="text"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="Bucket Name"
                className="flex-1 bg-slate-950 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
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
                className="border-slate-700 text-xs px-2.5">
                Cancel
              </Button>
            </form>
          ) : (
            <Select
              disabled={loadingBuckets || isSyncing}
              value={selectedBucket}
              onValueChange={handleBucketChange}>
              <SelectTrigger className="w-full bg-slate-950/80 border-purple-500/30 text-white text-xs h-9">
                <SelectValue placeholder={loadingBuckets ? 'Loading buckets...' : 'Select backup destination'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-purple-500/30 text-white text-xs">
                {buckets.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-purple-400" />
                      <span>{b.bucketName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ⚡ Instant Auto-Upload on Share Toggle */}
        <div className="flex items-center justify-between p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Instant Auto-Upload on Share
            </span>
            <p className="text-[11px] text-slate-400">
              When sharing from Android Gallery, upload straight to backup without asking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleAutoShare(!autoShare)}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 p-0.5 ${
              autoShare ? 'bg-purple-600' : 'bg-slate-800 border border-slate-700'
            }`}>
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                autoShare ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Live Sync Progress Indicator (when syncing) */}
      {isSyncing && (
        <div className="my-4 p-4 bg-purple-950/40 border border-purple-500/40 rounded-xl space-y-2">
          <div className="flex justify-between text-xs font-semibold text-purple-300">
            <span>
              Syncing {syncFileIndex} of {totalToSync}: {currentSyncFile}
            </span>
            <span className="text-purple-400">{syncProgress}%</span>
          </div>
          <Progress value={syncProgress} className="h-2 bg-slate-950" />
          <p className="text-[11px] text-slate-400 text-center animate-pulse">
            Securely streaming chunks to Telegram Cloud...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Automatically checks and skips duplicates. Unlimited cloud storage.
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,application/*"
          className="hidden"
          onChange={handleFilesSelected}
        />

        <Button
          type="button"
          disabled={isSyncing || !selectedBucket}
          onClick={triggerPicker}
          className="w-full sm:w-auto font-semibold text-xs px-5 py-2.5 h-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
          {isSyncing ? (
            <>
              <span className="loader h-3.5 w-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              📸 Sync New Photos & Videos
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
