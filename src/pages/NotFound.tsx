import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CloudOff, Home, ArrowLeft, LayoutDashboard, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/constants';

interface NotFoundProps {
  title?: string;
  message?: string;
  statusCode?: string | number;
  showBack?: boolean;
}

export default function NotFound({
  title = 'Page Not Found',
  message = "The page or resource you're looking for doesn't exist, has been removed, or the link has expired.",
  statusCode = '404',
  showBack = true,
}: NotFoundProps) {
  const navigate = useNavigate();
  const user = typeof window !== 'undefined' ? getUser() : null;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-6 text-center select-none"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Decorative Glow Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 dark:bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Floating Animated Badge */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white shadow-2xl shadow-purple-500/30 flex items-center justify-center border border-purple-400/30">
            <CloudOff className="w-12 h-12 sm:w-14 sm:h-14 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-gray-900">
            <SearchX className="w-5 h-5" />
          </div>
        </div>

        {/* 404 Large Label */}
        <div className="font-extrabold text-7xl sm:text-8xl tracking-tight bg-gradient-to-r from-purple-600 via-indigo-500 to-teal-400 bg-clip-text text-transparent">
          {statusCode}
        </div>

        {/* Title */}
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {showBack && (
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto h-11 px-5 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}

          {user ? (
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-6 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-medium rounded-xl shadow-lg shadow-purple-600/25 transition-all">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-6 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-medium rounded-xl shadow-lg shadow-purple-600/25 transition-all">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          )}
        </div>

        {/* Footer brand branding */}
        <div className="mt-12 text-xs text-gray-400 dark:text-gray-600">
          CloudVault &bull; Secure Telegram Cloud Storage
        </div>
      </div>
    </div>
  );
}
