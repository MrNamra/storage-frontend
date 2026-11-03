import React, { useState } from 'react';
import { X, Copy, Check, File, HardDrive, Calendar, Key, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes, getFileCategoryInfo } from '@/lib/fileTypes';
import toast from 'react-hot-toast';
import moment from 'moment';

interface FilePropertiesModalProps {
  file: any;
  bucketId?: string | number;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePropertiesModal: React.FC<FilePropertiesModalProps> = ({
  file,
  bucketId,
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const category = getFileCategoryInfo(file.file_name, file.mime_type);
  const streamUrl = file.stream_url
    ? `${window.location.origin}${file.stream_url}`
    : file.streamUrl || '';
  const downloadUrl = file.stream_url
    ? `${window.location.origin}${file.stream_url}?dl=1`
    : '';
  const thumbnailUrl = file.thumbnail
    ? `${window.location.origin}${file.thumbnail}`
    : '';

  const copyToClipboard = async (text: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      toast.success(`${keyName} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className={`p-2.5 rounded-xl border ${category.color} shrink-0`}>
              <category.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate" title={file.file_name}>
                {file.file_name}
              </h3>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${category.color}`}>
                {category.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="py-4 space-y-3.5 text-sm">
          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Size
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {formatBytes(file.size)} <span className="text-xs text-slate-400 font-normal">({file.size?.toLocaleString()} bytes)</span>
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <File className="w-4 h-4" /> MIME Type
            </span>
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {file.mime_type || 'application/octet-stream'}
            </span>
          </div>

          {file.date && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Uploaded
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                {moment.unix(file.date).format('MMM D, YYYY · h:mm A')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Key className="w-4 h-4" /> Storage ID (Telegram)
            </span>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={String(file.msg_id || '')}>
              {String(file.msg_id || 'N/A')}
            </span>
          </div>

          {/* Links */}
          {streamUrl && (
            <div className="pt-2 space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Direct Stream URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={streamUrl}
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(streamUrl, 'Stream URL')}
                  className="shrink-0 h-8 gap-1.5 text-xs">
                  {copiedKey === 'Stream URL' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="default" onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

