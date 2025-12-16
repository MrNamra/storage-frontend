import {Plus, HardDrive, Upload, File} from 'lucide-react';
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
import {Progress} from '@/components/ui/progress';

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
  const [bucketName, setBucketName] = useState('');
  const [error, setError] = useState('');
  const [bucket, setBucket] = useState([]);
  const [loading, setLoading] = useState(false); // State for loading
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [password, setPassword] = useState('');

  const [fileId, setFileID] = useState();
  const [showPreView, setShowPreView] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [totlaFile, setTotalFile] = useState(0);
  const [totlaStorage, setStorage] = useState(0);
  const [showUploader, setShowUploader] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    mybucket(currentPage);
  }, [currentPage]);

  const mybucket = (page) => {
    setLoading(true);
    fetchDataFromAPI(
      `bucket/display/${params?.id}?page=${page ?? 1}&limit=15`,
      'get',
      '',
      user,
    )
      .then((res) => {
        console.log('res', res);
        setBucket(res.data);
        setTotalFile(res?.data?.length);
        setStorage(res?.totalStorage);
        setTotalPages(res?.pagination?.totalPages);
        setLoading(false);
      })
      .catch((error) => {
        console.log('error', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('bucket_id', params?.id);

    // Append all selected files to the FormData
    for (let i = 0; i < selectedFiles?.length; i++) {
      formData.append('files[]', selectedFiles[i]);
    }

    try {
      setLoading(true);

      // Upload files using the API
      const res = await fetchDataFromAPI(
        `bucket/file/upload`,
        'post',
        formData,
        user,
      );
      console.log('res', res);

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate delay
      }
      setSelectedFiles([]);

      // After upload completion
      mybucket();
      setShowUploader(false);
    } catch (error) {
      console.error('Error during upload:', error);
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 border rounded-md mx-1 ${
            currentPage === i
              ? 'bg-purple-600 text-white'
              : 'bg-white text-blue-500 hover:bg-blue-100'
          }`}>
          {i}
        </button>,
      );
    }
    return pages;
  };

  const preView = (index) => {
    setShowPreView(true);
    setFileID(index);
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

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files); // Convert FileList to array
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const formatStorageSize = (sizeInMB) => {
    if (sizeInMB >= 1024) {
      // Convert MB to GB if size is 1024 MB or more
      return `${(sizeInMB / 1024)?.toFixed(2)} GB`;
    }
    // Otherwise, show it in MB
    return `${sizeInMB?.toFixed(2)} MB`;
  };

  return (
    <>
      {/*
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <span className="loader h-8 w-8 border-4 border-t-purple-500 border-white rounded-full animate-spin"></span>
        </div>
      )}
      */}

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
            {/*
  {loading && (
    <div className="mt-4">
    <Progress value={uploadProgress} className="h-2" />
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
    Uploading... {uploadProgress}%
    </p>
    </div>
  )}
  */}

            {/* Upload Button */}
            <button
              disabled={selectedFiles?.length === 0}
              className={`w-full ${
                selectedFiles?.length === 0 ? 'bg-purple-300' : 'bg-purple-600'
              }  text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition duration-200`}
              onClick={(e) => handleSubmit(e)}>
              <Upload className="h-6 w-6" />
              {loading ? (
                <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              ) : (
                <span>Upload Files</span>
              )}
            </button>
          </motion.div>
        </div>

        <div className="space-y-8 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="flex items-center space-x-2">
                      <span>File</span>
                    </Button>
                  </TableHead>
                  <TableHead>File Name</TableHead>

                  <TableHead>Date</TableHead>
                  {/* 
                <TableHead className="w-[70px]"></TableHead>
                */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bucket?.map((file, index) => {
                  return (
                    <TableRow
                      key={file?.id}
                      role="button"
                      onClick={() => preView(index)}>
                      <TableCell>
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
            <div className="flex justify-center items-center space-x-4 mt-4 mb-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-md bg-white text-purple-500 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Previous
              </button>

              {renderPagination()}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-md bg-white text-purple-500 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {showPreView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white bg-opacity-50 rounded-lg p-1 w-full h-full max-w-none flex flex-col">
            <button
              className="absolute top-4 right-4 text-white text-2xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center z-50"
              onClick={handleCloseModal}
              aria-label="Close">
              ✕
            </button>

            <div className="flex items-center justify-center relative flex-grow">
              {currentIndex > 0 && (
                <button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-2xl font-bold bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center z-50"
                  onClick={handlePreviousImage}
                  aria-label="Previous">
                  ◀
                </button>
              )}

              <iframe
                src={currentFile?.thumbnail}
                className="w-full h-full rounded-md shadow-lg"
                onLoad={() => setLoading(false)}
                allowFullScreen></iframe>

              {currentIndex < bucket?.length - 1 && (
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-2xl font-bold bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center z-50"
                  onClick={handleNextImage}
                  aria-label="Next">
                  ▶
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <Toaster position="bottom-center" reverseOrder={false} />
    </>
  );
}
