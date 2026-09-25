import {Plus, Download, Upload, File} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {StorageMetrics} from '@/components/dashboard/storage-metrics';
import {BucketList} from '@/components/dashboard/bucket-list';
import {FileUploader} from '@/components/dashboard/file-uploader';
import toast, { Toaster } from "react-hot-toast";
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {useEffect, useState} from 'react';
import {fetchDataFromAPI} from '@/lib/api';
import {getUser} from '@/lib/constants';
import {useParams} from 'react-router-dom';
import moment from 'moment';
import {MoreVertical, Trash2} from 'lucide-react';
import {motion} from 'framer-motion';
import {bulkDownloadFiles, BulkProgress, parseFilenameFromHeaders} from '@/lib/bulkDownload';
import {uploadFileChunked} from '@/lib/chunkedUpload';
import {Progress} from '@/components/ui/progress';
import NotFound from './NotFound';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MyBucket() {
  const params = useParams();
  const user = JSON.parse(getUser());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteEnable, setIsDeleteEnable] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [error, setError] = useState('');
  const [bucket, setBucket] = useState([]);
  const [loading, setLoading] = useState(false); // State for loading
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const [password, setPassword] = useState('');

  const [fileId, setFileID] = useState();
  const [showPreView, setShowPreView] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [checkedFiles, setCheckedFiles] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
    current: 0,
    total: 0,
    percent: 0,
    currentFileName: '',
    stage: 'downloading',
  });
  const [bulkAbortController, setBulkAbortController] = useState<AbortController | null>(null);

  const [totlaFile, setTotalFile] = useState(0);
  const [totlaStorage, setStorage] = useState(0);
  const [showUploader, setShowUploader] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadCurrentFile, setUploadCurrentFile] = useState('');
  const [uploadCurrentFileIndex, setUploadCurrentFileIndex] = useState(0);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    if (showPreView) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreView]);

  useEffect(() => {
    setCurrentPage(1);
    setNotFound(false);
  }, [params?.id]);

  useEffect(() => {
    if (params?.id) {
      mybucket(currentPage);
    }
  }, [params?.id, currentPage]);

  useEffect(() => {
    setCheckedFiles([]);
  }, [bucket]);

  const mybucket = (page = currentPage) => {
    setLoading(true);
    fetchDataFromAPI(
      `bucket/display/${params?.id}?page=${page ?? 1}&limit=15`,
      'get',
      '',
      user,
    )
      .then((res) => {
        const files = Array.isArray(res?.data) ? res.data : (res?.data?.files || []);
        const pagination = res?.pagination || res?.data?.pagination;
        const total = pagination?.totalFiles ?? files.length;
        const pages = pagination?.totalPages ?? Math.max(1, Math.ceil(total / 15));

        setBucket(files);
        setTotalFile(total);
        setStorage(res?.totalStorage ?? res?.data?.totalStorage ?? 0);
        setTotalPages(pages);
        if (currentPage > pages && pages >= 1) {
          setCurrentPage(pages);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.log('error', error);
        const status = error?.response?.status || error?.status;
        if (status === 404 || error?.message?.includes('404')) {
          setNotFound(true);
        }
        setLoading(false);
      });
  };

  const handleOpenModal = () => {
    setShowPreView(true);
  };

  const handleCloseModal = () => {
    setShowPreView(false);
  };

  const handleOpenModalUpload = () => {
    setShowUploader(true);
  };

  const handleCloseModalUpload = () => {
    setShowUploader(false);
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
      setUploadAbortController(null);
      setIsUploading(false);
      setUploadStatusText('Upload cancelled');
      toast('Upload cancelled');
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedFiles?.length) return;

    const controller = new AbortController();
    setUploadAbortController(controller);
    setIsUploading(true);
    setUploadProgress(0);

    const totalToUpload = selectedFiles.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalToUpload; i++) {
        if (controller.signal.aborted) break;

        const file = selectedFiles[i];
        setUploadCurrentFile(file.name);
        setUploadCurrentFileIndex(i + 1);

        await uploadFileChunked({
          file,
          bucketId: params?.id,
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
            ? 'File uploaded successfully!'
            : `${successCount} files uploaded successfully!`
        );
        setSelectedFiles([]);
        mybucket(1);
      }
    } catch (error: any) {
      if (!controller.signal.aborted) {
        console.error('Upload error:', error);
        toast.error(error?.message || 'Upload failed');
      }
    } finally {
      setIsUploading(false);
      setUploadAbortController(null);
      setUploadCurrentFile('');
      setUploadProgress(0);
      setUploadStatusText('');
    }
  };

  const handleDeleteBtn = () => {

  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (totalPages || 1)) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (!totalPages || totalPages <= 1) {
      return (
        <button
          key={1}
          className="px-3.5 py-1.5 border rounded-lg mx-0.5 text-sm bg-purple-600 text-white border-purple-600 shadow-sm font-semibold">
          1
        </button>
      );
    }
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`px-3.5 py-1.5 border rounded-lg mx-0.5 text-sm transition-colors ${
            currentPage === 1
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-semibold'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700'
          }`}>
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots-start" className="px-1 text-gray-400">...</span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3.5 py-1.5 border rounded-lg mx-0.5 text-sm transition-colors ${
            currentPage === i
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-semibold'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700'
          }`}>
          {i}
        </button>,
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots-end" className="px-1 text-gray-400">...</span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`px-3.5 py-1.5 border rounded-lg mx-0.5 text-sm transition-colors ${
            currentPage === totalPages
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-semibold'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700'
          }`}>
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  const preView = (index) => {
    setShowPreView(true);
    setFileID(index);
    setLoading(true);
  };

  const [currentIndex, setCurrentIndex] = useState(fileId || 0); // Track the current file index

  useEffect(() => {
    setCurrentIndex(fileId);
  }, [fileId]);
  // Get the current file object
  const currentFile = bucket[currentIndex];

  const fileType = currentFile?.mime_type; // "image/png"
  const valueAfterSlash = fileType?.split('/')[1];

  console.log('object: ', valueAfterSlash);

  const handlePreviousImage = () => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - 1)); // Prevent going below index 0
    setLoading(true);
  };

  const handleNextImage = () => {
    setCurrentIndex((prevIndex) => Math.min(bucket?.length - 1, prevIndex + 1)); // Prevent exceeding array bounds
    setLoading(true);
  };

  const toggleCheckbox = (fileId) => {
    setCheckedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    if (!bucket || bucket.length === 0) return;
    if (checkedFiles.length === bucket.length) {
      setCheckedFiles([]);
    } else {
      setCheckedFiles(bucket.map((f: any) => f.msg_id));
    }
  };

  const handleBulkDownload = async (filesToDownload?: any[]) => {
    const targetFiles = filesToDownload || bucket.filter((f: any) => checkedFiles.includes(f.msg_id));
    if (!targetFiles || targetFiles.length === 0) {
      toast.error('No files selected to download');
      return;
    }

    const controller = new AbortController();
    setBulkAbortController(controller);
    setBulkDownloading(true);

    try {
      await bulkDownloadFiles({
        files: targetFiles,
        fetchFileBlob: async (file: any, signal?: AbortSignal) => {
          const res: any = await fetchDataFromAPI(
            'bucket/file/download',
            'post',
            {
              file_id: file.msg_id,
              bucket_id: params?.id,
            },
            user,
            undefined,
            'blob'
          );
          const filename = parseFilenameFromHeaders(res.headers, file.file_name || `file_${file.msg_id}`);
          return { blob: res.data, filename };
        },
        zipFilename: `cloudvault-${bucketName || 'bucket'}-files.zip`,
        onProgress: (p) => setBulkProgress(p),
        signal: controller.signal,
      });

      toast.success(
        targetFiles.length === 1
          ? 'File downloaded successfully!'
          : `Successfully downloaded ${targetFiles.length} files!`
      );
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        toast('Download canceled');
      } else {
        console.error('Bulk download error:', err);
        toast.error('Failed to download files');
      }
    } finally {
      setBulkDownloading(false);
      setBulkAbortController(null);
    }
  };

  const handleCancelBulkDownload = () => {
    if (bulkAbortController) {
      bulkAbortController.abort();
    }
    setBulkDownloading(false);
    setBulkAbortController(null);
  };
  const handleBulkDelete = () => {
    fetchDataFromAPI(`bucket/${params?.id}/delete-file`, 'post', { file_id: checkedFiles }, user)
      .then((res) => {
        // console.log('res', res);
        toast.success(res?.message)
        mybucket();
        setCheckedFiles([])
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        toast.error(res?.message)

        console.log('error', error);
      });
  }
  const handleDelete = (id) => {
    console.log('id', id);
    setLoading(true);
    fetchDataFromAPI(`bucket/${params?.id}/delete-file`, 'post', { file_id: [id] }, user)
      .then((res) => {
        // console.log('res', res);
        toast.success(res?.message)
        mybucket();
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        toast.error(res?.message)

        console.log('error', error);
      });
  };
  // Check if file is streamable (video, PDF, or image)
  const isStreamable = (file: any): boolean => {
    if (!file) return false;
    const mimeType = file.mime_type || '';
    const fileType = file.type || '';
    const fileName = (file.file_name || '').toLowerCase();
    
    // Check for images
    if (mimeType.startsWith('image/') || fileType === 'photo' || /\.(heic|heif|jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
      return true;
    }
    
    // Check for videos
    if (mimeType.startsWith('video/') || fileType === 'video' || /\.(mov|mp4|m4v|mkv|webm|avi|3gp|flv|wmv)$/i.test(fileName)) {
      return true;
    }
    
    // Check for PDFs
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return true;
    }
    
    return false;
  };


  const handleDownload = async (fileId: string, fileName?: string, file?: any) => {
    try {
      setLoading(true);
      
      const response: any = await fetchDataFromAPI(
        'bucket/file/download',
        'post',
        {
          file_id: fileId,
          bucket_id: params?.id,
        },
        user,
        undefined,
        'blob'
      );

      // Extract blob and headers from response
      const blob = response.data;
      const headers = response.headers || {};
      
      // Get the filename - prioritize fileName parameter, then Content-Disposition header, then default
      let filename = fileName || 'download';
      
      // Try to extract from Content-Disposition header if fileName not provided
      if (!fileName) {
        const contentDisposition = headers['content-disposition'] || headers['Content-Disposition'];
        if (contentDisposition) {
          // Try multiple patterns to extract filename
          // Pattern 1: filename*=UTF-8''...
          const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]*)/i);
          if (utf8Match && utf8Match[1]) {
            try {
              filename = decodeURIComponent(utf8Match[1].trim());
            } catch (e) {}
          } else {
            // Pattern 2: filename="value" or filename='value'
            let filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/^['"]|['"]$/g, '').trim();
              try {
                filename = decodeURIComponent(filename);
              } catch (e) {}
            }
          }
        }
      }
      
      // Ensure filename has an extension if it's missing
      if (filename === 'download' || !filename.includes('.')) {
        const contentType = headers['content-type'] || headers['Content-Type'] || '';
        if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
          filename = filename === 'download' ? 'image.jpg' : `${filename}.jpg`;
        } else if (contentType.includes('image/png')) {
          filename = filename === 'download' ? 'image.png' : `${filename}.png`;
        } else if (contentType.includes('application/pdf')) {
          filename = filename === 'download' ? 'document.pdf' : `${filename}.pdf`;
        }
      }
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up after 3 seconds to allow browser to read filename
      setTimeout(() => {
        try {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
          window.URL.revokeObjectURL(url);
        } catch (e) {}
      }, 3000);
      
      toast.success('File downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to download file';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files); // Convert FileList to array
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  // const formatStorageSize = (sizeInMB) => {
  //   if (sizeInMB >= 1024) {
  //     // Convert MB to GB if size is 1024 MB or more
  //     return `${(sizeInMB / 1024)?.toFixed(2)} GB`;
  //   }
  //   // Otherwise, show it in MB
  //   return `${sizeInMB?.toFixed(2)} MB`;
  // };

  if (notFound) {
    return (
      <DashboardLayout>
        <NotFound
          title="Bucket Not Found"
          message="The bucket you are looking for does not exist, has been deleted, or you do not have permission to access it."
          statusCode="404"
        />
      </DashboardLayout>
    );
  }

  return (
    <>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <span className="loader h-8 w-8 border-4 border-t-purple-500 border-white rounded-full animate-spin"></span>
        </div>
      )}
     

      <DashboardLayout>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center space-x-4">
            <HardDrive className="h-8 w-8 text-teal-400" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Storage Used
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatStorageSize(totlaStorage)}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={totlaStorage?.toFixed(2)} className="h-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatStorageSize(totlaStorage)} of total storage
              </p>
            </div>
          </motion.div> */}

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.1}}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center space-x-4">
            <File className="h-8 w-8 text-purple-600" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Files
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {totlaFile}
                </h3>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.2}}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Upload Your Files
            </h2>

            {/* Drag and Drop Zone */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Drag & drop your files here, or{' '}
                    <span className="text-blue-500 underline">browse</span>
                  </p>
                </div>
              </label>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">
                  Selected Files:
                </h3>
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={index}
                      className="bg-gray-100 dark:bg-gray-700 rounded-md px-4 py-2 text-sm text-gray-800 dark:text-white flex justify-between">
                      <span>{file.name}</span>
                      <span className="text-gray-500 text-xs">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {isUploading && (
              <div className="mt-4 p-4 rounded-xl bg-purple-50 dark:bg-gray-700/70 border border-purple-200 dark:border-gray-600 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <span className="truncate max-w-[220px]" title={uploadCurrentFile}>
                    File {uploadCurrentFileIndex} of {selectedFiles.length}: {uploadCurrentFile}
                  </span>
                  <span className="tabular-nums font-mono font-bold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2.5 bg-purple-100 dark:bg-gray-600" />
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span className="truncate pr-2">{uploadStatusText || 'Uploading...'}</span>
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="text-red-500 hover:text-red-700 font-semibold shrink-0 ml-2 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              disabled={selectedFiles?.length === 0 || isUploading}
              className={`w-full ${
                selectedFiles?.length === 0 || isUploading
                  ? 'bg-purple-300 dark:bg-purple-900/40 cursor-not-allowed text-white/80'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
              } font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition duration-200`}
              onClick={(e) => handleSubmit(e)}>
              {isUploading ? (
                <>
                  <span className="loader h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  <span>Uploading ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span>Upload {selectedFiles.length > 0 ? `(${selectedFiles.length}) File${selectedFiles.length > 1 ? 's' : ''}` : 'Files'}</span>
                </>
              )}
            </button>
          </motion.div>
        </div>

        <div className="space-y-8 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={bucket?.length > 0 && checkedFiles.length === bucket?.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                        title={checkedFiles.length === bucket?.length ? "Deselect All" : "Select All"}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[340px]">
                    <div className="flex items-center space-x-2">
                      {checkedFiles.length > 0 ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-1.5 h-8 px-3 text-xs"
                            onClick={() => handleBulkDownload()}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download ({checkedFiles.length})</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setShowConfirm(true)}
                            className="h-8 px-3 text-xs flex items-center space-x-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete ({checkedFiles.length})</span>
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('name')}
                            className="flex items-center space-x-2 h-8 px-2">
                            <span>File</span>
                          </Button>
                          {bucket?.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBulkDownload(bucket)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 h-8 px-2.5 text-xs flex items-center space-x-1.5"
                              title="Download all files in this bucket"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download All ({bucket.length})</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bucket?.map((file, index) => {
                  return (
                    <TableRow>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={checkedFiles.includes(file.msg_id)}
                          onChange={() => toggleCheckbox(file.msg_id)}
                          className="w-4 h-4 accent-purple-600 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell key={file?.msg_id}
                      role="button"
                      onClick={() => preView(index)}>
                        <div className="flex items-center space-x-3">
                          {/* <span className="font-medium dark:text-white">
                            {file.file_name}
                          </span> */}
                          {/*
                        <img
                        src={`http://storage.raju.serv00.net/api/thumbnil/${file.fileId}/awards-logo.png`}
                        alt={`${file.fileName}`}
                        style={{width: '100px', height: 'auto'}}
                        />
                        */}
                          {/*
                      <ImageLoader key={file.fileId} fileId={file.fileId} />
                        */}
                          <img
                            src={file.thumbnail}
                            alt="Thumbnail"
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover', // or 'contain' if you want to preserve the aspect ratio within the specified dimensions
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {file.file_name}
                      </TableCell>

                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {moment(file.uploadedAt).format('YYYY-MM-DD')}
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDownload(file?.msg_id, file?.file_name, file)}
                              className="text-blue-600 dark:text-blue-400">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(file?.msg_id)}
                              className="text-red-600 dark:text-red-400">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex justify-center items-center flex-wrap gap-2 mt-4 mb-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3.5 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-gray-300 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm font-medium">
                Previous
              </button>

              <div className="flex items-center">
                {renderPagination()}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= (totalPages || 1)}
                className="px-3.5 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-gray-300 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm font-medium">
                Next
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {showPreView && currentFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="relative bg-transparent rounded-lg w-full h-full max-w-none flex flex-col">
            <button
              type="button"
              className="absolute z-[60] flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/75 hover:bg-black/95 active:scale-95 text-white shadow-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-150"
              style={{
                top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))',
                right: 'max(16px, calc(env(safe-area-inset-right, 0px) + 12px))',
              }}
              onClick={handleCloseModal}
              aria-label="Close">
              <span className="text-2xl leading-none select-none font-bold">✕</span>
            </button>

            <div className="flex items-center justify-center relative flex-grow p-4 sm:p-6">
              {currentIndex > 0 && (
                <button
                  type="button"
                  className="absolute z-[60] flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/75 hover:bg-black/95 active:scale-95 text-white shadow-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-150"
                  style={{
                    left: 'max(12px, calc(env(safe-area-inset-left, 0px) + 12px))',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  onClick={handlePreviousImage}
                  aria-label="Previous">
                  <span className="text-xl leading-none select-none">◀</span>
                </button>
              )}

              {isStreamable(currentFile) ? (
                (() => {
                  const mimeType = currentFile?.mime_type || '';
                  const fileType = currentFile?.type || '';
                  const streamUrl = currentFile?.stream_url || currentFile?.thumbnail;
                  
                  // Debug logging
                  console.log('Streaming file:', {
                    mimeType,
                    fileType,
                    streamUrl,
                    file: currentFile
                  });
                  
                  if (!streamUrl) {
                    return (
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <p>Stream URL not available</p>
                      </div>
                    );
                  }
                  
                  // For video files
                  const fileNameLower = (currentFile?.file_name || '').toLowerCase();
                  const isVideo = mimeType.startsWith('video/') || fileType === 'video' || /\.(mov|mp4|m4v|mkv|webm|avi|3gp|flv|wmv)$/i.test(fileNameLower);
                  if (isVideo) {
                    const videoMime = mimeType && mimeType.startsWith('video/') ? mimeType : (fileNameLower.endsWith('.webm') ? 'video/webm' : 'video/mp4');
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center relative">
                        {loading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 rounded-md pointer-events-none">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-3" />
                            <p className="text-white text-sm font-medium animate-pulse">Streaming video...</p>
                          </div>
                        )}
                        <video
                          key={streamUrl}
                          controls
                          autoPlay
                          playsInline
                          preload="metadata"
                          className="max-w-full max-h-[85vh] rounded-md shadow-lg"
                          onLoadStart={() => setLoading(true)}
                          onLoadedMetadata={() => setLoading(false)}
                          onLoadedData={() => setLoading(false)}
                          onCanPlay={() => setLoading(false)}
                          onWaiting={() => setLoading(true)}
                          onPlaying={() => setLoading(false)}
                          onError={(e) => {
                            setLoading(false);
                            console.error('Video load error:', e);
                            toast.error('Failed to load video.');
                          }}>
                          <source src={streamUrl} type={videoMime} />
                          <source src={streamUrl} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    );
                  }
                  
                  // For PDF files
                  if (mimeType === 'application/pdf') {
                    return (
                      <iframe
                        src={streamUrl}
                        className="w-full h-full rounded-md shadow-lg"
                        onLoad={() => setLoading(false)}
                        onError={(e) => {
                          setLoading(false);
                          console.error('PDF load error:', e);
                          toast.error('Failed to load PDF. URL: ' + streamUrl);
                        }}
                        title={currentFile.file_name || 'PDF Viewer'}
                      />
                    );
                  }
                  
                  // For image files
                  if (mimeType.startsWith('image/') || fileType === 'photo') {
                    return (
                      <img
                        src={streamUrl}
                        alt={currentFile.file_name || 'Image'}
                        className="max-w-full max-h-[85vh] object-contain rounded-md shadow-lg"
                        onLoad={() => setLoading(false)}
                        onError={(e) => {
                          setLoading(false);
                          console.error('Image load error:', e, 'URL:', streamUrl);
                          toast.error('Failed to load image. URL: ' + streamUrl);
                        }}
                      />
                    );
                  }
                  
                  return null;
                })()
              ) : (
                <img
                  src={currentFile?.thumbnail}
                  alt={currentFile?.file_name || 'Preview'}
                  className="max-w-full max-h-[85vh] object-contain rounded-md shadow-lg"
                  onLoad={() => setLoading(false)}
                />
              )}

              {currentIndex < bucket?.length - 1 && (
                <button
                  type="button"
                  className="absolute z-[60] flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/75 hover:bg-black/95 active:scale-95 text-white shadow-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-150"
                  style={{
                    right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 12px))',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  onClick={handleNextImage}
                  aria-label="Next">
                  <span className="text-xl leading-none select-none">▶</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Confirm Delete
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Are you sure you want to delete <b>{checkedFiles.length}</b> file(s)?
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  setShowConfirm(false);
                  handleBulkDelete();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkDownloading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-xl">
                <Download className="h-6 w-6 animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bulkProgress.stage === 'zipping'
                    ? 'Creating ZIP Archive...'
                    : bulkProgress.stage === 'saving'
                    ? 'Saving Download...'
                    : `Downloading Files (${bulkProgress.current}/${bulkProgress.total})`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {bulkProgress.currentFileName}
                </p>
              </div>
            </div>

            <div className="space-y-2 my-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${bulkProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{bulkProgress.stage === 'zipping' ? 'Compressing files...' : `${bulkProgress.current} of ${bulkProgress.total} completed`}</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{bulkProgress.percent}%</span>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <Button
                variant="outline"
                onClick={handleCancelBulkDownload}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" reverseOrder={false} />
    </>
  );
}
