import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Download,
  FolderArchive,
  HardDrive,
  FolderUp,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Loader2,
  FolderPlus,
  ArrowRight,
  ShieldCheck,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
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
import { restoreBackupToBucket, backupDriveToZip, RestoreProgress } from '@/lib/driveBackup';
import { formatBytes, getFileCategoryInfo } from '@/lib/fileTypes';
import { getUser } from '@/lib/constants';
import toast from 'react-hot-toast';

interface DriveBucket {
  id: string | number;
  bucketName: string;
}

interface DriveBackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBucketId?: string | number;
  initialMode?: 'restore' | 'backup';
  onSuccess?: () => void;
}

export const DriveBackupRestoreModal: React.FC<DriveBackupRestoreModalProps> = ({
  isOpen,
  onClose,
  defaultBucketId,
  initialMode = 'restore',
  onSuccess,
}) => {
  const user = JSON.parse(getUser() || 'null');
  const [activeTab, setActiveTab] = useState<'restore' | 'backup'>(initialMode);
  const [buckets, setBuckets] = useState<DriveBucket[]>([]);
  const [selectedBucketId, setSelectedBucketId] = useState<string>(
    defaultBucketId ? String(defaultBucketId) : ''
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Restore progress
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress>({
    stage: 'inspecting',
    currentFileName: '',
    currentIndex: 0,
    totalFiles: 0,
    percent: 0,
    message: '',
  });

  // Backup progress
  const [backupProgress, setBackupProgress] = useState({
    current: 0,
    total: 0,
    percent: 0,
    statusText: '',
  });

  // New bucket creation inline
  const [isCreatingNewBucket, setIsCreatingNewBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (defaultBucketId) {
      setSelectedBucketId(String(defaultBucketId));
    }
  }, [defaultBucketId]);

  // Load available drives/buckets
  const loadDrives = async () => {
    try {
      const res: any = await fetchDataFromAPI('user/dashboard', 'get', '', user);
      const list: DriveBucket[] = res?.data?.bucket || [];
      setBuckets(list);
      if (!selectedBucketId && list.length > 0) {
        setSelectedBucketId(String(list[0].id));
      }
    } catch (err) {
      console.warn('Could not load user drives:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrives();
      setSelectedFiles([]);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesSelected = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    setSelectedFiles((prev) => [...prev, ...arr]);
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateBucketInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    try {
      const res: any = await fetchDataFromAPI('bucket/create', 'post', { name: newBucketName.trim() }, user);
      toast.success(res?.message || 'New drive created!');
      setNewBucketName('');
      setIsCreatingNewBucket(false);
      await loadDrives();
      if (res?.data?.id || res?.bucket?.id) {
        setSelectedBucketId(String(res?.data?.id || res?.bucket?.id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create drive');
    }
  };

  // Start Restore / Upload
  const handleStartRestore = async () => {
    if (!selectedBucketId) {
      toast.error('Please select a destination drive');
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error('Please select files, a folder, or a backup ZIP archive');
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);

    try {
      const result = await restoreBackupToBucket({
        filesOrZip: selectedFiles,
        bucketId: selectedBucketId,
        token: user,
        signal: controller.signal,
        onProgress: (p) => setRestoreProgress(p),
      });

      toast.success(result.message);
      setSelectedFiles([]);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      if (!controller.signal.aborted) {
        console.error('Restore error:', err);
        toast.error(err?.message || 'Failed to restore backup');
      }
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  // Start Backup
  const handleStartBackup = async () => {
    if (!selectedBucketId) {
      toast.error('Please select a drive to backup');
      return;
    }

    const currentDrive = buckets.find((b) => String(b.id) === String(selectedBucketId));
    const driveName = currentDrive?.bucketName || `Drive_${selectedBucketId}`;

    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);

    try {
      await backupDriveToZip({
        bucketId: selectedBucketId,
        bucketName: driveName,
        token: user,
        signal: controller.signal,
        onProgress: (p) => setBackupProgress(p),
      });

      toast.success(`Drive "${driveName}" backup downloaded successfully!`);
    } catch (err: any) {
      if (!controller.signal.aborted) {
        console.error('Backup error:', err);
        toast.error(err?.message || 'Failed to generate drive backup');
      }
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsProcessing(false);
      toast('Operation cancelled');
    }
  };

  const totalSelectedBytes = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}>
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-800 dark:text-slate-100 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                Cloud Drive Manager
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct uploads, media backups, and one-click restore
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 my-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <button
            disabled={isProcessing}
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'restore'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}>
            <UploadCloud className="w-4 h-4" />
            <span>Upload & Restore to Drive</span>
          </button>
          <button
            disabled={isProcessing}
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}>
            <Download className="w-4 h-4" />
            <span>Backup Drive (Download ZIP)</span>
          </button>
        </div>

        {/* Destination Drive / Bucket Selector */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {activeTab === 'restore' ? 'Select Destination Drive:' : 'Select Drive to Backup:'}
            </label>
            {!isCreatingNewBucket && !isProcessing && activeTab === 'restore' && (
              <button
                type="button"
                onClick={() => setIsCreatingNewBucket(true)}
                className="text-blue-600 hover:underline flex items-center gap-1">
                <FolderPlus className="w-3.5 h-3.5" /> New Drive
              </button>
            )}
          </div>

          {isCreatingNewBucket ? (
            <form onSubmit={handleCreateBucketInline} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Drive Name (e.g. Media Backup)"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 text-white">
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingNewBucket(false)}
                className="h-8 text-xs">
                Cancel
              </Button>
            </form>
          ) : (
            <Select
              disabled={isProcessing}
              value={selectedBucketId}
              onValueChange={(val) => setSelectedBucketId(val)}>
              <SelectTrigger className="w-full text-xs h-9 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Choose a drive / bucket" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {buckets.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.bucketName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* TAB 1: UPLOAD & RESTORE */}
        {activeTab === 'restore' && (
          <div className="space-y-4">
            {/* Native hidden pickers */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
              }}
            />

            {!isProcessing ? (
              <>
                {/* Dropzone / Selection Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer?.files) handleFilesSelected(e.dataTransfer.files);
                  }}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center hover:border-blue-500 transition-colors">
                  <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <FolderArchive className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    Select files, media, or backup ZIP to restore
                  </p>
                  <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                    ZIP archives are automatically unpacked in the browser and streamed directly to your selected cloud drive.
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 rounded-xl">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Browse Files or ZIP
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => folderInputRef.current?.click()}
                      className="text-xs gap-1.5 rounded-xl">
                      <FolderUp className="w-3.5 h-3.5 text-amber-500" />
                      Browse Folder
                    </Button>
                  </div>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{selectedFiles.length} item(s) selected ({formatBytes(totalSelectedBytes)})</span>
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-rose-500 hover:underline">
                        Clear all
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {selectedFiles.slice(0, 10).map((file, idx) => {
                        const isZip = file.name.toLowerCase().endsWith('.zip');
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 truncate pr-2">
                              {isZip ? (
                                <FolderArchive className="w-4 h-4 text-purple-500 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              )}
                              <span className="truncate font-medium">{file.name}</span>
                              {isZip && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-500">
                                  Backup ZIP
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-400 font-mono text-[11px]">
                                {formatBytes(file.size)}
                              </span>
                              <button
                                onClick={() => removeSelectedFile(idx)}
                                className="text-slate-400 hover:text-rose-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {selectedFiles.length > 10 && (
                        <p className="text-[11px] text-center text-slate-400">
                          ... and {selectedFiles.length - 10} more files
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Live Progress View */
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {restoreProgress.message}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(restoreProgress.percent)}%
                  </span>
                </div>

                <Progress value={restoreProgress.percent} className="h-2" />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    File {restoreProgress.currentIndex} of {restoreProgress.totalFiles}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-7 text-xs text-rose-500 hover:text-rose-600">
                    Cancel Restore
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BACKUP DRIVE */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            {!isProcessing ? (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center space-y-4">
                <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 w-12 h-12 mx-auto flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    Export Complete Drive to ZIP
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Downloads all files and media stored in the selected drive into a single structured ZIP backup on your computer.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-left flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">
                    This backup ZIP can be restored at any time into any drive using the <strong>Upload & Restore</strong> tab.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {backupProgress.statusText}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round(backupProgress.percent)}%
                  </span>
                </div>

                <Progress value={backupProgress.percent} className="h-2 bg-slate-200 dark:bg-slate-700" />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Archiving files to ZIP...</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-7 text-xs text-rose-500 hover:text-rose-600">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={onClose}
            className="text-xs">
            Close
          </Button>

          {activeTab === 'restore' && !isProcessing && (
            <Button
              type="button"
              size="sm"
              disabled={selectedFiles.length === 0 || !selectedBucketId}
              onClick={handleStartRestore}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              Start Upload & Restore
            </Button>
          )}

          {activeTab === 'backup' && !isProcessing && (
            <Button
              type="button"
              size="sm"
              disabled={!selectedBucketId}
              onClick={handleStartBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-sm">
              <Download className="w-3.5 h-3.5" />
              Download Drive Backup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

