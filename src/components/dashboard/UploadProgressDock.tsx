import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileText,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/fileTypes';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

interface UploadProgressDockProps {
  isUploading: boolean;
  progress: number;
  statusText?: string;
  currentFileName?: string;
  currentIndex?: number;
  totalFiles?: number;
  items?: UploadItem[];
  onCancel: () => void;
}

export const UploadProgressDock: React.FC<UploadProgressDockProps> = ({
  isUploading,
  progress,
  statusText,
  currentFileName,
  currentIndex = 1,
  totalFiles = 1,
  items = [],
  onCancel,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex]);

  if (!isUploading) return null;

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const isMultiFile = totalFiles > 1 || items.length > 1;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-[26rem] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <UploadCloud className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
          <span className="font-semibold text-xs sm:text-sm truncate">
            {isMultiFile
              ? `Uploading to Cloud (${currentIndex} of ${totalFiles})`
              : 'Uploading to Cloud'}
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
        <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Active File / Overall Progress Box */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[240px]" title={currentFileName}>
                {currentFileName || 'Processing files...'}
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                {Math.round(progress)}%
              </span>
            </div>

            <Progress value={progress} className="h-2 bg-slate-100 dark:bg-slate-800" />

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate pr-2">{statusText || 'Processing upload...'}</span>
              <button
                onClick={onCancel}
                className="text-rose-500 hover:text-rose-600 font-medium shrink-0 hover:underline">
                Cancel
              </button>
            </div>
          </div>

          {/* Queue List (shown when multiple files are in queue) */}
          {items.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Queue ({completedCount} of {items.length} completed)</span>
                {items.length - completedCount > 0 && (
                  <span>{items.length - completedCount} remaining</span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                {items.map((item, idx) => {
                  const isCurrent = item.status === 'uploading';
                  return (
                    <div
                      key={item.id || idx}
                      ref={isCurrent ? activeItemRef : null}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}>
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {item.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {item.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        )}
                        {item.status === 'failed' && (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                        {item.status === 'pending' && (
                          <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs truncate font-medium ${
                            isCurrent
                              ? 'text-blue-950 dark:text-blue-200'
                              : item.status === 'completed'
                              ? 'text-slate-600 dark:text-slate-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                          title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          <span>{formatBytes(item.size)}</span>
                          {item.status === 'uploading' && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              · Uploading
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-rose-500 font-medium">· Error</span>
                          )}
                          {item.status === 'pending' && <span>· In queue</span>}
                        </div>

                        {/* Mini progress bar for current item */}
                        {isCurrent && (
                          <div className="mt-1.5 w-full bg-blue-100 dark:bg-blue-900/40 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-150"
                              style={{ width: `${Math.round(item.progress ?? progress)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Status Right Badge */}
                      <div className="shrink-0 text-right">
                        {item.status === 'completed' && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            Done
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            {Math.round(item.progress ?? progress)}%
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                            Failed
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            Waiting
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
