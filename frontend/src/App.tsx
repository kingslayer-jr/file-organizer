import { useState, useCallback } from 'react';
import { FolderInput, Sparkles, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import FolderSelector from './components/FolderSelector';
import FileList from './components/FileList';
import CategoryView from './components/CategoryView';
import DuplicateView from './components/DuplicateView';
import PreviewPanel from './components/PreviewPanel';
import { scanFolder, analyzeFiles, findDuplicates, previewOrganization, executeOrganization, suggestRenames, executeRenameOnly } from './utils/api';
import { ScanResult, AnalyzeResult, DuplicateResult, PreviewResult } from './types';

type Step = 'select' | 'scanning' | 'analyzing' | 'duplicates' | 'preview' | 'organizing' | 'complete';

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [selectedPath, setSelectedPath] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [organizeResult, setOrganizeResult] = useState<{ undo_log_path: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState(false);
  const [smartRename, setSmartRename] = useState(false);
  const [renameSuggestions, setRenameSuggestions] = useState<Record<string, string> | null>(null);
  const [loadingRenames, setLoadingRenames] = useState(false);
  const [renameOnlyMode, setRenameOnlyMode] = useState(false);

  const handleFolderSelect = useCallback(async (path: string) => {
    console.log('Starting scan for path:', path);
    setSelectedPath(path);
    setError(null);
    setCurrentStep('scanning');

    try {
      console.log('Calling scanFolder...');
      const result = await scanFolder(path);
      console.log('Scan result:', result);
      setScanResult(result);
      setCurrentStep('analyzing');

      // Auto-analyze after scan
      console.log('Calling analyzeFiles...');
      const analysis = await analyzeFiles(result.files);
      console.log('Analysis result:', analysis);
      setAnalyzeResult(analysis);
      
      // Check for duplicates
      console.log('Calling findDuplicates...');
      const duplicates = await findDuplicates(path);
      console.log('Duplicates result:', duplicates);
      setDuplicateResult(duplicates);
      
      // If no duplicates, generate preview immediately
      if (duplicates.duplicates.length === 0) {
        console.log('No duplicates, generating preview with smartRename:', smartRename);
        const preview = await previewOrganization(path, analysis.categories, smartRename, result.files);
        setPreviewResult(preview);
        setCurrentStep('preview');
      } else {
        setCurrentStep('duplicates');
      }
    } catch (err) {
      console.error('Error in handleFolderSelect:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('select');
    }
  }, [smartRename]);



  const handleSmartRenameToggle = useCallback(async (enabled: boolean) => {
    setSmartRename(enabled);
    
    // Regenerate preview with new smart rename setting
    if (analyzeResult && selectedPath && scanResult && previewResult) {
      try {
        const preview = await previewOrganization(selectedPath, analyzeResult.categories, enabled, scanResult.files);
        setPreviewResult(preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Preview update failed');
      }
    }
  }, [analyzeResult, selectedPath, scanResult, previewResult]);

  const handleViewRenames = useCallback(async () => {
    if (!scanResult) return;
    
    setLoadingRenames(true);
    setError(null);
    
    try {
      const result = await suggestRenames(scanResult.files);
      setRenameSuggestions(result.renames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get rename suggestions');
      setRenameSuggestions(null);
    } finally {
      setLoadingRenames(false);
    }
  }, [scanResult]);

  const handleCloseRenames = useCallback(() => {
    setRenameSuggestions(null);
  }, []);

  const handleOrganize = useCallback(async () => {
    if (!previewResult || !selectedPath) return;
    
    // Debug: Log operations to see if they have new names
    setCurrentStep('organizing');
    
    try {
      let result;
      
      if (renameOnlyMode && renameSuggestions) {
        // Rename only mode - just rename files in place
        console.log('Rename-only mode: renaming', Object.keys(renameSuggestions).length, 'files');
        result = await executeRenameOnly(selectedPath, renameSuggestions);
      } else {
        // Normal organize mode
        result = await executeOrganization(
          selectedPath,
          { operations: previewResult.operations },
          copyMode
        );
      }
      
      setOrganizeResult({ undo_log_path: result.undo_log_path });
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organization failed');
      setCurrentStep('preview');
    }
  }, [previewResult, selectedPath, copyMode, renameOnlyMode, renameSuggestions]);

  const handleReset = useCallback(() => {
    setCurrentStep('select');
    setSelectedPath('');
    setScanResult(null);
    setAnalyzeResult(null);
    setDuplicateResult(null);
    setPreviewResult(null);
    setOrganizeResult(null);
    setError(null);
    setRenameSuggestions(null);
    setLoadingRenames(false);
    setRenameOnlyMode(false);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <FolderInput className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">File Organizer AI</h1>
              <p className="text-sm text-gray-500">Smart file organization with AI-powered categorization</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Folder Selection */}
        {currentStep === 'select' && (
          <FolderSelector onSelect={handleFolderSelect} />
        )}

        {/* Scanning Progress */}
        {(currentStep === 'scanning' || currentStep === 'analyzing') && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <Sparkles className="w-8 h-8 text-primary-600 animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentStep === 'scanning' ? 'Scanning files...' : 'Analyzing with AI...'}
            </h2>
            <p className="text-gray-500 mt-2">
              {currentStep === 'scanning' 
                ? 'Reading file metadata and extracting information...'
                : 'Using AI to suggest optimal categories...'}
            </p>
          </div>
        )}

        {/* Step 2: Duplicates Check */}
        {currentStep === 'duplicates' && duplicateResult && analyzeResult && scanResult && (
          <DuplicateView 
            duplicates={duplicateResult}
            categories={analyzeResult.categories}
            selectedPath={selectedPath}
            smartRename={smartRename}
            files={scanResult.files}
            onPreview={(preview) => {
              setPreviewResult(preview);
              setCurrentStep('preview');
            }}
            formatBytes={formatBytes}
          />
        )}

        {/* Step 3: Preview */}
        {currentStep === 'preview' && previewResult && analyzeResult && scanResult && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">{scanResult.total_files}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">{formatBytes(scanResult.total_size)}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{previewResult.stats.categories}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Files to Move</p>
                <p className="text-2xl font-bold text-gray-900">{previewResult.stats.files_to_move}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File List */}
              <FileList 
                files={scanResult.files.slice(0, 100)} 
                categories={analyzeResult.categories}
              />

              {/* Category View */}
              <CategoryView 
                structure={previewResult.new_structure}
                operations={previewResult.operations}
              />
            </div>

            {/* Action Panel */}
            <PreviewPanel
              operations={previewResult.operations}
              stats={previewResult.stats}
              copyMode={copyMode}
              smartRename={smartRename}
              renameOnlyMode={renameOnlyMode}
              onCopyModeChange={setCopyMode}
              onSmartRenameChange={handleSmartRenameToggle}
              onRenameOnlyModeChange={setRenameOnlyMode}
              onOrganize={handleOrganize}
              onBack={handleReset}
              onViewRenames={handleViewRenames}
              renameSuggestions={renameSuggestions}
              loadingRenames={loadingRenames}
              onCloseRenames={handleCloseRenames}
              formatBytes={formatBytes}
            />
          </>
        )}

        {/* Organizing Progress */}
        {currentStep === 'organizing' && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {renameOnlyMode ? 'Renaming files...' : 'Organizing files...'}
            </h2>
            <p className="text-gray-500 mt-2">
              {renameOnlyMode 
                ? 'Applying new filenames to your files...' 
                : 'Moving files to their new locations...'}
            </p>
          </div>
        )}

        {/* Complete */}
        {currentStep === 'complete' && organizeResult && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Organization Complete!</h2>
            <p className="text-gray-500 mt-2">Your files have been organized successfully.</p>
            
            {organizeResult.undo_log_path && (
              <p className="text-sm text-gray-400 mt-4">
                Undo log saved to: {organizeResult.undo_log_path}
              </p>
            )}

            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Organize Another Folder
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
