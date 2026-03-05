// PreviewPanel component - No React import needed with React 18+
import { Play, Undo, Copy, AlertCircle, Sparkles, FileEdit, Eye, Loader2, X } from 'lucide-react';
import { Operation } from '../types';

interface PreviewPanelProps {
  operations: Operation[];
  stats: {
    files_to_move: number;
    categories: number;
    renames?: number;
    estimated_time: number;
  };
  copyMode: boolean;
  smartRename: boolean;
  renameOnlyMode: boolean;
  onCopyModeChange: (value: boolean) => void;
  onSmartRenameChange: (value: boolean) => void;
  onRenameOnlyModeChange: (value: boolean) => void;
  onOrganize: () => void;
  onBack: () => void;
  onViewRenames: () => void;
  renameSuggestions: Record<string, string> | null;
  loadingRenames: boolean;
  onCloseRenames: () => void;
  formatBytes: (bytes: number) => string;
}

export default function PreviewPanel({
  operations,
  stats,
  copyMode,
  smartRename,
  renameOnlyMode,
  onCopyModeChange,
  onSmartRenameChange,
  onRenameOnlyModeChange,
  onOrganize,
  onBack,
  onViewRenames,
  renameSuggestions,
  loadingRenames,
  onCloseRenames,
  formatBytes,
}: PreviewPanelProps) {
  const totalSize = operations.reduce((sum, op) => sum + op.size, 0);
  const conflicts = operations.filter(op => op.conflict_resolved).length;
  const renames = operations.filter(op => op.is_renamed).length;
  const renameCount = renameSuggestions ? Object.keys(renameSuggestions).length : 0;

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Ready to Organize</h3>
        <p className="text-gray-500">Review the plan and execute when ready</p>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{operations.length}</p>
            <p className="text-sm text-gray-500">Files to Move</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatBytes(totalSize)}</p>
            <p className="text-sm text-gray-500">Total Size</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
            <p className="text-sm text-gray-500">Categories</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{renames}</p>
            <p className="text-sm text-gray-500">Renames</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{conflicts}</p>
            <p className="text-sm text-gray-500">Conflicts Fixed</p>
          </div>
        </div>

        {/* View Rename Suggestions Button */}
        <div className="flex items-center gap-4 mb-4 p-4 bg-indigo-50 rounded-lg">
          <FileEdit className="w-5 h-5 text-indigo-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">View AI Rename Suggestions</p>
            <p className="text-sm text-gray-500">
              See what names AI suggests before organizing
            </p>
          </div>
          <button
            onClick={onViewRenames}
            disabled={loadingRenames}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px] justify-center"
          >
            {loadingRenames ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">AI thinking...</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                View Suggestions
              </>
            )}
          </button>
        </div>

        {/* AI Processing Note */}
        {loadingRenames && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              🤖 AI is analyzing your files and generating smart rename suggestions. 
              This may take 30-60 seconds depending on the number of files...
            </p>
          </div>
        )}

        {/* Rename Suggestions Panel */}
        {renameSuggestions && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-indigo-900">
                AI Suggested Renames ({renameCount} files)
              </h4>
              <button
                onClick={onCloseRenames}
                className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
            {renameCount > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(renameSuggestions).map(([oldName, newName]) => (
                  <div key={oldName} className="flex items-center gap-3 text-sm bg-white p-2 rounded border border-indigo-100">
                    <span className="text-gray-500 line-through flex-1 truncate">{oldName}</span>
                    <span className="text-indigo-600">→</span>
                    <span className="text-green-700 font-medium flex-1 truncate">{newName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">
                No rename suggestions found. Your filenames look good! 👍
              </p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              💡 Enable &quot;Smart Rename&quot; below to apply these suggestions when organizing
            </p>
          </div>
        )}

        {/* Smart Rename Toggle */}
        <div className="flex items-center gap-4 mb-4 p-4 bg-purple-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={smartRename}
              onChange={(e) => onSmartRenameChange(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <p className="font-medium text-gray-900">🧠 Smart Rename</p>
              <p className="text-sm text-gray-500">
                Use AI to rename messy files like &quot;IMG_1234.jpg&quot; → &quot;Sunset Beach.jpg&quot;
              </p>
            </div>
          </label>
        </div>

        {/* Copy Mode Toggle */}
        <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
          <Copy className="w-5 h-5 text-blue-600" />
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={copyMode}
              onChange={(e) => onCopyModeChange(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-gray-900">Copy instead of Move</p>
              <p className="text-sm text-gray-500">Keep original files in place</p>
            </div>
          </label>
        </div>

        {/* Rename Only Mode Toggle */}
        <div className="flex items-center gap-4 mb-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <FileEdit className="w-5 h-5 text-green-600" />
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={renameOnlyMode}
              onChange={(e) => onRenameOnlyModeChange(e.target.checked)}
              className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <p className="font-medium text-gray-900">📝 Rename Only Mode</p>
              <p className="text-sm text-gray-500">
                Just rename files in place (no moving to folders)
              </p>
            </div>
          </label>
        </div>

        {/* Safety Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Safety First</p>
            <p className="text-sm text-amber-700">
              An undo log will be created so you can revert changes if needed.
              {copyMode
                ? ' Original files will be preserved.'
                : ' Files will be moved (originals deleted after copying).'}
              {smartRename && ' AI will suggest better filenames for messy names.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Undo className="w-4 h-4" />
            Start Over
          </button>

          <button
            onClick={onOrganize}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Play className="w-4 h-4" />
            {copyMode ? 'Copy Files' : 'Organize Files'}
          </button>
        </div>
      </div>
    </div>
  );
}
