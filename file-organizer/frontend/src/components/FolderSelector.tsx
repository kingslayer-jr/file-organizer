import { useState } from 'react';
import { Folder, ArrowRight, ChevronLeft, Home, FolderOpen, RefreshCw } from 'lucide-react';
import { listDirectory } from '../utils/api';

interface FolderSelectorProps {
  onSelect: (path: string) => void;
}

interface DirItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
}

export default function FolderSelector({ onSelect }: FolderSelectorProps) {
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<DirItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDirectory = async (dirPath: string = '~') => {
    setLoading(true);
    try {
      const result = await listDirectory(dirPath);
      setCurrentPath(result.current_path);
      setItems(result.items.filter(item => item.is_dir)); // Only show folders
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const openBrowser = () => {
    setShowBrowser(true);
    loadDirectory('~');
  };

  const navigateTo = (item: DirItem) => {
    if (item.is_dir) {
      loadDirectory(item.path);
    }
  };

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parent);
  };

  const selectCurrentFolder = () => {
    setPath(currentPath);
    setShowBrowser(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!path.trim()) {
      setError('Please select or enter a folder path');
      return;
    }

    onSelect(path.trim());
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <Folder className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Folder</h2>
          <p className="text-gray-500">Choose the folder you want to organize</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="path" className="block text-sm font-medium text-gray-700 mb-1">
              Folder Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/home/user/Downloads or ~/Documents"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={openBrowser}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium whitespace-nowrap"
              >
                📁 Browse
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Supports ~ for home directory • Or click Browse to explore
            </p>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Start Scanning
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-medium">1.</span>
              Scan all files and extract metadata
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-medium">2.</span>
              AI analyzes files and suggests categories
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-medium">3.</span>
              Detect and show duplicate files
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-medium">4.</span>
              Preview organization before applying
            </li>
          </ul>
        </div>
      </div>

      {/* Folder Browser Modal */}
      {showBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <button
                onClick={navigateUp}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                title="Go up"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => loadDirectory('~')}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="flex-1 px-3 py-1.5 bg-gray-100 rounded text-sm font-mono truncate">
                {currentPath}
              </div>
              <button
                onClick={() => setShowBrowser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No folders found
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigateTo(item)}
                      onDoubleClick={() => navigateTo(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                    >
                      <FolderOpen className="w-5 h-5 text-amber-500" />
                      <span className="flex-1 truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowBrowser(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={selectCurrentFolder}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Select This Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
