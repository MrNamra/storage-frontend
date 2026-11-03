import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadProgressDockProps {
  isUploading: boolean;
  progress: number;
  statusText: string;
  currentFileName: string;
  currentIndex: number;
  totalFiles: number;
  onCancel: () => void;
}

export const UploadProgressDock: React.FC<UploadProgressDockProps> = ({
  isUploading,
  progress,
  statusText,
  currentFileName,
  currentIndex,
  totalFiles,
  onCancel,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isUploading) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <UploadCloud className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
          <span className="font-semibold text-xs sm:text-sm truncate">
            Uploading to Telegram ({currentIndex} of {totalFiles})
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}>
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
            title="Cancel Upload">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium truncate max-w-[220px]" title={currentFileName}>
              {currentFileName}
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
              {Math.round(progress)}%
            </span>
          </div>

          <Progress value={progress} className="h-2 bg-slate-100 dark:bg-slate-800" />

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate pr-2">{statusText || 'Chunking & streaming to MTProto...'}</span>
            <button
              onClick={onCancel}
              className="text-rose-500 hover:text-rose-600 font-medium shrink-0 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

