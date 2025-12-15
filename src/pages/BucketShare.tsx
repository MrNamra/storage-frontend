import {useEffect, useState} from 'react';

import {motion} from 'framer-motion';
import {
  HardDrive,
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Cloud,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {Link, useParams} from 'react-router-dom';
import {fetchDataFromAPI} from '@/lib/api';
import moment from 'moment';

import PDFViewer from 'pdf-viewer-reactjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
const BucketShare = () => {
  const params = useParams();
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showUploader, setShowUploader] = useState(false);
  const [bucket, setBucket] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  console.log('first selected files', selectedFiles);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showPreView, setShowPreView] = useState(false);

  const [totlaFile, setTotalFile] = useState(0);
  const [totlaStorage, setStorage] = useState(0);

  const [btnDisable, setDisable] = useState(false);
  const [fileId, setFileID] = useState();

  const [status, setStatus] = useState(false);

  const [checkStatus, setCheckStatus] = useState(false);

  const handleOpenModal = () => {
    setPassword('');
    setError('');
    setShowUploader(true);
  };

  const handleCloseModal = () => {
    setPassword('');
    setError('');
    setShowUploader(false);
    setShowPreView(false);
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files); // Convert FileList to array
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  useEffect(() => {
    if (params?.id) {
      handleCall(currentPage);
    }
  }, [params?.id, currentPage]);

  const handleCall = (page) => {
    fetchDataFromAPI(
      `buckets/show/${params?.id}?page=${page}&limit=15`,
      'get',
      '',
      '',
    )
      .then((res) => {
        console.log('res', res);
        setBucket(res?.data);
        setTotalFile(res?.totalFiles);
        setStorage(res?.totalStorage);
        setTotalPages(res?.pagination?.totalPages);
        // Set the fetched data to the state
      })
      .catch((error) => {
        console.log('error', error);
        if (error?.status === 500) {
          setCheckStatus(true);
        }
      });
  };

  // // Find the current bucket details based on the ID parameter
  // const bucketDetails =
  //   buckets.find((bucket) => bucket.id === params.id) || buckets[0];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'image':
        return ImageIcon;
      default:
        return File;
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // // Sort files based on current sort settings
  // const sortedFiles = [...files].sort((a, b) => {
  //   const aValue = a[sortColumn as keyof typeof a];
  //   const bValue = b[sortColumn as keyof typeof b];
  //   const modifier = sortDirection === "asc" ? 1 : -1;

  //   return aValue < bValue ? -1 * modifier : aValue > bValue ? 1 * modifier : 0;
  // });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password cannot be empty');
      return;
    }

    const formData = new FormData();
    formData.append('password', password);
    // formData.append("files", selectedFiles);

    for (let i = 0; i < selectedFiles?.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    setLoading(true);
    setStatus(true);
    setShowUploader(false);

    fetchDataFromAPI(`files/${params?.id}/upload`, 'post', formData, '')
      .then((res) => {
        console.log('res', res);
        handleCall();
        setSelectedFiles([]);
        setShowUploader(false);
        setLoading(false);
        setStatus(false);
      })
      .catch((error) => {
        console.log('error', error);
        setError(error?.response?.data?.message);
        setLoading(false);
      });

    // Handle form submission logic here (e.g., API call)
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
  const fileType = currentFile?.fileType; // "image/png"
  const valueAfterSlash = fileType?.split('/')[1];

  console.log('object: ', currentFile);

  const handlePreviousImage = () => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - 1)); // Prevent going below index 0
    setLoading(true);
  };

  const handleNextImage = () => {
    setCurrentIndex((prevIndex) => Math.min(bucket?.length - 1, prevIndex + 1)); // Prevent exceeding array bounds
    setLoading(true);
  };

  // if (!showPreView) return null;

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
      {!checkStatus ? (
        <div className="min-h-screen bg-gray-50 pt-20 mx-auto px-4 py-8">
          <nav className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <Link to="/dashboard" className="flex items-center space-x-2">
                  <Cloud className="h-8 w-8 text-teal-400" />
                  <span className="font-poppins font-bold text-xl">
                    CloudVault
                  </span>
                </Link>

                {/* Search Bar */}
              </div>
            </div>
          </nav>

          {/* Storage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10 ">
            <motion.div
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
            </motion.div>

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

              {/* Upload Button */}
              <button
                disabled={selectedFiles?.length === 0}
                className={`w-full ${
                  selectedFiles?.length === 0
                    ? 'bg-purple-300'
                    : 'bg-purple-600'
                }  text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition duration-200`}
                onClick={() => setShowUploader(true)}>
                {!status && <Upload className="h-6 w-6" />}

                {status ? (
                  <>
                    <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  </>
                ) : (
                  <span>Upload Files</span>
                )}
              </button>
            </motion.div>
          </div>

          {/* File Uploader */}

          {/* Files Table */}
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
                          <span className="font-medium dark:text-white">
                            {file.name}
                          </span>
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
                            src={`https://api.happybilling.serv00.net/api/thumbnail/${file.fileId}`}
                            alt="Base64 Thumbnail"
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover', // or 'contain' if you want to preserve the aspect ratio within the specified dimensions
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {file.fileName}
                      </TableCell>

                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {moment(file.uploadedAt).format('YYYY-MM-DD')}
                      </TableCell>

                      {/*
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 dark:text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                    */}
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
          {showUploader && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Password</h2>
                <form>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="*****"
                      // className="w-full p-2 border rounded-lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full p-2 border rounded-lg ${
                        error ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                  </div>
                  <div className="flex justify-end mt-6 space-x-4">
                    <Button variant="outline" onClick={handleCloseModal}>
                      Cancel
                    </Button>
                    <Button
                      onClick={(e) => handleSubmit(e)}
                      className="bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                      disabled={loading} // Disable button while loading
                    >
                      {loading ? (
                        <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                      ) : (
                        'Upload'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showPreView && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="relative bg-opacity-50 bg-white rounded-lg p-1 w-full h-full max-w-none flex flex-col">
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
                    src={`https://api.happybilling.serv00.net/api/buckets/show/${params?.id}/${currentFile?.fileId}`}
                    className="w-full h-full rounded-md shadow-lg"
                    onLoad={() => setLoading(false)} // Remove loading state once the iframe loads
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
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center h-screen bg-purple-600 text-white text-center p-6">
          <div className="text-9xl font-extrabold">404</div>
          <div className="text-xl mt-6">
            The page you're looking for could not be found.
          </div>
          <div className="text-lg mt-4">Please try again or check the URL.</div>
        </div>
      )}
    </>
  );
};

export default BucketShare;
