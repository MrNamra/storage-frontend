import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Monitor,
  HardDrive,
  Download,
  ShieldCheck,
  FolderSync,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/constants';
import toast from 'react-hot-toast';

interface ConnectDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectDriveModal: React.FC<ConnectDriveModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeOS, setActiveOS] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const user = JSON.parse(getUser() || '{}');
  const userEmail = user?.email || 'your-email@example.com';
  
  // Standard WebDAV base URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3899';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3899';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const webdavUrl = `${origin}/webdav/`;
  const linuxDavUrl = `${isHttps ? 'davs' : 'dav'}://${host}/webdav/`;

  const handleCopy = (text: string, isCommand = false) => {
    navigator.clipboard.writeText(text);
    if (isCommand) {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  const downloadWindowsBat = () => {
    const batContent = `@echo off
title Personal Cloud Drive Mount
echo ========================================================
echo   Mounting Personal Cloud Drive as Letter Z:
echo ========================================================
echo.
echo Server: ${webdavUrl}
echo Username: ${userEmail}
echo.
net use Z: "${webdavUrl}" /user:"${userEmail}" /persistent:yes
if %ERRORLEVEL% EQU 0 (
  echo.
  echo [SUCCESS] Cloud Drive mapped to Z:!
  echo You can now copy and paste files into Z:\\ in Windows Explorer.
  explorer Z:\\
) else (
  echo.
  echo [NOTICE] If prompt asks for credentials, please enter your password.
)
pause
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mount-cloud-drive.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded Windows 1-Click Mount Script');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Mount as Personal OS Drive
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  Native WebDAV
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Access your files directly in Windows Explorer, macOS Finder, or Linux Files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Drive Connection Credentials Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Personal Drive Server URL
              </span>
              <button
                onClick={() => handleCopy(webdavUrl)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-medium">
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
              {webdavUrl}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Drive Username</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{userEmail}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Drive Password</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Your Account Password</span>
              </div>
            </div>
          </div>

          {/* OS Platform Switcher */}
          <div>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
              <button
                onClick={() => setActiveOS('windows')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeOS === 'windows'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}>
                <Monitor className="w-4 h-4" />
                Windows 10 / 11
              </button>
              <button
                onClick={() => setActiveOS('mac')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeOS === 'mac'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}>
                macOS Finder
              </button>
              <button
                onClick={() => setActiveOS('linux')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeOS === 'linux'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}>
                Linux (Files / GVFS)
              </button>
            </div>

            {/* WINDOWS TAB */}
            {activeOS === 'windows' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                      ⚡ Quick Option: 1-Click Batch Script
                    </p>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300">
                      Auto-mounts drive as letter <code className="font-mono font-bold">Z:</code> in Windows Explorer.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={downloadWindowsBat}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg gap-1.5 shrink-0">
                    <Download className="w-3.5 h-3.5" />
                    Download .BAT
                  </Button>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Manual Setup in Windows Explorer:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[12px] leading-relaxed">
                    <li>
                      Open <strong>File Explorer</strong> and click <strong>This PC</strong>.
                    </li>
                    <li>
                      Click the three dots <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">...</code> (or Computer tab) &rarr; select <strong>Map network drive</strong>.
                    </li>
                    <li>
                      Select a Drive Letter (e.g. <strong>Z:</strong>).
                    </li>
                    <li>
                      In the <strong>Folder</strong> box, paste:{' '}
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {webdavUrl}
                      </code>
                    </li>
                    <li>
                      Check <strong>Connect using different credentials</strong> and click <strong>Finish</strong>.
                    </li>
                    <li>
                      Enter your Username (<span className="font-medium text-slate-800 dark:text-white">{userEmail}</span>) and your account Password.
                    </li>
                    <li>
                      🎉 Your Personal Drive is mounted! You can copy-paste photos, videos, and files directly.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* MACOS TAB */}
            {activeOS === 'mac' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Connect via macOS Finder:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[12px] leading-relaxed">
                    <li>
                      Open <strong>Finder</strong>.
                    </li>
                    <li>
                      Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">Cmd + K</kbd> (or click <strong>Go &rarr; Connect to Server...</strong> in top menu).
                    </li>
                    <li>
                      In <strong>Server Address</strong>, enter:{' '}
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {webdavUrl}
                      </code>
                    </li>
                    <li>
                      Click <strong>Connect</strong>.
                    </li>
                    <li>
                      Select <strong>Registered User</strong> and enter:
                      <div className="pl-4 pt-1 space-y-0.5 text-slate-500">
                        <div>Name: <strong className="text-slate-800 dark:text-white">{userEmail}</strong></div>
                        <div>Password: <strong className="text-slate-800 dark:text-white">Your account password</strong></div>
                      </div>
                    </li>
                    <li>
                      Click <strong>Connect</strong>. The drive will appear under <strong>Locations</strong> in Finder sidebar and on your Desktop!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* LINUX TAB */}
            {activeOS === 'linux' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Connect via GNOME Files / Nautilus / Dolphin:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[12px] leading-relaxed">
                    <li>
                      Open <strong>Files</strong> (Nautilus).
                    </li>
                    <li>
                      Click <strong>+ Other Locations</strong> at the bottom of the left sidebar.
                    </li>
                    <li>
                      In the bottom <strong>Connect to Server</strong> bar, enter:
                      <div className="my-1.5 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-blue-600 dark:text-blue-400 flex items-center justify-between">
                        <span>{linuxDavUrl}</span>
                        <button
                          onClick={() => handleCopy(linuxDavUrl)}
                          className="hover:underline text-[10px]">
                          Copy
                        </button>
                      </div>
                    </li>
                    <li>
                      Click <strong>Connect</strong>, enter your account email and password.
                    </li>
                    <li>
                      The drive is mounted directly into your file manager. Copy, paste, and stream your media seamlessly.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Security & Features Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                End-to-End Private & Isolated
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Every file you drag and drop into the mapped drive is encrypted and streamed straight to your personal cloud vault. No third-party sync apps or drivers required.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <Button size="sm" onClick={onClose} className="text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

