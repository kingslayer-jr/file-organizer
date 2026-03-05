import { Folder, File } from 'lucide-react';
import { Operation } from '../types';

interface CategoryViewProps {
  structure: Record<string, string[]>;
  operations: Operation[];
}

// Helper to find operation by filename
const findOperation = (operations: Operation[], filename: string): Operation | undefined => {
  return operations.find(op => op.filename === filename || op.new_name === filename);
};

export default function CategoryView({ structure, operations }: CategoryViewProps) {
  const totalFiles = Object.values(structure).reduce((sum, files) => sum + files.length, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Proposed Structure</h3>
        <p className="text-sm text-gray-500">{Object.keys(structure).length} categories • {totalFiles} files</p>
      </div>

      <div className="max-h-96 overflow-y-auto p-4">
        <div className="space-y-3">
          {Object.entries(structure).map(([category, files]) => (
            <div key={category} className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-gray-900">{category}</span>
                <span className="text-xs text-gray-500 ml-auto">{files.length} files</span>
              </div>
              <div className="px-3 py-2">
                <ul className="space-y-1">
                  {files.slice(0, 5).map((filename) => {
                    const op = findOperation(operations, filename);
                    const isRenamed = op?.is_renamed;
                    const originalName = op?.filename;
                    
                    return (
                      <li key={filename} className="flex items-center gap-2 text-sm">
                        <File className="w-3 h-3 text-gray-400" />
                        <span className="truncate flex-1">
                          {isRenamed ? (
                            <>
                              <span className="text-gray-400 line-through text-xs mr-1">{originalName}</span>
                              <span className="text-green-600 font-medium">{filename}</span>
                            </>
                          ) : (
                            <span className="text-gray-600">{filename}</span>
                          )}
                        </span>
                        {isRenamed && (
                          <span className="text-xs text-green-500 bg-green-50 px-1.5 py-0.5 rounded">Renamed</span>
                        )}
                      </li>
                    );
                  })}
                  {files.length > 5 && (
                    <li className="text-xs text-gray-400 pl-5">+{files.length - 5} more files</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
