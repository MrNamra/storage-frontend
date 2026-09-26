import {useState, useCallback, useEffect} from 'react';
import {motion} from 'framer-motion';
import {Upload, X, AlertCircle} from 'lucide-react';
import {useDropzone} from 'react-dropzone';
import {Progress} from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {fetchDataFromAPI} from '@/lib/api';
import {uploadFileChunked} from '@/lib/chunkedUpload';
import constants, {getUser} from '@/lib/constants';
import {useNavigate, useParams} from 'react-router-dom';
import toast, { Toaster } from "react-hot-toast";

export function FileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [bucket, setBucket] = useState([]);
  const user = JSON.parse(getUser());

  console.log('user', user);

  const navigate = useNavigate();

  useEffect(() => {
    bucketList();
  }, []);

  const logout = async () => {
    localStorage.removeItem(constants.USER);
    navigate('/');
    window.location.reload();
  };

  const bucketList = () => {
    fetchDataFromAPI('user/dashboard', 'get', '', user)
      .then((res) => {
        console.log('res list', res);
        setBucket(res?.data?.bucket);
      })
      .catch((error) => {
        console.log('error', error);

        if (error?.status === 401) {
          // Perform logout
          logout();
        }
      });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setShowError(false);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'application/pdf': [],
      'text/plain': [],
    },
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== name));
  };

  const uploadFiles = async () => {
    if (!selectedBucket) {
      setShowError(true);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const toastId = toast.loading("Uploading files... 0%");
    const totalToUpload = files.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalToUpload; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);

        await uploadFileChunked({
          file,
          bucketId: selectedBucket,
          token: user,
          onProgress: (p) => {
            setUploadProgress(p.percent);
            setUploadStatusText(p.message);
            toast.loading(`[${i + 1}/${totalToUpload}] ${file.name} (${p.percent}%)`, {
              id: toastId,
            });
          },
        });

        successCount++;
      }

      toast.success(
        successCount === 1 ? "Upload completed" : `${successCount} files uploaded successfully`,
        { id: toastId }
      );

      setFiles([]);
      setSelectedBucket("");
      setUploadProgress(0);
      setUploadStatusText("");
    } catch (error: any) {
      toast.error(error?.message || "Upload failed", { id: toastId });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Select value={selectedBucket} onValueChange={setSelectedBucket}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a bucket for upload" />
        </SelectTrigger>
        <SelectContent>
          {bucket.map((bucket) => (
            <SelectItem key={bucket.id} value={bucket.id}>
              {bucket.bucketName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a bucket before uploading files.
          </AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-purple-400 bg-purple-50 dark:bg-purple-950'
            : 'border-gray-300 hover:border-purple-400 dark:border-gray-600 dark:hover:border-purple-400'
        }`}>
        <input multiple {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Drag & drop files here, or click to select files
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Supports images, PDFs, and text files
        </p>
      </div>

      {files.length > 0 && (
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(file.name)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {uploading ? (
            <div className="mt-4 p-3 rounded-lg bg-purple-50 dark:bg-gray-700/60 border border-purple-200 dark:border-gray-600 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-purple-700 dark:text-purple-300">
                <span className="truncate max-w-[220px]">
                  {uploadStatusText || `Uploading file ${currentFileIndex} of ${files.length}...`}
                </span>
                <span className="tabular-nums font-mono">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 bg-purple-100 dark:bg-gray-600" />
            </div>
          ) : (
            <button
              onClick={uploadFiles}
              className="mt-4 w-full bg-purple-600 text-white rounded-lg py-2 px-4 hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedBucket}>
              Upload {files.length} file{files.length !== 1 && 's'}
            </button>
          )}
        </motion.div>
      )}
      {/* <Toaster position="bottom-center" reverseOrder={false} /> */}
    </div>
  );
}
