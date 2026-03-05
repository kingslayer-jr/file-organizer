"""
File Scanner Module - Scans directories and extracts file metadata
"""
import os
import mimetypes
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import defaultdict

import magic


class FileScanner:
    """Scans directories and extracts file metadata"""
    
    def __init__(self, preview_length: int = 200):
        self.preview_length = preview_length
        self.mime = magic.Magic(mime=True)
    
    def scan_directory(self, path: Path) -> List[Dict[str, Any]]:
        """
        Recursively scan directory and return file metadata
        """
        files = []
        
        for item in path.rglob("*"):
            if item.is_file():
                file_info = self._get_file_info(item, path)
                if file_info:
                    files.append(file_info)
        
        return files
    
    def _get_file_info(self, file_path: Path, base_path: Path) -> Optional[Dict[str, Any]]:
        """Extract metadata from a single file"""
        try:
            stat = file_path.stat()
            
            # Get MIME type
            try:
                mime_type = self.mime.from_file(str(file_path))
            except:
                mime_type, _ = mimetypes.guess_type(str(file_path))
            
            # Get file extension
            extension = file_path.suffix.lower()
            
            # Get preview for text files
            preview = None
            if mime_type and mime_type.startswith("text/"):
                preview = self._get_text_preview(file_path)
            
            return {
                "name": file_path.name,
                "path": str(file_path),
                "relative_path": str(file_path.relative_to(base_path)),
                "size": stat.st_size,
                "extension": extension,
                "mime_type": mime_type or "application/octet-stream",
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "preview": preview,
                "parent_dir": file_path.parent.name
            }
        
        except (OSError, PermissionError) as e:
            return None
    
    def _get_text_preview(self, file_path: Path) -> Optional[str]:
        """Get first N characters of a text file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read(self.preview_length)
        except:
            return None
    
    def get_extension_stats(self, files: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get count of files by extension"""
        stats = defaultdict(int)
        for f in files:
            ext = f.get("extension", "no_extension")
            stats[ext] += 1
        return dict(stats)
    
    def group_by_extension(self, files: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group files by their extension"""
        groups = defaultdict(list)
        for f in files:
            ext = f.get("extension", "no_extension") or "no_extension"
            groups[ext].append(f)
        return dict(groups)
