import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  FileCode,
  FileText,
  Music,
  Film,
  HardDrive,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPreviewType, formatBytes, getFileCategoryInfo } from '@/lib/fileTypes';
import toast from 'react-hot-toast';

interface BoxBoxPreviewModalProps {
  file: any;
  allFiles: any[];
  bucketId?: string | number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (file: any) => void;
  onOpenProperties?: (file: any) => void;
}

export const BoxBoxPreviewModal: React.FC<BoxBoxPreviewModalProps> = ({
  file,
  allFiles = [],
  bucketId,
  isOpen,
  onClose,
  onNavigate,
  onOpenProperties,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [codeContent, setCodeContent] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  const currentIndex = allFiles.findIndex((f) => (f.msg_id && f.msg_id === file?.msg_id) || f.file_name === file?.file_name);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allFiles.length - 1;

  const previewType = file ? getPreviewType(file.file_name, file.mime_type) : 'unsupported';
  const category = file ? getFileCategoryInfo(file.file_name, file.mime_type) : null;
  const streamUrl = file?.stream_url || file?.thumbnail || '';
  const downloadUrl = file?.stream_url ? `${file.stream_url}?dl=1` : '';

  // Reset states when changing file
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setMediaLoading(true);
    setCodeContent(null);
    setCodeError(null);

    // If code or text, fetch content
    if (previewType === 'code' || previewType === 'text') {
      if (streamUrl) {
        setCodeLoading(true);
        fetch(streamUrl)
          .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then((text) => {
            setCodeContent(text);
            setCodeLoading(false);
          })
          .catch((err) => {
            console.error('Failed to load text preview:', err);
            setCodeError('Unable to preview text directly. Please download to view.');
            setCodeLoading(false);
          });
      }
    }
  }, [file?.msg_id, file?.file_name]);

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept inside interactive inputs
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault();
        onNavigate?.(allFiles[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        onNavigate?.(allFiles[currentIndex + 1]);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, currentIndex, allFiles, isFullscreen]);

  if (!isOpen || !file) return null;

  const handleCopyCode = () => {
    if (!codeContent) return;
    navigator.clipboard.writeText(codeContent);
    setCopiedCode(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (previewType !== 'image') return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.2, 5));
    } else {
      setScale((s) => Math.max(s - 0.2, 0.3));
    }
  };

  const togglePlaybackSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none text-white transition-all duration-200 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      {/* BoxBox Style Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 rounded-t-xl shrink-0 gap-3 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {category && (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${category.badge}`}>
              {category.label}
            </span>
          )}
          <span className="font-medium text-sm sm:text-base text-slate-100 truncate" title={file.file_name}>
            {file.file_name}
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 font-normal shrink-0">
            {formatBytes(file.size)}
          </span>
          {allFiles.length > 1 && currentIndex >= 0 && (
            <span className="hidden md:inline px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400 font-mono">
              {currentIndex + 1} / {allFiles.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenProperties && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenProperties(file)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 h-8 px-2.5"
              title="File Properties">
              <Info className="w-4 h-4" />
              <span className="hidden md:inline text-xs">Info</span>
            </Button>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={file.file_name}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 h-8 w-8 p-0 ml-1"
            title="Close (Esc)">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-950/60 rounded-b-xl"
        onWheel={handleWheelZoom}>
        {/* Floating Previous File Button */}
        {hasPrevious && (
          <button
            type="button"
            onClick={() => onNavigate?.(allFiles[currentIndex - 1])}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white shadow-xl border border-slate-700/60 hover:border-blue-500 transition-all active:scale-95"
            title="Previous (Left Arrow)">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Floating Next File Button */}
        {hasNext && (
          <button
            type="button"
            onClick={() => onNavigate?.(allFiles[currentIndex + 1])}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white shadow-xl border border-slate-700/60 hover:border-blue-500 transition-all active:scale-95"
            title="Next (Right Arrow)">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* PREVIEW CONTENT SWITCHER */}
        <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
          {/* 1. Video Player */}
          {previewType === 'video' && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              {mediaLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 pointer-events-none">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <span className="text-xs text-slate-300 font-medium">Streaming from Telegram...</span>
                </div>
              )}
              <video
                ref={videoRef}
                key={streamUrl}
                src={streamUrl}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="max-w-full max-h-[82vh] rounded-lg shadow-2xl outline-none bg-black"
                onLoadStart={() => setMediaLoading(true)}
                onLoadedMetadata={() => setMediaLoading(false)}
                onCanPlay={() => setMediaLoading(false)}
                onError={() => {
                  setMediaLoading(false);
                  toast.error('Video codec not supported by browser. Try downloading directly.');
                }}
              />
              <div className="absolute bottom-4 left-6 flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-slate-400">Speed:</span>
                <button
                  onClick={togglePlaybackSpeed}
                  className="font-mono font-bold text-blue-400 hover:text-blue-300">
                  {playbackSpeed}x
                </button>
              </div>
            </div>
          )}

          {/* 2. Image Viewer with Zoom & Rotate */}
          {previewType === 'image' && (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              {/* Image Controls Floating Dock */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
                <button
                  onClick={() => setScale((s) => Math.max(s - 0.25, 0.25))}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2 text-slate-300 min-w-[50px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(s + 0.25, 5))}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1" />
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Rotate 90°">
                  <RotateCw className="w-4 h-4" />
                </button>
                {(scale !== 1 || rotation !== 0) && (
                  <button
                    onClick={() => {
                      setScale(1);
                      setRotation(0);
                    }}
                    className="text-[11px] font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1">
                    Reset
                  </button>
                )}
              </div>

              <img
                src={streamUrl}
                alt={file.file_name}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-[82vh] object-contain rounded-md shadow-2xl select-none"
                onLoad={() => setMediaLoading(false)}
                onError={() => {
                  setMediaLoading(false);
                  toast.error('Failed to load image preview');
                }}
              />
            </div>
          )}

          {/* 3. Audio Player */}
          {previewType === 'audio' && (
            <div className="flex flex-col items-center justify-center p-8 max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl">
              <div className="p-6 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg mb-6">
                <Music className="w-16 h-16" />
              </div>
              <h3 className="text-base font-semibold text-center text-slate-100 mb-1 max-w-sm truncate" title={file.file_name}>
                {file.file_name}
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">{formatBytes(file.size)}</p>
              <audio
                src={streamUrl}
                controls
                autoPlay
                className="w-full rounded-lg outline-none bg-slate-800"
              />
            </div>
          )}

          {/* 4. Code & Text Editor / Viewer */}
          {(previewType === 'code' || previewType === 'text') && (
            <div className="w-full h-full max-h-[82vh] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              {/* Code toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-slate-200">{file.file_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWrapLines(!wrapLines)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      wrapLines ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                    Wrap Lines
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyCode}
                    disabled={!codeContent}
                    className="h-7 text-xs gap-1 text-slate-300 hover:text-white">
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              {/* Code content */}
              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200 select-text">
                {codeLoading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span>Loading file contents...</span>
                  </div>
                ) : codeError ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                    <p className="text-rose-400 mb-3">{codeError}</p>
                    {downloadUrl && (
                      <a href={downloadUrl} download={file.file_name} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium">
                        Download to View
                      </a>
                    )}
                  </div>
                ) : (
                  <pre className={`table w-full ${wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                    <code>
                      {(codeContent || '').split('\n').map((line, idx) => (
                        <div key={idx} className="table-row hover:bg-slate-800/50">
                          <span className="table-cell pr-4 text-right select-none text-slate-600 text-[11px] w-10">
                            {idx + 1}
                          </span>
                          <span className="table-cell">{line || ' '}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* 5. PDF Viewer */}
          {previewType === 'pdf' && (
            <div className="w-full h-full max-h-[82vh] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <iframe
                src={streamUrl}
                title={file.file_name}
                className="w-full h-full border-none rounded-xl"
              />
            </div>
          )}

          {/* 6. Other / Unsupported Files (Archive, Office, etc.) */}
          {(previewType === 'unsupported' || previewType === 'archive' || previewType === 'office') && (
            <div className="flex flex-col items-center justify-center p-8 max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl text-center">
              <div className="p-6 rounded-2xl bg-slate-800 text-blue-400 border border-slate-700/60 mb-5 shadow-inner">
                {category?.icon ? <category.icon className="w-14 h-14" /> : <HardDrive className="w-14 h-14" />}
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-1 max-w-sm truncate" title={file.file_name}>
                {file.file_name}
              </h3>
              <p className="text-xs text-slate-400 mb-2 font-mono">
                {file.mime_type || 'application/octet-stream'} · {formatBytes(file.size)}
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Direct in-browser preview is not supported for this file type. Download to open on your device.
              </p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={file.file_name}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg">
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

