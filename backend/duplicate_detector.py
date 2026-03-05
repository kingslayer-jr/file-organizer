"""
Duplicate Detector Module - Hash-based duplicate file detection
"""
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """Detects duplicate files using MD5 hashing"""
    
    def __init__(self, chunk_size: int = 8192):
        self.chunk_size = chunk_size
    
    def find_duplicates(self, files: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Find duplicate files using size-first then hash comparison
        Returns groups of duplicate files
        """
        # Group by size first (fast filter)
        size_groups = self._group_by_size(files)
        
        # Only hash files that have same size
        duplicates = []
        for size, file_group in size_groups.items():
            if len(file_group) > 1:
                # Hash comparison within size group
                hash_groups = self._group_by_hash(file_group)
                for file_hash, hash_group in hash_groups.items():
                    if len(hash_group) > 1:
                        duplicates.append(hash_group)
        
        return duplicates
    
    def _group_by_size(self, files: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        """Group files by their size"""
        groups = defaultdict(list)
        for f in files:
            size = f.get("size", 0)
            groups[size].append(f)
        return dict(groups)
    
    def _group_by_hash(self, files: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group files by their MD5 hash"""
        groups = defaultdict(list)
        for f in files:
            file_hash = self._compute_hash(f.get("path", ""))
            if file_hash:
                groups[file_hash].append(f)
        return dict(groups)
    
    def _compute_hash(self, file_path: str) -> str:
        """Compute MD5 hash of a file"""
        try:
            hasher = hashlib.md5()
            with open(file_path, 'rb') as f:
                while chunk := f.read(self.chunk_size):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except (OSError, PermissionError) as e:
            logger.error(f"Failed to hash {file_path}: {e}")
            return ""
    
    def get_duplicate_stats(self, duplicates: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Get statistics about duplicates"""
        total_duplicates = sum(len(group) - 1 for group in duplicates)
        wasted_space = sum(
            sum(f.get("size", 0) for f in group[1:])
            for group in duplicates
        )
        
        return {
            "duplicate_groups": len(duplicates),
            "total_duplicates": total_duplicates,
            "wasted_space": wasted_space,
            "wasted_space_human": self._format_bytes(wasted_space)
        }
    
    @staticmethod
    def _format_bytes(size: int) -> str:
        """Format bytes to human readable"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} PB"
