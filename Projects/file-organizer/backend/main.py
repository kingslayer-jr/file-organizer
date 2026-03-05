"""
File Organizer AI - Main FastAPI Application
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Optional
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from scanner import FileScanner
from ai_analyzer import AIAnalyzer
from duplicate_detector import DuplicateDetector
from organizer import FileOrganizer

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global instances
scanner: Optional[FileScanner] = None
analyzer: Optional[AIAnalyzer] = None
duplicate_detector: Optional[DuplicateDetector] = None
organizer: Optional[FileOrganizer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize components on startup"""
    global scanner, analyzer, duplicate_detector, organizer

    scanner = FileScanner()
    analyzer = AIAnalyzer(
        gateway_token=os.getenv("GATEWAY_TOKEN"),
        max_batch_size=int(os.getenv("MAX_BATCH_SIZE", "50")),
    )
    duplicate_detector = DuplicateDetector()
    organizer = FileOrganizer()

    logger.info("File Organizer AI initialized (using OpenClaw Gateway)")
    yield

    # Cleanup
    logger.info("Shutting down...")


app = FastAPI(
    title="File Organizer AI",
    description="AI-powered file organization with duplicate detection",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Models
class ScanRequest(BaseModel):
    path: str


class ScanResponse(BaseModel):
    files: List[dict]
    total_files: int
    total_size: int
    extensions: dict


class AnalyzeRequest(BaseModel):
    files: List[dict]


class AnalyzeResponse(BaseModel):
    categories: dict
    suggestions: List[dict]


class DuplicateResponse(BaseModel):
    duplicates: List[List[dict]]
    total_duplicates: int
    wasted_space: int


class OrganizeRequest(BaseModel):
    source_path: str
    organization_plan: dict
    copy_mode: bool = False


class OrganizeResponse(BaseModel):
    success: bool
    operations: List[dict]
    undo_log_path: str
    message: str


class PreviewRequest(BaseModel):
    source_path: str
    categories: dict


class PreviewResponse(BaseModel):
    operations: List[dict]
    new_structure: dict
    stats: dict


class RenameRequest(BaseModel):
    files: List[dict]


class RenameResponse(BaseModel):
    renames: dict  # old_name -> new_name


class PreviewWithRenameRequest(BaseModel):
    source_path: str
    categories: dict
    files: List[dict] = []  # Full file metadata for smart rename
    smart_rename: bool = False


class UndoRequest(BaseModel):
    undo_log_path: str


class RenameOnlyRequest(BaseModel):
    source_path: str
    renames: dict  # old_name -> new_name


class RenameOnlyResponse(BaseModel):
    success: bool
    operations: List[dict]
    undo_log_path: str
    message: str


# Routes
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


class ListDirRequest(BaseModel):
    path: str = "~"


@app.post("/list-dir")
async def list_directory(request: ListDirRequest):
    """List contents of a directory for the folder picker"""
    try:
        path = Path(request.path).expanduser().resolve()

        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")

        if not path.is_dir():
            raise HTTPException(
                status_code=400, detail=f"Path is not a directory: {path}"
            )

        # Security check
        blocked_paths = [
            "/bin",
            "/boot",
            "/dev",
            "/etc",
            "/lib",
            "/proc",
            "/sys",
            "/usr",
            "/sbin",
            "/var",
        ]
        for blocked in blocked_paths:
            if str(path) == blocked or str(path).startswith(blocked + "/"):
                raise HTTPException(
                    status_code=403, detail=f"Access to system directories is blocked"
                )

        items = []
        try:
            for item in sorted(path.iterdir()):
                try:
                    stat = item.stat()
                    items.append(
                        {
                            "name": item.name,
                            "path": str(item),
                            "is_dir": item.is_dir(),
                            "size": stat.st_size if item.is_file() else None,
                        }
                    )
                except (OSError, PermissionError):
                    continue
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")

        return {
            "current_path": str(path),
            "parent_path": str(path.parent) if path.parent != path else None,
            "items": items,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List directory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan", response_model=ScanResponse)
async def scan_folder(request: ScanRequest):
    """Scan a folder and return file metadata"""
    try:
        path = Path(request.path).expanduser().resolve()

        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")

        if not path.is_dir():
            raise HTTPException(
                status_code=400, detail=f"Path is not a directory: {path}"
            )

        # Security check - block system directories (but allow home subdirs)
        blocked_paths = [
            "/bin",
            "/boot",
            "/dev",
            "/etc",
            "/lib",
            "/proc",
            "/sys",
            "/usr",
            "/sbin",
            "/var",
        ]
        for blocked in blocked_paths:
            if str(path) == blocked or str(path).startswith(blocked + "/"):
                raise HTTPException(
                    status_code=403,
                    detail=f"Access to system directories is blocked: {blocked}",
                )

        files = scanner.scan_directory(path)

        return ScanResponse(
            files=files,
            total_files=len(files),
            total_size=sum(f.get("size", 0) for f in files),
            extensions=scanner.get_extension_stats(files),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_files(request: AnalyzeRequest):
    """Analyze files and suggest categories using AI"""
    try:
        categories = await analyzer.suggest_categories(request.files)

        # Create suggestions list
        suggestions = []
        for file_info in request.files:
            file_name = file_info.get("name", "")
            category = categories.get(file_name, "Uncategorized")
            suggestions.append({"file": file_info, "suggested_category": category})

        return AnalyzeResponse(categories=categories, suggestions=suggestions)

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/duplicates", response_model=DuplicateResponse)
async def find_duplicates(request: ScanRequest):
    """Find duplicate files using hash comparison"""
    try:
        path = Path(request.path).expanduser().resolve()
        files = scanner.scan_directory(path)

        duplicates = duplicate_detector.find_duplicates(files)
        wasted_space = sum(sum(d["size"] for d in group[1:]) for group in duplicates)

        return DuplicateResponse(
            duplicates=duplicates,
            total_duplicates=sum(len(group) - 1 for group in duplicates),
            wasted_space=wasted_space,
        )

    except Exception as e:
        logger.error(f"Duplicate detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rename-suggest", response_model=RenameResponse)
async def suggest_renames(request: RenameRequest):
    """Suggest better filenames for messy files using AI"""
    try:
        renames = await analyzer.suggest_renames(request.files)
        return RenameResponse(renames=renames)

    except Exception as e:
        logger.error(f"Rename suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/organize/preview", response_model=PreviewResponse)
async def preview_organization(request: PreviewWithRenameRequest):
    """Preview organization without executing, optionally with smart rename"""
    try:
        source_path = Path(request.source_path).expanduser().resolve()

        # Get rename suggestions if enabled
        renames = {}
        if request.smart_rename and request.files:
            logger.info(f"Smart rename enabled, analyzing {len(request.files)} files")
            renames = await analyzer.suggest_renames(request.files)
            logger.info(f"AI suggested {len(renames)} renames")

        operations = organizer.preview_organization(
            source_path, request.categories, renames=renames
        )

        new_structure = organizer.build_structure_tree(operations)

        stats = {
            "files_to_move": len(operations),
            "categories": len(set(op["target_category"] for op in operations)),
            "renames": len([op for op in operations if op.get("new_name")]),
            "estimated_time": len(operations) * 0.1,
        }

        return PreviewResponse(
            operations=operations, new_structure=new_structure, stats=stats
        )

    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/organize/execute", response_model=OrganizeResponse)
async def execute_organization(request: OrganizeRequest):
    """Execute file organization"""
    try:
        source_path = Path(request.source_path).expanduser().resolve()

        # Debug logging
        operations = request.organization_plan.get("operations", [])
        logger.info(f"Execute organization called with {len(operations)} operations")
        for op in operations[:3]:  # Log first 3
            logger.info(
                f"  Operation: {op.get('filename')} -> target: {op.get('target')}, is_renamed: {op.get('is_renamed')}"
            )

        operations, undo_log_path = await organizer.execute_organization(
            source_path, request.organization_plan, copy_mode=request.copy_mode
        )

        return OrganizeResponse(
            success=True,
            operations=operations,
            undo_log_path=undo_log_path,
            message=f"Successfully organized {len(operations)} files",
        )

    except Exception as e:
        logger.error(f"Organization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rename-only")
async def rename_only(request: RenameOnlyRequest):
    """Rename files in place without organizing into categories"""
    try:
        source_path = Path(request.source_path).expanduser().resolve()

        logger.info(f"Rename-only mode: {len(request.renames)} files")

        operations, undo_log_path = await organizer.execute_rename_only(
            source_path, request.renames
        )

        return RenameOnlyResponse(
            success=True,
            operations=operations,
            undo_log_path=undo_log_path,
            message=f"Successfully renamed {len(operations)} files",
        )

    except Exception as e:
        logger.error(f"Rename-only error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/undo")
async def undo_operation(request: UndoRequest):
    """Undo a previous organization operation"""
    try:
        result = await organizer.undo_organization(request.undo_log_path)
        return {"success": True, "message": result}

    except Exception as e:
        logger.error(f"Undo error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
