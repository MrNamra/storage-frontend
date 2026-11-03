import { useState } from 'react';
import { Plus, HardDrive, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageMetrics } from '@/components/dashboard/storage-metrics';
import { BucketList } from '@/components/dashboard/bucket-list';
import { ConnectDriveModal } from '@/components/dashboard/ConnectDriveModal';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchDataFromAPI } from '@/lib/api';
import { getUser } from '@/lib/constants';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnectDriveModalOpen, setIsConnectDriveModalOpen] = useState(false);

  const user = JSON.parse(getUser() || 'null');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName.trim()) {
      setError('Drive name cannot be empty');
      return;
    }

    const body = { name: bucketName.trim() };
    setLoading(true);
    fetchDataFromAPI('bucket/create', 'post', body, user)
      .then((res: any) => {
        toast.success(res?.message || 'Drive created successfully');
        setIsModalOpen(false);
        setLoading(false);
        window.location.reload();
      })
      .catch((err) => {
        console.error('Error creating bucket:', err);
        setError(err?.response?.data?.message || 'Failed to create drive');
        setLoading(false);
      });
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <span className="loader h-8 w-8 border-4 border-t-blue-500 border-white rounded-full animate-spin"></span>
        </div>
      )}
      <DashboardLayout>
        <div className="space-y-8 select-none">
          {/* Storage Overview */}
          <StorageMetrics />

          {/* Cloud Drive Hub Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cloud Drives & Personal Storage
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Store photos, videos, media, and personal documents securely
                </p>
              </div>
            </div>

            {/* Quick Drive Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsConnectDriveModalOpen(true)}
                className="h-9 gap-1.5 text-xs rounded-xl border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100/50">
                <Monitor className="w-3.5 h-3.5" />
                <span>Connect PC / Mac</span>
              </Button>

              <Button
                size="sm"
                onClick={handleOpenModal}
                className="h-9 gap-1.5 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>New Drive</span>
              </Button>
            </div>
          </div>

          {/* Drive Cards / Mount Points */}
          <div className="space-y-4">
            <BucketList />
          </div>
        </div>

        {/* Create Drive Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Create New Drive</h3>
              <p className="text-xs text-slate-500 mb-4">
                Enter a name for your new drive (e.g. "Personal Media", "Work Files", "Photos Backup").
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Drive Name"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                    autoFocus
                  />
                  {error && <p className="text-rose-500 text-xs mt-1.5">{error}</p>}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCloseModal} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                    {loading ? 'Creating...' : 'Create Drive'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Connect as OS Drive Modal */}
        <ConnectDriveModal
          isOpen={isConnectDriveModalOpen}
          onClose={() => setIsConnectDriveModalOpen(false)}
        />
      </DashboardLayout>
    </>
  );
}
