import { useEffect, useState, useRef, useMemo } from 'react';
import {
  HardDrive,
  Upload,
  Download,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  RefreshCw,
  Folder,
  Eye,
  Info,
  CheckSquare,
  Square,
  Lock,
  Globe,
  MoreVertical,
  ChevronRight,
  FolderUp,
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
import { useParams, Link } from 'react-router-dom';
import { fetchDataFromAPI } from '@/lib/api';
import moment from 'moment';
import toast from 'react-hot-toast';
import NotFound from './NotFound';
import { bulkDownloadFiles, BulkProgress, parseFilenameFromHeaders } from '@/lib/bulkDownload';
import { uploadFileChunked } from '@/lib/chunkedUpload';
import { BoxBoxPreviewModal } from '@/components/dashboard/BoxBoxPreviewModal';
import { FilePropertiesModal } from '@/components/dashboard/FilePropertiesModal';
import { UploadProgressDock, UploadItem } from '@/components/dashboard/UploadProgressDock';
import { formatBytes, getFileCategoryInfo, getPreviewType } from '@/lib/fileTypes';

type SortKey = 'name' | 'size' | 'date' | 'type';
type SortOrder = 'asc' | 'desc';

export default function BucketShare() {
  const params = useParams();

  const [files, setFiles] = useState<any[]>([]);
  const [bucketDetails, setBucketDetails] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [totalStorageMB, setTotalStorageMB] = useState(0);
  const [is404, setIs404] = useState(false);

  // View and filter states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals
  const [activePreviewFile, setActivePreviewFile] = useState<any | null>(null);
  const [propertiesFile, setPropertiesFile] = useState<any | null>(null);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadCurrentFileName, setUploadCurrentFileName] = useState('');
  const [uploadCurrentIndex, setUploadCurrentIndex] = useState(0);
  const [uploadTotalCount, setUploadTotalCount] = useState(0);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);

  // Bulk ZIP Download states
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

  const loadSharedBucket = (page = currentPage, pass = password) => {
    if (!params?.id) return;
    setLoading(true);

    const headers: any = {};
    if (pass) headers['x-bucket-password'] = pass;

    fetchDataFromAPI<any>(`show/${params.id}?page=${page}&limit=50`, 'get', '', '', undefined)
      .then((res) => {
        setIsPasswordRequired(false);
        const data = res?.data || {};
        const fileList = Array.isArray(res?.files) ? res.files : (Array.isArray(data?.files) ? data.files : []);
        setBucketDetails(data.bucket || null);
        setFiles(fileList);
        setTotalFilesCount(res?.totalFiles ?? fileList.length);
        setTotalStorageMB(res?.totalStorage ?? 0);
        const pagination = res?.pagination || {};
        setTotalPages(pagination.totalPages || Math.max(1, Math.ceil((res?.totalFiles || fileList.length) / 50)));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading shared bucket:', error);
        setLoading(false);
        if (error?.status === 401 || error?.response?.status === 401) {
          setIsPasswordRequired(true);
        } else if (error?.status === 404 || error?.response?.status === 404) {
          setIs404(true);
        }
      });
  };

  useEffect(() => {
    loadSharedBucket(1);
  }, [params?.id]);

  useEffect(() => {
    loadSharedBucket(currentPage);
  }, [currentPage]);

  // Sorted files
  const processedFiles = useMemo(() => {
    let result = [...files];

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

  // Selection
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

  // Upload
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0 || !params?.id) return;
    const uploadArray = Array.from(fileList);

    const initialQueue: UploadItem[] = uploadArray.map((f, idx) => ({
      id: `${f.name}-${f.size}-${idx}-${Date.now()}`,
      name: f.name,
      size: f.size,
      status: 'pending',
      progress: 0,
    }));
    setUploadQueue(initialQueue);

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

        setUploadQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'uploading', progress: 0 } : item
          )
        );

        await uploadFileChunked({
          file: currentFile,
          code: params.id,
          password: password.trim() || undefined,
          signal: controller.signal,
          onProgress: (p) => {
            setUploadProgress(p.percent);
            setUploadStatusText(p.message);
            setUploadQueue((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, progress: p.percent } : item
              )
            );
          },
        });

        setUploadQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed', progress: 100 } : item
          )
        );

        successCount++;
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'File uploaded to shared bucket successfully!'
            : `${successCount} files uploaded successfully!`
        );
        loadSharedBucket(1);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        console.error('Upload error:', err);
        toast.error(err?.message || 'Failed to complete upload');
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.status === 'uploading'
              ? { ...item, status: 'failed', error: err?.message }
              : item
          )
        );
      }
    } finally {
      setIsUploading(false);
      setUploadAbortController(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Bulk ZIP Download
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
        zipFilename: `${bucketDetails?.bucketName || 'shared'}-archive.zip`,
        signal: controller.signal,
        onProgress: (p) => setBulkProgress(p),
        fetchFileBlob: async (item) => {
          const res: any = await fetchDataFromAPI(
            `files/download/${params?.id}/${item.msg_id}`,
            'all',
            {},
            '',
            undefined,
            'blob'
          );

          const filename = parseFilenameFromHeaders(res.headers, item.file_name || `file_${item.msg_id}`);
          return { blob: res.data instanceof Blob ? res.data : new Blob([res.data]), filename };
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

  if (is404) {
    return <NotFound />;
  }

  // Password Prompt Screen
  if (isPasswordRequired) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Protected Bucket</h3>
              <p className="text-xs text-slate-400">Password required to view files</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadSharedBucket(1, password);
            }}
            className="space-y-4">
            <Input
              type="password"
              placeholder="Enter bucket password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs h-9 bg-slate-800 border-slate-700 text-white"
              autoFocus
            />
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-9">
              {loading ? 'Checking...' : 'Unlock Bucket'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Public Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {bucketDetails?.bucketName || 'Shared Storage'}
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Public Share
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure Cloud Storage • {totalFilesCount} files ({totalStorageMB} MB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Sign In
            </Link>
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

          {/* Right Actions */}
          <div className="flex items-center gap-2">
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
                  Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSharedBucket(currentPage)}
              disabled={loading}
              className="h-9 w-9 p-0 rounded-xl"
              title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Hidden native inputs for upload */}
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

            {/* Upload Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 gap-1.5 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4 text-blue-500" /> Upload Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => folderInputRef.current?.click()} className="gap-2">
                  <FolderUp className="w-4 h-4 text-amber-500" /> Upload Entire Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selection Bar */}
        {selectedFileIds.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300">
                <CheckSquare className="w-4 h-4" />
                <span>{selectedFileIds.length} file(s) selected</span>
              </button>
              <button onClick={() => setSelectedFileIds([])} className="text-slate-500 hover:underline">
                Deselect
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="h-8 gap-1.5 text-xs border-blue-300 text-blue-700">
              <Download className="w-3.5 h-3.5" />
              <span>{bulkDownloading ? 'Creating ZIP...' : 'Download as ZIP'}</span>
            </Button>
          </div>
        )}

        {/* Bulk Download Progress */}
        {bulkDownloading && (
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-blue-400" />
              <span>
                Zipping ({bulkProgress.current} of {bulkProgress.total}): {bulkProgress.currentFileName}
              </span>
            </div>
            <span className="font-mono font-bold text-blue-400">{Math.round(bulkProgress.percent)}%</span>
          </div>
        )}

        {/* BOXBOX GRID VIEW */}
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
                  {/* Selection Checkbox */}
                  <div
                    onClick={(e) => toggleSelectFile(String(file.msg_id), e)}
                    className={`absolute top-2 left-2 z-10 p-1 rounded-lg backdrop-blur-md transition-opacity ${
                      isSelected
                        ? 'opacity-100 text-blue-600 bg-white/90 dark:bg-slate-900/90'
                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 bg-black/40 text-white'
                    }`}>
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>

                  {/* Thumbnail / Icon */}
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

                    <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold backdrop-blur-md ${category.badge}`}>
                      {category.label}
                    </span>
                  </div>

                  {/* Card Details */}
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

        {/* BOXBOX LIST VIEW */}
        {viewMode === 'list' && processedFiles.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
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
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
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
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setPropertiesFile(file)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BoxBox File Preview Modal */}
      {activePreviewFile && (
        <BoxBoxPreviewModal
          file={activePreviewFile}
          allFiles={processedFiles}
          bucketId={bucketDetails?.id}
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
          bucketId={bucketDetails?.id}
          isOpen={Boolean(propertiesFile)}
          onClose={() => setPropertiesFile(null)}
        />
      )}

      {/* Floating Upload Progress Dock */}
      <UploadProgressDock
        isUploading={isUploading}
        progress={uploadProgress}
        statusText={uploadStatusText}
        currentFileName={uploadCurrentFileName}
        currentIndex={uploadCurrentIndex}
        totalFiles={uploadTotalCount}
        items={uploadQueue}
        onCancel={() => {
          uploadAbortController?.abort();
          setIsUploading(false);
          setUploadQueue([]);
        }}
      />
    </div>
  );
}
