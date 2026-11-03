/**
 * File type detection utilities inspired by BoxBox
 * Single source of truth for file extensions, mime-types, preview types, and icons
 */

import {
  File,
  FileText,
  FileCode,
  FileArchive,
  Film,
  Music,
  Image as ImageIcon,
  Folder,
} from 'lucide-react';

export type PreviewType =
  | 'video'
  | 'audio'
  | 'image'
  | 'pdf'
  | 'code'
  | 'text'
  | 'archive'
  | 'office'
  | 'unsupported';

export const FILE_EXTENSIONS = {
  video: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'm4v', '3gp', 'ts'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'tif', 'heic'],
  pdf: ['pdf'],
  code: [
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'py', 'go', 'rs', 'java', 'kt', 'scala', 'rb', 'php', 'cs', 'fs',
    'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'json', 'json5', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'sql', 'graphql', 'gql',
    'md', 'markdown', 'mdx',
    'dockerfile', 'makefile'
  ],
  text: ['txt', 'log', 'csv', 'tsv', 'rtf'],
  archive: ['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'tgz'],
  office: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp']
};

export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

export function getPreviewType(filename: string, mimeType?: string): PreviewType {
  const ext = getFileExtension(filename);
  const mime = (mimeType || '').toLowerCase();

  if (mime.startsWith('video/') || FILE_EXTENSIONS.video.includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || FILE_EXTENSIONS.audio.includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('image/') || FILE_EXTENSIONS.image.includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (FILE_EXTENSIONS.code.includes(ext)) {
    return 'code';
  }
  if (mime.startsWith('text/') || FILE_EXTENSIONS.text.includes(ext)) {
    return 'text';
  }
  if (FILE_EXTENSIONS.archive.includes(ext)) {
    return 'archive';
  }
  if (FILE_EXTENSIONS.office.includes(ext)) {
    return 'office';
  }
  return 'unsupported';
}

export function getFileCategoryInfo(filename: string, mimeType?: string) {
  const type = getPreviewType(filename, mimeType);
  switch (type) {
    case 'video':
      return {
        label: 'Video',
        color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        badge: 'bg-rose-600 text-white',
        icon: Film,
      };
    case 'audio':
      return {
        label: 'Audio',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        badge: 'bg-emerald-600 text-white',
        icon: Music,
      };
    case 'image':
      return {
        label: 'Image',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        badge: 'bg-blue-600 text-white',
        icon: ImageIcon,
      };
    case 'pdf':
      return {
        label: 'PDF',
        color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        badge: 'bg-red-600 text-white',
        icon: FileText,
      };
    case 'code':
      return {
        label: 'Code',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        badge: 'bg-purple-600 text-white',
        icon: FileCode,
      };
    case 'text':
      return {
        label: 'Document',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        badge: 'bg-amber-600 text-white',
        icon: FileText,
      };
    case 'archive':
      return {
        label: 'Archive',
        color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        badge: 'bg-indigo-600 text-white',
        icon: FileArchive,
      };
    case 'office':
      return {
        label: 'Office',
        color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        badge: 'bg-cyan-600 text-white',
        icon: FileText,
      };
    default:
      return {
        label: 'File',
        color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        badge: 'bg-slate-600 text-white',
        icon: File,
      };
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

