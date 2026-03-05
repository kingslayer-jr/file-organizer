import { FileText, Image, Music, Video, Archive, Code, FileSpreadsheet, FileType } from 'lucide-react';
import { FileInfo } from '../types';

interface FileListProps {
  files: FileInfo[];
  categories: Record<string, string>;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (mimeType.startsWith('video/')) return <Video className="w-4 h-4" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-4 h-4" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-4 h-4" />;
  if (mimeType.startsWith('text/')) return <FileText className="w-4 h-4" />;
  if (mimeType.includes('javascript') || mimeType.includes('python') || mimeType.includes('code')) return <Code className="w-4 h-4" />;
  return <FileType className="w-4 h-4" />;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export default function FileList({ files, categories }: FileListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Files ({files.length})</h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">File</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Size</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.map((file) => (
              <tr key={file.path} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{getFileIcon(file.mime_type)}</span>
                    <span className="font-medium text-gray-900 truncate max-w-xs" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-600">{formatBytes(file.size)}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    {categories[file.name] || 'Uncategorized'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
