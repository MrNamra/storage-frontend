import React, { useState } from 'react';
import { X, Share2, Copy, Check, Lock, Globe, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchDataFromAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface ShareModalProps {
  bucketId: string | number;
  bucketName: string;
  shareCode?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShareUpdated?: () => void;
  token?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  bucketId,
  bucketName,
  shareCode,
  isOpen,
  onClose,
  onShareUpdated,
  token,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = shareCode
    ? `${window.location.origin}/bucket/${shareCode}`
    : '';

  const handleCreateOrUpdateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { bucket_id: bucketId };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const res: any = await fetchDataFromAPI('bucket/share', 'post', payload, token);
      toast.success(res?.message || 'Bucket share link updated!');
      setPassword('');
      onShareUpdated?.();
    } catch (err: any) {
      console.error('Share error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to share bucket');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareCode) return;
    setLoading(true);
    try {
      await fetchDataFromAPI(`bucket/end-share/${shareCode}`, 'post', {}, token);
      toast.success('Share link revoked successfully');
      onShareUpdated?.();
    } catch (err: any) {
      console.error('Revoke share error:', err);
      toast.error(err?.response?.data?.message || 'Failed to revoke share');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Share URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Share Bucket</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">{bucketName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Link Info */}
        <div className="py-4 space-y-4">
          {shareCode ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Public Access Link
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              {/* Revoke Option */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Stop sharing this bucket?</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevokeShare}
                  disabled={loading}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Revoke Link
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateOrUpdateShare} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Create a shareable link. Anyone with this link can view, stream, and download files stored in this bucket.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Optional Password Protection
                </label>
                <Input
                  type="password"
                  placeholder="Leave empty for public access"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-9">
                {loading ? 'Creating Link...' : 'Generate Share Link'}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

