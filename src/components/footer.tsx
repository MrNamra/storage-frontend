import { Cloud } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Cloud className="h-7 w-7 text-teal-400" />
            <span className="font-poppins font-bold text-xl text-white">CloudVault</span>
          </div>
          <p className="text-sm text-gray-400 text-center sm:text-right">
            Secure, private cloud storage for all your media and files.
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} CloudVault. All rights reserved.
        </div>
      </div>
    </footer>
  );
}