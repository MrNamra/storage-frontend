import { useEffect, useState } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { saveUserLocally } from '@/lib/constants';
import toast from 'react-hot-toast';

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetEmail, setTargetEmail] = useState('');

  const checkImpersonation = () => {
    const adminToken = localStorage.getItem('admin_impersonator_token');
    const name = localStorage.getItem('admin_impersonated_user_name') || 'User';
    const email = localStorage.getItem('admin_impersonated_user_email') || '';

    if (adminToken) {
      setImpersonating(true);
      setTargetName(name);
      setTargetEmail(email);
    } else {
      setImpersonating(false);
    }
  };

  useEffect(() => {
    checkImpersonation();

    const handleStorage = () => checkImpersonation();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleExitImpersonation = () => {
    const adminToken = localStorage.getItem('admin_impersonator_token');
    if (!adminToken) return;

    // Restore admin token
    saveUserLocally(adminToken);
    localStorage.removeItem('admin_impersonator_token');
    localStorage.removeItem('admin_impersonator_name');
    localStorage.removeItem('admin_impersonated_user_name');
    localStorage.removeItem('admin_impersonated_user_email');

    toast.success('Exited impersonation. Returned to Administrator mode.');
    window.location.href = '/admin';
  };

  if (!impersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999999] bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-lg flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-200 animate-pulse flex-shrink-0" />
        <span>
          <strong>Admin Impersonation Mode:</strong> Currently logged in as{' '}
          <span className="font-semibold underline">{targetName}</span>
          {targetEmail ? ` (${targetEmail})` : ''}
        </span>
      </div>
      <button
        onClick={handleExitImpersonation}
        className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 transition-colors px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/20">
        <LogOut className="w-3.5 h-3.5" />
        <span>Exit Impersonation & Return to Admin</span>
      </button>
    </div>
  );
}
