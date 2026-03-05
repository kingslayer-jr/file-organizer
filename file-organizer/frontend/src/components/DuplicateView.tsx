import { useState } from 'react';
import { Trash2, AlertTriangle, ArrowRight, FileX } from 'lucide-react';
import { DuplicateResult, PreviewResult } from '../types';
import { previewOrganization } from '../utils/api';

interface DuplicateViewProps {
  duplicates: DuplicateResult;
  categories: Record<string, string>;
  selectedPath: string;
  smartRename: boolean;
  files: any[];
  onPreview: (preview: PreviewResult) => void;
  formatBytes: (bytes: number) => string;
}

export default function DuplicateView({ duplicates, categories, selectedPath, smartRename, files, onPreview, formatBytes }: DuplicateViewProps) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleSelection = (path: string) => {
    const newSet = new Set(selectedForDeletion);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedForDeletion(newSet);
  };

  const handleDelete = () => {
    alert(`Would delete ${selectedForDeletion.size} files. (Demo mode)`);
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const preview = await previewOrganization(selectedPath, categories, smartRename, files);
      onPreview(preview);
    } catch (err) {
      alert('Failed to generate preview: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Duplicate Files Found</h2>
              <p className="text-gray-600">
                Found {duplicates.total_duplicates} duplicate files wasting {formatBytes(duplicates.wasted_space)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {duplicates.duplicates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileX className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No duplicates found!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {duplicates.duplicates.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Group {groupIndex + 1} • {formatBytes(group[0]?.size || 0)} each
                  </p>
                  <div className="space-y-2">
                    {group.map((file, fileIndex) => (
                      <div
                        key={file.path}
                        className={`flex items-center gap-3 p-2 rounded-lg border ${
                          fileIndex === 0
                            ? 'bg-green-50 border-green-200'
                            : selectedForDeletion.has(file.path)
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedForDeletion.has(file.path)}
                          onChange={() => toggleSelection(file.path)}
                          disabled={fileIndex === 0}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 truncate">{file.path}</p>
                        </div>
                        {fileIndex === 0 && (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                            Keep
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              {selectedForDeletion.size > 0 && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedForDeletion.size})
                </button>
              )}
            </div>

            <button
              onClick={handleContinue}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  Continue to Organization
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
