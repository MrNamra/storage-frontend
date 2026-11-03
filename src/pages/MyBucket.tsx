import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  FolderUp,
  Upload,
  Download,
  Share2,
  Trash2,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  MoreVertical,
  CheckSquare,
  Square,
  HardDrive,
  Info,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Eye,
  Copy,
  Check,
  AlertTriangle,
  Cloud,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchDataFromAPI } from '@/lib/api';
import { getUser } from '@/lib/constants';
import { useParams, Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { bulkDownloadFiles, BulkProgress } from '@/lib/bulkDownload';
import { uploadFileChunked } from '@/lib/chunkedUpload';
import { BoxBoxPreviewModal } from '@/components/dashboard/BoxBoxPreviewModal';
import { FilePropertiesModal } from '@/components/dashboard/FilePropertiesModal';
import { UploadProgressDock } from '@/components/dashboard/UploadProgressDock';
import { ShareModal } from '@/components/dashboard/ShareModal';
import { DriveBackupRestoreModal } from '@/components/dashboard/DriveBackupRestoreModal';
import { formatBytes, getFileCategoryInfo, getPreviewType } from '@/lib/fileTypes';
import NotFound from './NotFound';

type SortKey = 'name' | 'size' | 'date' | 'type';
type SortOrder = 'asc' | 'desc';

export default function MyBucket() {
  const params = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(getUser() || 'null');

  // Bucket and Files state
  const [bucketName, setBucketName] = useState<string>('');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [totalStorageMB, setTotalStorageMB] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notFound, setNotFound] = useState(false);

  // UI View and Filter states (BoxBox style)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals state
  const [activePreviewFile, setActivePreviewFile] = useState<any | null>(null);
  const [propertiesFile, setPropertiesFile] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveModalMode, setDriveModalMode] = useState<'restore' | 'backup'>('restore');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadCurrentFileName, setUploadCurrentFileName] = useState('');
  const [uploadCurrentIndex, setUploadCurrentIndex] = useState(0);
  const [uploadTotalCount, setUploadTotalCount] = useState(0);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);

  // Bulk ZIP Download state
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
    current: 0,
    total: 0,
    percent: 0,
    currentFileName: '',
    stage: 'downloading',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Load Bucket info & files
  const loadBucketFiles = (page = currentPage) => {
    if (!params?.id) return;
    setLoading(true);
    fetchDataFromAPI<any>(`bucket/display/${params.id}?page=${page}&limit=50`, 'get', '', user)
      .then((res) => {
        const fileList = Array.isArray(res?.data) ? res.data : res?.data?.files || [];
        const pagination = res?.pagination || res?.data?.pagination;
        const total = pagination?.totalFiles ?? fileList.length;
        const pages = pagination?.totalPages ?? Math.max(1, Math.ceil(total / 50));

        setFiles(fileList);
        setTotalFilesCount(total);
        setTotalStorageMB(res?.totalStorage ?? res?.data?.totalStorage ?? 0);
        setTotalPages(pages);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading bucket files:', error);
        if (error?.response?.status === 404 || error?.status === 404) {
          setNotFound(true);
        }
        setLoading(false);
      });
  };

  // Fetch bucket metadata (name, share code)
  const loadBucketMeta = () => {
    if (!params?.id) return;
    fetchDataFromAPI<any>('bucket/list', 'get', '', user)
      .then((res) => {
        const buckets = res?.buckets || res?.data || [];
        const current = buckets.find((b: any) => String(b.id) === String(params.id));
        if (current) {
          setBucketName(current.bucketName || `Bucket #${current.id}`);
          setShareCode(current.code || null);
        }
      })
      .catch((err) => console.warn('Could not load bucket meta:', err));
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedFileIds([]);
    loadBucketMeta();
    loadBucketFiles(1);
  }, [params?.id]);

  useEffect(() => {
    loadBucketFiles(currentPage);
  }, [currentPage]);

  // Sort files in memory
  const processedFiles = useMemo(() => {
    let result = [...files];

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name':
          comparison = (a.file_name || '').localeCompare(b.file_name || '');
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'date':
          comparison = (a.date || 0) - (b.date || 0);
          break;
        case 'type':
          comparison = getPreviewType(a.file_name).localeCompare(getPreviewType(b.file_name));
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, sortKey, sortOrder]);

  // Selection handlers
  const toggleSelectFile = (msgId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFileIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === processedFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(processedFiles.map((f) => String(f.msg_id)));
    }
  };

  // Upload handler for files or entire folders
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0 || !params?.id) return;
    const uploadArray = Array.from(fileList);

    const controller = new AbortController();
    setUploadAbortController(controller);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadTotalCount(uploadArray.length);

    let successCount = 0;
    try {
      for (let i = 0; i < uploadArray.length; i++) {
        if (controller.signal.aborted) break;

        const currentFile = uploadArray[i];
        setUploadCurrentFileName(currentFile.name);
        setUploadCurrentIndex(i + 1);

        await uploadFileChunked({
          file: currentFile,
          bucketId: params.id,
          token: user,
          signal: controller.signal,
          onProgress: (p) => {
            setUploadProgress(p.percent);
            setUploadStatusText(p.message);
          },
        });

        successCount++;
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'File uploaded to Cloud successfully!'
            : `${successCount} files uploaded to Cloud successfully!`
        );
        loadBucketFiles(1);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        console.error('Upload error:', err);
        toast.error(err?.message || 'Failed to complete upload');
      }
    } finally {
      setIsUploading(false);
      setUploadAbortController(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
      setUploadAbortController(null);
      setIsUploading(false);
      toast('Upload cancelled');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Delete Handler
  const handleDeleteSelected = async () => {
    const idsToDelete = fileToDelete
      ? [fileToDelete.msg_id]
      : selectedFileIds;

    if (!idsToDelete || idsToDelete.length === 0 || !params?.id) return;

    try {
      setLoading(true);
      await fetchDataFromAPI(
        `bucket/${params.id}/delete-file`,
        'post',
        { file_id: idsToDelete },
        user
      );
      toast.success(
        idsToDelete.length === 1
          ? 'File deleted from Cloud'
          : `${idsToDelete.length} files deleted from Cloud`
      );
      setSelectedFileIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      setIsDeleteConfirmOpen(false);
      setFileToDelete(null);
      loadBucketFiles(currentPage);
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete file(s)');
    } finally {
      setLoading(false);
    }
  };

  // Bulk ZIP Download Handler
  const handleBulkDownload = async () => {
    const filesToDownload = selectedFileIds.length > 0
      ? processedFiles.filter((f) => selectedFileIds.includes(String(f.msg_id)))
      : processedFiles;

    if (filesToDownload.length === 0) {
      toast.error('No files available to download');
      return;
    }

    setBulkDownloading(true);
    const controller = new AbortController();

    try {
      await bulkDownloadFiles({
        files: filesToDownload,
        zipFilename: `${bucketName || 'bucket'}-archive.zip`,
        signal: controller.signal,
        onProgress: (p) => setBulkProgress(p),
        fetchFileBlob: async (item, signal) => {
          const downloadEndpoint = item.stream_url
            ? `${item.stream_url}?dl=1`
            : `/api/bucket/file/download/${params?.id}/${item.msg_id}`;

          const res: any = await fetchDataFromAPI(
            downloadEndpoint.replace(/^\/api\//, ''),
            'get',
            '',
            user,
            undefined,
            'blob'
          );

          return {
            blob: res.data instanceof Blob ? res.data : new Blob([res.data]),
            filename: item.file_name || `file_${item.msg_id}`,
          };
        },
      });

      toast.success('ZIP archive generated and downloaded!');
    } catch (err: any) {
      console.error('Bulk download error:', err);
      toast.error('Failed to download files archive');
    } finally {
      setBulkDownloading(false);
    }
  };

  const copyDirectLink = (file: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = file.stream_url ? `${window.location.origin}${file.stream_url}` : '';
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success('Stream link copied to clipboard!');
    }
  };

  if (notFound) {
    return <NotFound />;
  }

  return (
    <DashboardLayout>
      <div
        className="relative space-y-6 min-h-[85vh] select-none"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        
        {/* BoxBox Drag & Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-40 bg-blue-600/10 dark:bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
            <div className="p-4 rounded-full bg-blue-600 text-white shadow-xl mb-3">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <p className="text-base font-semibold text-blue-900 dark:text-blue-200">
              Drop files or folders here
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Resumable chunked upload directly to cloud vault
            </p>
          </div>
        )}

        {/* BoxBox Path Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              <HardDrive className="w-4 h-4" />
              <span>Drives</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              {bucketName || `Bucket #${params?.id}`}
            </span>
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              Cloud Vault
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{totalFilesCount} files</span>
            <span>•</span>
            <span>{totalStorageMB} MB used</span>
            {shareCode && (
              <>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Share2 className="w-3 h-3" /> Shared
                </span>
              </>
            )}
          </div>
        </div>

        {/* BoxBox Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Left: Files label */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Files ({processedFiles.length})
            </span>
          </div>

          {/* Right: Actions, Sort, View mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline capitalize">Sort: {sortKey}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => setSortKey('name')}>Name</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey('size')}>Size</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey('date')}>Date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey('type')}>Type</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                  Order: {sortOrder === 'asc' ? 'Ascending (A-Z)' : 'Descending (Z-A)'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View">
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadBucketFiles(currentPage)}
              disabled={loading}
              className="h-9 w-9 p-0 rounded-xl"
              title="Refresh Files">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Backup Drive Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDriveModalMode('backup');
                setIsDriveModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs rounded-xl border-slate-200 dark:border-slate-700">
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Backup Drive</span>
            </Button>

            {/* Restore / Bulk Upload Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDriveModalMode('restore');
                setIsDriveModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs rounded-xl border-slate-200 dark:border-slate-700">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Restore Backup</span>
            </Button>

            {/* Share Bucket Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="h-9 gap-1.5 text-xs rounded-xl">
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Hidden native inputs for file and folder picker */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesUpload(e.target.files);
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
                if (e.target.files) handleFilesUpload(e.target.files);
              }}
            />

            {/* Upload Buttons */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 gap-1.5 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4 text-blue-500" />
                  Upload Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => folderInputRef.current?.click()} className="gap-2">
                  <FolderUp className="w-4 h-4 text-amber-500" />
                  Upload Entire Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selection Bar (Visible when files are selected) */}
        {selectedFileIds.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300 hover:underline">
                <CheckSquare className="w-4 h-4" />
                <span>{selectedFileIds.length} file(s) selected</span>
              </button>
              <button
                onClick={() => setSelectedFileIds([])}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                Deselect
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDownload}
                disabled={bulkDownloading}
                className="h-8 gap-1.5 text-xs border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                <Download className="w-3.5 h-3.5" />
                <span>{bulkDownloading ? 'Creating ZIP...' : 'Download as ZIP'}</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setFileToDelete(null);
                  setIsDeleteConfirmOpen(true);
                }}
                className="h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Download Progress Banner */}
        {bulkDownloading && (
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-blue-400" />
              <span>
                Archiving files ({bulkProgress.current} of {bulkProgress.total}): {bulkProgress.currentFileName}
              </span>
            </div>
            <span className="font-mono font-bold text-blue-400">{Math.round(bulkProgress.percent)}%</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && processedFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Folder className="w-10 h-10" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              This bucket is empty
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              Upload files or entire folders to store them permanently in your cloud vault.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Upload Files
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
                className="text-xs gap-1.5">
                <FolderUp className="w-3.5 h-3.5 text-amber-500" /> Upload Folder
              </Button>
            </div>
          </div>
        )}

        {/* BOXBOX FILE GRID VIEW */}
        {viewMode === 'grid' && processedFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {processedFiles.map((file) => {
              const isSelected = selectedFileIds.includes(String(file.msg_id));
              const category = getFileCategoryInfo(file.file_name, file.mime_type);
              const previewType = getPreviewType(file.file_name, file.mime_type);
              const hasThumbnail = (previewType === 'image' || previewType === 'video') && file.thumbnail;

              return (
                <div
                  key={file.msg_id || file.file_name}
                  onClick={() => setActivePreviewFile(file)}
                  className={`group relative flex flex-col rounded-2xl border transition-all duration-150 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                  }`}>
                  {/* Select Checkbox (Hover or Selected) */}
                  <div
                    onClick={(e) => toggleSelectFile(String(file.msg_id), e)}
                    className={`absolute top-2 left-2 z-10 p-1 rounded-lg backdrop-blur-md transition-opacity ${
                      isSelected
                        ? 'opacity-100 text-blue-600 bg-white/90 dark:bg-slate-900/90'
                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 bg-black/40 text-white'
                    }`}>
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>

                  {/* Kebab Context Menu */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1 rounded-lg bg-black/50 text-white hover:bg-black/70 backdrop-blur-md">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => setActivePreviewFile(file)} className="gap-2">
                          <Eye className="w-3.5 h-3.5 text-blue-500" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={file.stream_url ? `${file.stream_url}?dl=1` : '#'} download={file.file_name} className="gap-2 flex items-center">
                            <Download className="w-3.5 h-3.5 text-emerald-500" /> Download
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => copyDirectLink(file, e)} className="gap-2">
                          <Copy className="w-3.5 h-3.5 text-purple-500" /> Copy Stream Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPropertiesFile(file)} className="gap-2">
                          <Info className="w-3.5 h-3.5 text-slate-500" /> Properties
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setFileToDelete(file);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="gap-2 text-rose-600 dark:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Thumbnail / Icon Container */}
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden">
                    {hasThumbnail ? (
                      <img
                        src={file.thumbnail}
                        alt={file.file_name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`p-4 rounded-2xl border ${category.color}`}>
                        <category.icon className="w-10 h-10" />
                      </div>
                    )}

                    {/* Bottom type badge on thumbnail */}
                    <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold backdrop-blur-md shadow-xs ${category.badge}`}>
                      {category.label}
                    </span>
                  </div>

                  {/* Card Details Footer */}
                  <div className="p-2.5 flex flex-col justify-between flex-1 gap-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate" title={file.file_name}>
                      {file.file_name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatBytes(file.size)}</span>
                      {file.date && <span>{moment.unix(file.date).format('MM/DD/YY')}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOXBOX FILE LIST VIEW */}
        {viewMode === 'list' && processedFiles.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600">
                        {selectedFileIds.length > 0 && selectedFileIds.length === processedFiles.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold w-24">Type</th>
                    <th className="p-3 font-semibold w-24">Size</th>
                    <th className="p-3 font-semibold w-32">Uploaded</th>
                    <th className="p-3 font-semibold w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {processedFiles.map((file) => {
                    const isSelected = selectedFileIds.includes(String(file.msg_id));
                    const category = getFileCategoryInfo(file.file_name, file.mime_type);

                    return (
                      <tr
                        key={file.msg_id || file.file_name}
                        onClick={() => setActivePreviewFile(file)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}>
                        <td className="p-3" onClick={(e) => toggleSelectFile(String(file.msg_id), e)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2.5 max-w-md">
                            <category.icon className="w-4 h-4 shrink-0 text-slate-500" />
                            <span className="truncate" title={file.file_name}>{file.file_name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${category.color}`}>
                            {category.label}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{formatBytes(file.size)}</td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {file.date ? moment.unix(file.date).format('MMM D, YYYY') : '—'}
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={file.stream_url ? `${file.stream_url}?dl=1` : '#'}
                              download={file.file_name}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                              title="Download">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => setPropertiesFile(file)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                              title="Details">
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setFileToDelete(file);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs">
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* BoxBox File Preview Modal */}
      {activePreviewFile && (
        <BoxBoxPreviewModal
          file={activePreviewFile}
          allFiles={processedFiles}
          bucketId={params?.id}
          isOpen={Boolean(activePreviewFile)}
          onClose={() => setActivePreviewFile(null)}
          onNavigate={(nextFile) => setActivePreviewFile(nextFile)}
          onOpenProperties={(f) => setPropertiesFile(f)}
        />
      )}

      {/* File Properties Modal */}
      {propertiesFile && (
        <FilePropertiesModal
          file={propertiesFile}
          bucketId={params?.id}
          isOpen={Boolean(propertiesFile)}
          onClose={() => setPropertiesFile(null)}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        bucketId={params?.id || ''}
        bucketName={bucketName}
        shareCode={shareCode}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShareUpdated={() => {
          loadBucketMeta();
          setIsShareModalOpen(false);
        }}
        token={user}
      />

      {/* Drive Backup & Restore Modal */}
      <DriveBackupRestoreModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        defaultBucketId={params?.id}
        initialMode={driveModalMode}
        onSuccess={() => loadBucketFiles(currentPage)}
      />

      {/* Floating Upload Progress Dock */}
      <UploadProgressDock
        isUploading={isUploading}
        progress={uploadProgress}
        statusText={uploadStatusText}
        currentFileName={uploadCurrentFileName}
        currentIndex={uploadCurrentIndex}
        totalFiles={uploadTotalCount}
        onCancel={handleCancelUpload}
      />

      {/* Confirm Delete Dialog */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteConfirmOpen(false);
          }}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Confirm Delete</h3>
                <p className="text-xs text-slate-500">
                  {fileToDelete
                    ? `Delete "${fileToDelete.file_name}" from your cloud vault?`
                    : `Delete ${selectedFileIds.length} selected files from your cloud vault?`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              This action permanently deletes the files from your cloud vault. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="text-xs">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
