import axios from 'axios';
import { ScanResult, AnalyzeResult, DuplicateResult, PreviewResult, OrganizeResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.detail || error.response.statusText || 'Server error';
      throw new Error(`Server error: ${message}`);
    } else if (error.request) {
      // Request made but no response
      throw new Error('Cannot connect to server. Is the backend running?');
    } else {
      // Something else happened
      throw new Error(error.message || 'Unknown error');
    }
  }
);

export const scanFolder = async (path: string): Promise<ScanResult> => {
  console.log('API: scanFolder called with path:', path);
  const response = await api.post('/scan', { path });
  console.log('API: scanFolder response:', response.data);
  return response.data;
};

export const analyzeFiles = async (files: any[]): Promise<AnalyzeResult> => {
  console.log('API: analyzeFiles called with', files.length, 'files');
  const response = await api.post('/analyze', { files });
  return response.data;
};

export const findDuplicates = async (path: string): Promise<DuplicateResult> => {
  console.log('API: findDuplicates called with path:', path);
  const response = await api.post('/duplicates', { path });
  return response.data;
};

export const previewOrganization = async (
  sourcePath: string,
  categories: Record<string, string>,
  smartRename: boolean = false,
  files: any[] = []
): Promise<PreviewResult> => {
  // Increase timeout when smart rename is enabled (AI processing takes longer)
  const timeout = smartRename ? 120000 : 30000;
  const response = await api.post('/organize/preview', {
    source_path: sourcePath,
    categories,
    files,
    smart_rename: smartRename,
  }, { timeout });
  return response.data;
};

export const executeOrganization = async (
  sourcePath: string,
  organizationPlan: any,
  copyMode: boolean = false
): Promise<OrganizeResult> => {
  // Increase timeout for file operations (copying/moving many files can take time)
  const response = await api.post('/organize/execute', {
    source_path: sourcePath,
    organization_plan: organizationPlan,
    copy_mode: copyMode,
  }, { timeout: 120000 });
  return response.data;
};

export const undoOperation = async (undoLogPath: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/undo', { undo_log_path: undoLogPath });
  return response.data;
};

export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await api.get('/health');
  return response.data;
};

export const suggestRenames = async (files: any[]): Promise<{ renames: Record<string, string> }> => {
  console.log('API: suggestRenames called with', files.length, 'files');
  // Increase timeout to 2 minutes for AI processing
  const response = await api.post('/rename-suggest', { files }, { timeout: 120000 });
  return response.data;
};

export const executeRenameOnly = async (
  sourcePath: string,
  renames: Record<string, string>
): Promise<{ success: boolean; operations: any[]; undo_log_path: string; message: string }> => {
  console.log('API: executeRenameOnly called with', Object.keys(renames).length, 'renames');
  const response = await api.post('/rename-only', { source_path: sourcePath, renames }, { timeout: 120000 });
  return response.data;
};

export const listDirectory = async (path: string = "~"): Promise<{
  current_path: string;
  parent_path: string | null;
  items: Array<{ name: string; path: string; is_dir: boolean; size: number | null }>;
}> => {
  const response = await api.post('/list-dir', { path });
  return response.data;
};
