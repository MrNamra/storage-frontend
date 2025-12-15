'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MoreVertical,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Share2,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const files = [
  {
    id: 1,
    name: 'project-proposal.pdf',
    type: 'pdf',
    size: '2.4 MB',
    modified: '2024-03-15',
  },
  {
    id: 2,
    name: 'presentation.pptx',
    type: 'pptx',
    size: '5.8 MB',
    modified: '2024-03-14',
  },
  {
    id: 3,
    name: 'screenshot.png',
    type: 'image',
    size: '1.2 MB',
    modified: '2024-03-13',
  },
];

export function FileList() {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'image':
        return ImageIcon;
      default:
        return File;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 divide-y">
        {files.map((file, index) => {
          const FileIcon = getFileIcon(file.type);
          
          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileIcon className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {file.size} • Modified {file.modified}
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none">
                    <MoreVertical className="h-5 w-5 text-gray-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}