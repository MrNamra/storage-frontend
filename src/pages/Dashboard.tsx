import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {StorageMetrics} from '@/components/dashboard/storage-metrics';
import {BucketList} from '@/components/dashboard/bucket-list';
import {FileUploader} from '@/components/dashboard/file-uploader';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useState} from 'react';
import {fetchDataFromAPI} from '@/lib/api';
import {getUser} from '@/lib/constants';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false); // State for loading

  const user = JSON.parse(getUser());

  const handleOpenModal = () => {
    setBucketName('');
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setBucketName('');
    setError('');
    setIsModalOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!bucketName.trim()) {
      setError('Bucket name cannot be empty');
      return;
    }

    const body = {name: bucketName};
    setLoading(true);
    fetchDataFromAPI('bucket/create', 'post', body, user)
      .then((res) => {
        console.log('res', res);
        console.log('Bucket Name:', bucketName);
        setIsModalOpen(false);
        setLoading(false);
        window.location.reload();
      })
      .catch((error) => {
        console.log('error', error);
        console.log('Bucket Name:', bucketName);
        setLoading(false);
        setIsModalOpen(false);
      });

    // Handle form submission logic here (e.g., API call)
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <span className="loader h-8 w-8 border-4 border-t-purple-500 border-white rounded-full animate-spin"></span>
        </div>
      )}
      <DashboardLayout>
        <div className="space-y-8">
          {/* Storage Overview */}
          <StorageMetrics />

          {/* File Upload and Bucket Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-poppins font-semibold text-gray-900">
                  Buckets
                </h2>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleOpenModal()}>
                  <Plus className="h-5 w-5 mr-2" />
                  New Bucket
                </Button>
              </div>
              <BucketList />
            </div>

            <div className="space-y-6">
              {/* <div className="flex items-center justify-between">
              <h2 className="text-2xl font-poppins font-semibold text-gray-900">
                Files
              </h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload
                </Button>
              </div>
            </div> */}
              <FileUploader />
              {/* <FileList /> */}
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Create New Bucket</h2>
              <form>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Bucket Name"
                    // className="w-full p-2 border rounded-lg"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
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
                      'Create'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
}
