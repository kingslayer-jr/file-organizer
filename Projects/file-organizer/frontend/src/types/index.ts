export interface FileInfo {
  name: string;
  path: string;
  relative_path: string;
  size: number;
  extension: string;
  mime_type: string;
  created: number;
  modified: number;
  preview?: string;
  parent_dir: string;
}

export interface ScanResult {
  files: FileInfo[];
  total_files: number;
  total_size: number;
  extensions: Record<string, number>;
}

export interface CategorySuggestion {
  file: FileInfo;
  suggested_category: string;
}

export interface AnalyzeResult {
  categories: Record<string, string>;
  suggestions: CategorySuggestion[];
}

export interface DuplicateGroup {
  files: FileInfo[];
}

export interface DuplicateResult {
  duplicates: FileInfo[][];
  total_duplicates: number;
  wasted_space: number;
}

export interface Operation {
  source: string;
  target: string;
  target_category: string;
  filename: string;
  new_name?: string;
  is_renamed?: boolean;
  size: number;
  conflict_resolved: boolean;
}

export interface PreviewResult {
  operations: Operation[];
  new_structure: Record<string, string[]>;
  stats: {
    files_to_move: number;
    categories: number;
    renames?: number;
    estimated_time: number;
  };
}

export interface OrganizeResult {
  success: boolean;
  operations: Operation[];
  undo_log_path: string;
  message: string;
}
