"""
File Organizer Module - Execute file organization with undo support
"""

import os
import json
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)


class FileOrganizer:
    """Organizes files with preview and undo capabilities"""

    def __init__(self, undo_dir: Optional[str] = None):
        self.undo_dir = (
            Path(undo_dir)
            if undo_dir
            else Path.home() / ".file_organizer" / "undo_logs"
        )
        self.undo_dir.mkdir(parents=True, exist_ok=True)

    def preview_organization(
        self,
        source_path: Path,
        categories: Dict[str, str],
        renames: Dict[str, str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Preview file organization without executing
        Returns list of planned operations
        """
        operations = []
        renames = renames or {}

        for file_name, category in categories.items():
            # Find the file in source directory
            file_path = self._find_file(source_path, file_name)
            if not file_path:
                continue

            # Check if this file should be renamed
            new_name = renames.get(file_name, file_name)
            is_renamed = new_name != file_name

            target_dir = source_path / category
            target_path = target_dir / new_name

            # Handle naming conflicts
            counter = 1
            original_target = target_path
            while target_path.exists() and str(target_path) != str(file_path):
                stem = original_target.stem
                suffix = original_target.suffix
                target_path = target_dir / f"{stem}_{counter}{suffix}"
                counter += 1

            operations.append(
                {
                    "source": str(file_path),
                    "target": str(target_path),
                    "target_category": category,
                    "filename": file_name,
                    "new_name": new_name if is_renamed else None,
                    "is_renamed": is_renamed,
                    "size": file_path.stat().st_size if file_path.exists() else 0,
                    "conflict_resolved": target_path != original_target,
                }
            )

        return operations

    def build_structure_tree(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build a tree representation of the new structure"""
        tree = {}

        for op in operations:
            category = op["target_category"]
            if category not in tree:
                tree[category] = []
            # Show the new filename if renamed, otherwise show original
            display_name = op.get("new_name") or op["filename"]
            tree[category].append(display_name)

        return tree

    async def execute_organization(
        self,
        source_path: Path,
        organization_plan: Dict[str, Any],
        copy_mode: bool = False,
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Execute the organization plan
        Returns (operations_executed, undo_log_path)
        """
        operations = organization_plan.get("operations", [])
        executed = []
        undo_log = {
            "timestamp": datetime.now().isoformat(),
            "source_path": str(source_path),
            "copy_mode": copy_mode,
            "operations": [],
        }

        for op in operations:
            source = Path(op["source"])
            target = Path(op["target"])

            if not source.exists():
                logger.warning(f"Source file not found: {source}")
                continue

            try:
                # Create target directory
                target.parent.mkdir(parents=True, exist_ok=True)

                # Record for undo
                undo_log["operations"].append(
                    {
                        "source": str(source),
                        "target": str(target),
                        "action": "copy" if copy_mode else "move",
                    }
                )

                # Execute
                if copy_mode:
                    shutil.copy2(source, target)
                else:
                    shutil.move(str(source), str(target))

                executed.append(op)
                logger.info(
                    f"{'Copied' if copy_mode else 'Moved'}: {source.name} -> {target}"
                )

            except Exception as e:
                logger.error(f"Failed to organize {source}: {e}")

        # Save undo log
        undo_path = (
            self.undo_dir / f"undo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(undo_path, "w") as f:
            json.dump(undo_log, f, indent=2)

        return executed, str(undo_path)

    async def execute_rename_only(
        self, source_path: Path, renames: Dict[str, str]
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Rename files in place without moving to categories
        Returns (operations_executed, undo_log_path)
        """
        executed = []
        undo_log = {
            "timestamp": datetime.now().isoformat(),
            "source_path": str(source_path),
            "mode": "rename_only",
            "operations": [],
        }

        for old_name, new_name in renames.items():
            # Look for file directly in source directory (not recursively)
            file_path = source_path / old_name
            if not file_path.exists():
                # Try to find it if not in root
                file_path = self._find_file(source_path, old_name)
            if not file_path or not file_path.exists():
                logger.warning(f"File not found: {old_name}")
                continue

            # Build target path (same directory, new name)
            target_path = file_path.parent / new_name

            # Handle naming conflicts
            counter = 1
            original_target = target_path
            while target_path.exists() and target_path != file_path:
                stem = original_target.stem
                suffix = original_target.suffix
                target_path = file_path.parent / f"{stem}_{counter}{suffix}"
                counter += 1

            try:
                # Record for undo
                undo_log["operations"].append(
                    {
                        "source": str(file_path),
                        "target": str(target_path),
                        "action": "rename",
                    }
                )

                # Execute rename
                shutil.move(str(file_path), str(target_path))

                executed.append(
                    {
                        "source": str(file_path),
                        "target": str(target_path),
                        "old_name": old_name,
                        "new_name": new_name,
                    }
                )
                logger.info(f"Renamed: {old_name} -> {new_name}")

            except Exception as e:
                logger.error(f"Failed to rename {old_name}: {e}")

        # Save undo log
        undo_path = (
            self.undo_dir
            / f"undo_rename_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(undo_path, "w") as f:
            json.dump(undo_log, f, indent=2)

        return executed, str(undo_path)

    async def undo_organization(self, undo_log_path: str) -> str:
        """
        Undo a previous organization operation
        """
        undo_path = Path(undo_log_path)

        if not undo_path.exists():
            raise FileNotFoundError(f"Undo log not found: {undo_log_path}")

        with open(undo_path, "r") as f:
            undo_log = json.load(f)

        restored = 0
        for op in undo_log.get("operations", []):
            source = Path(op["source"])
            target = Path(op["target"])
            action = op.get("action", "move")

            try:
                if action == "copy":
                    # Delete the copy
                    if target.exists():
                        target.unlink()
                else:
                    # Move back
                    if target.exists():
                        source.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(target), str(source))

                restored += 1
            except Exception as e:
                logger.error(f"Failed to undo {target}: {e}")

        # Rename undo log to prevent double-undo
        undone_path = undo_path.with_suffix(".undone")
        undo_path.rename(undone_path)

        return f"Restored {restored} files"

    def _find_file(self, source_path: Path, file_name: str) -> Optional[Path]:
        """Find a file by name in source directory"""
        for item in source_path.rglob(file_name):
            if item.is_file():
                return item
        return None

    def list_undo_logs(self) -> List[Dict[str, Any]]:
        """List available undo logs"""
        logs = []
        for log_file in self.undo_dir.glob("undo_*.json"):
            try:
                with open(log_file, "r") as f:
                    data = json.load(f)
                logs.append(
                    {
                        "path": str(log_file),
                        "timestamp": data.get("timestamp"),
                        "source_path": data.get("source_path"),
                        "operation_count": len(data.get("operations", [])),
                    }
                )
            except:
                pass

        return sorted(logs, key=lambda x: x["timestamp"], reverse=True)
