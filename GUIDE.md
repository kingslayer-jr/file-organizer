# File Organizer AI - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [How It Works](#how-it-works)
5. [User Flow](#user-flow)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**File Organizer AI** is an intelligent file management web application that uses AI to automatically organize messy folders. It categorizes files by type, detects duplicates, and can even rename files with descriptive names.

### Tech Stack
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   AI Service    │
│   React + Vite  │◀────│   FastAPI       │◀────│   OpenAI API    │
│   TypeScript    │     │   Python        │     │   Compatible    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Features

### 1. 📁 Smart Folder Selection
- **Manual Path Entry**: Type any folder path (supports `~` for home directory)
- **Visual Browser**: Browse folders with a click-through interface
- **Security**: Blocks system directories (`/bin`, `/etc`, `/sys`, etc.)

### 2. 🔍 File Scanning
- Recursively scans all files in selected folder
- Extracts metadata:
  - File name and extension
  - Size
  - MIME type
  - Creation/modification dates
  - Content preview (for text files)

### 3. 🧠 AI-Powered Categorization
Automatically groups files into categories:
- **Documents** (PDF, Word, TXT, MD)
- **Images** (JPG, PNG, GIF, SVG)
- **Videos** (MP4, AVI, MOV, MKV)
- **Audio** (MP3, WAV, FLAC, AAC)
- **Archives** (ZIP, RAR, 7Z, TAR)
- **Code** (PY, JS, TS, HTML, CSS)
- **Data** (JSON, XML, CSV, YAML)
- **Presentations** (PPT, PPTX, KEY)
- **Spreadsheets** (XLS, XLSX, CSV)
- **Ebooks** (EPUB, MOBI, AZW)
- **Design** (PSD, AI, SKETCH, FIG)
- **Executables** (EXE, MSI, APP, DMG)

### 4. 🎯 Smart Rename (AI Feature)
Transforms messy filenames into descriptive ones:

```
Before                          After
─────────────────────────────────────────────────────
IMG_20240203_123456.jpg    →   Sunset Beach Vacation.jpg
screenshot_123.png         →   Dashboard Settings Page.png
document_final_v2.pdf      →   Project Proposal Q4 2024.pdf
file (1).txt               →   Meeting Notes.txt
DSC_0001.JPG               →   Mountain Landscape.jpg
```

**How it works:**
1. Detects patterns like `IMG_*`, `DSC_*`, `screenshot_*`, numbers in parentheses
2. Analyzes file content (for text files) or type
3. Uses AI to generate human-readable names
4. Preserves file extensions

### 5. 🔎 Duplicate Detection
- Uses MD5 hashing for 100% accuracy
- Groups identical files together
- Shows wasted space
- Allows selective deletion

```
Duplicate Group Example:
┌─────────────────────────────────────────┐
│ Group 1 • 2.5 MB each                   │
│ ✅ Keep:    vacation.jpg                │
│ ⬜ Delete:  vacation_copy.jpg           │
│ ⬜ Delete:  vacation (1).jpg            │
└─────────────────────────────────────────┘
```

### 6. 👁️ Preview Mode
See exactly what will happen before executing:
- Source → Target mapping
- New folder structure
- Renamed files (old vs new name)
- Stats: files to move, categories, renames

### 7. 🛡️ Safety Features
- **Undo Support**: Every operation creates an undo log
- **Copy Mode**: Copy files instead of moving (keeps originals)
- **Conflict Resolution**: Auto-renames if target exists
- **Preview First**: Must review before executing

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Port 5173)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  React UI   │  │  API Client │  │  State Management   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ API Calls (/api/*)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Port 8000)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    FastAPI App                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│  │  │  Scan    │ │ Categorize│ │ Duplicate│ │ Rename  │ │   │
│  │  │  Router  │ │  Router   │ │  Router  │ │ Router  │ │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │   │
│  │       └─────────────┴─────────────┴────────────┘     │   │
│  │                        │                             │   │
│  │                        ▼                             │   │
│  │              ┌──────────────────┐                   │   │
│  │              │   AI Analyzer    │                   │   │
│  │              │  (OpenAI API)    │                   │   │
│  │              └──────────────────┘                   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ File System
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Local File System                        │
│           (Organized folders + Undo logs)                    │
└─────────────────────────────────────────────────────────────┘
```

### Backend Module Structure

```
backend/
│
├── main.py              # FastAPI app, routes, request handlers
├── scanner.py           # File scanning and metadata extraction
├── ai_analyzer.py       # AI categorization and rename logic
├── duplicate_detector.py # MD5-based duplicate detection
├── organizer.py         # File operations with undo support
└── requirements.txt     # Python dependencies
```

#### Module Responsibilities

**scanner.py**
- Recursively walk directories
- Extract file metadata (size, dates, MIME type)
- Read text file previews
- Group files by extension

**ai_analyzer.py**
- Categorize files using AI (with extension fallback)
- Suggest better filenames for messy names
- Batch processing to save tokens
- Cache results for performance

**duplicate_detector.py**
- MD5 hash computation
- Size-first filtering (optimization)
- Group files by hash
- Calculate wasted space

**organizer.py**
- Preview organization (no actual moves)
- Execute file moves/copies
- Handle naming conflicts
- Create and apply undo logs

### Frontend Component Structure

```
frontend/src/
│
├── App.tsx                 # Main app, state management
├── components/
│   ├── FolderSelector.tsx  # Folder input + browser
│   ├── FileList.tsx        # Display scanned files
│   ├── CategoryView.tsx    # Show proposed structure
│   ├── DuplicateView.tsx   # Handle duplicates
│   └── PreviewPanel.tsx    # Final review + execute
├── utils/
│   └── api.ts             # API client functions
└── types/
    └── index.ts           # TypeScript interfaces
```

---

## How It Works

### 1. File Scanning Process

```
User selects folder
        │
        ▼
┌───────────────┐
│  POST /scan   │
└───────┬───────┘
        │
        ▼
┌─────────────────────────────┐
│  scanner.scan_directory()   │
│  - Walks folder tree        │
│  - Gets file stats          │
│  - Detects MIME types       │
│  - Reads text previews      │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  Returns FileInfo[]         │
│  [                          │
│    {                        │
│      name: "doc.pdf",       │
│      size: 1024000,         │
│      mime_type: "pdf",      │
│      preview: null          │
│    },                       │
│    ...                      │
│  ]                          │
└─────────────────────────────┘
```

### 2. AI Categorization Flow

```
Files from scanner
        │
        ▼
┌──────────────────────────────┐
│  ai_analyzer.suggest_        │
│  categories(files)           │
│                              │
│  1. Check extension mapping  │
│     (fast, no API call)      │
│                              │
│  2. For unknown files:       │
│     - Batch 50 files         │
│     - Send to AI:            │
│       "doc.pdf|ext:.pdf"     │
│                              │
│  3. Parse AI response:       │
│     {"doc.pdf": "Documents"} │
│                              │
│  4. Cache results            │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Categories assigned         │
│  {                           │
│    "doc.pdf": "Documents",   │
│    "img.jpg": "Images",      │
│    ...                       │
│  }                           │
└──────────────────────────────┘
```

### 3. Smart Rename Flow

```
User enables Smart Rename
            │
            ▼
┌─────────────────────────────┐
│ POST /organize/preview      │
│ with smart_rename=true      │
│ and files[]                 │
└───────────┬─────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ ai_analyzer.suggest_renames()│
│                              │
│ 1. Filter messy names:       │
│    - IMG_* patterns          │
│    - screenshot_*            │
│    - *_123, file(1).ext      │
│                              │
│ 2. Build AI prompt:          │
│    "Current: IMG_1234.jpg"   │
│    "Content preview: ..."    │
│                              │
│ 3. AI suggests:              │
│    "Sunset Beach.jpg"        │
│                              │
│ 4. Return rename map:        │
│    {                         │
│      "IMG_1234.jpg":         │
│        "Sunset Beach.jpg"    │
│    }                         │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Preview shows rename:        │
│ IMG_1234.jpg →               │
│ Sunset Beach.jpg             │
└──────────────────────────────┘
```

### 4. Duplicate Detection Flow

```
Files from scanner
        │
        ▼
┌─────────────────────────────┐
│ duplicate_detector.         │
│ find_duplicates(files)      │
│                             │
│ Step 1: Group by size       │
│   (fast filter)             │
│                             │
│ Step 2: For same-size files │
│   - Compute MD5 hash        │
│   - Group by hash           │
│                             │
│ Step 3: Return groups       │
│   of 2+ identical files     │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ [                           │
│   [                         │
│     {name: "a.jpg", hash},  │
│     {name: "a_copy.jpg"}    │
│   ],                        │
│   [                         │
│     {name: "b.pdf"},        │
│     {name: "b (1).pdf"}     │
│   ]                         │
│ ]                           │
└─────────────────────────────┘
```

### 5. Organization Execution Flow

```
User clicks "Organize Files"
            │
            ▼
┌─────────────────────────────┐
│ POST /organize/execute      │
│ with operations[]           │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ organizer.execute_          │
│ organization()              │
│                             │
│ 1. Create undo_log.json     │
│   (records all moves)       │
│                             │
│ 2. For each operation:      │
│   - Create target dir       │
│   - Move/copy file          │
│   - Log to undo             │
│                             │
│ 3. Return results           │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ Files organized!            │
│ Undo log saved to:          │
│ ~/.file_organizer/          │
│   undo_20240302_143022.json │
└─────────────────────────────┘
```

---

## User Flow

### Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        START                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. SELECT FOLDER                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ • Type path or click Browse                         │    │
│  │ • Navigate through folders                          │    │
│  │ • Click "Start Scanning"                            │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SCANNING                                                │
│     (Reading file metadata...)                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. AI ANALYZING                                            │
│     (Categorizing files with AI...)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. DUPLICATE CHECK                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Found duplicates?                                   │    │
│  │                                                     │    │
│  │ YES → Show duplicates, select for deletion          │    │
│  │ NO  → Skip to preview                               │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. PREVIEW                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [ ] Copy instead of Move (keep originals)           │    │
│  │ [✓] Smart Rename (AI rename messy files)            │    │
│  │                                                     │    │
│  │ Stats:                                              │    │
│  │ • 150 files to move                                 │    │
│  │ • 12 categories                                     │    │
│  │ • 23 renames                                        │    │
│  │                                                     │    │
│  │ [Show Preview Details]                              │    │
│  │                                                     │    │
│  │ [Organize Files] [Start Over]                       │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. EXECUTING                                               │
│     (Moving files to new locations...)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  7. COMPLETE                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ✅ Organization Complete!                           │    │
│  │                                                     │    │
│  │ Undo log: ~/.file_organizer/undo_xxx.json           │    │
│  │                                                     │    │
│  │ [Organize Another Folder]                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Endpoints

#### `GET /health`
Check if server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-02T12:00:00"
}
```

#### `POST /scan`
Scan a folder for files.

**Request:**
```json
{
  "path": "/home/user/Downloads"
}
```

**Response:**
```json
{
  "files": [
    {
      "name": "document.pdf",
      "path": "/home/user/Downloads/document.pdf",
      "size": 1024000,
      "extension": ".pdf",
      "mime_type": "application/pdf"
    }
  ],
  "total_files": 150,
  "total_size": 524288000,
  "extensions": {".pdf": 10, ".jpg": 50}
}
```

#### `POST /analyze`
Get AI category suggestions for files.

**Request:**
```json
{
  "files": [{"name": "doc.pdf", "extension": ".pdf", ...}]
}
```

**Response:**
```json
{
  "categories": {
    "doc.pdf": "Documents",
    "photo.jpg": "Images"
  }
}
```

#### `POST /duplicates`
Find duplicate files.

**Request:**
```json
{
  "path": "/home/user/Downloads"
}
```

**Response:**
```json
{
  "duplicates": [
    [{"name": "a.jpg", ...}, {"name": "a_copy.jpg", ...}]
  ],
  "total_duplicates": 5,
  "wasted_space": 10485760
}
```

#### `POST /organize/preview`
Preview organization without executing.

**Request:**
```json
{
  "source_path": "/home/user/Downloads",
  "categories": {"doc.pdf": "Documents"},
  "files": [{"name": "doc.pdf", ...}],
  "smart_rename": true
}
```

**Response:**
```json
{
  "operations": [
    {
      "source": "/home/user/Downloads/doc.pdf",
      "target": "/home/user/Downloads/Documents/doc.pdf",
      "filename": "doc.pdf",
      "is_renamed": false
    }
  ],
  "new_structure": {
    "Documents": ["doc.pdf"]
  },
  "stats": {
    "files_to_move": 150,
    "categories": 12,
    "renames": 23
  }
}
```

#### `POST /organize/execute`
Execute the organization.

**Request:**
```json
{
  "source_path": "/home/user/Downloads",
  "organization_plan": {"operations": [...]},
  "copy_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "operations": [...],
  "undo_log_path": "/home/user/.file_organizer/undo_xxx.json",
  "message": "Successfully organized 150 files"
}
```

#### `POST /undo`
Undo a previous operation.

**Request:**
```json
{
  "undo_log_path": "/home/user/.file_organizer/undo_xxx.json"
}
```

---

## Configuration

### Environment Variables (Backend)

Create a `.env` file in the `backend/` folder:

```bash
# AI Provider (OpenAI-compatible)
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1  # Or your custom endpoint
AI_MODEL=gpt-4o-mini

# App Settings
MAX_BATCH_SIZE=50          # Files per AI batch call
PREVIEW_LENGTH=200         # Characters of text file to read
LOG_LEVEL=INFO             # DEBUG, INFO, WARNING, ERROR
```

### Frontend Configuration

The frontend uses Vite. Configuration is in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

---

## Troubleshooting

### Common Issues

#### "Cannot connect to server"
- Check if backend is running: `curl http://localhost:8000/health`
- Check if port 8000 is available
- Check firewall settings

#### "AI not working / No renames suggested"
- Verify `AI_API_KEY` is set in `.env`
- Check backend logs: `tail -f /tmp/backend.log`
- Ensure files actually have messy names (IMG_*, screenshot_*, etc.)

#### "White screen after scanning"
- Check browser console (F12 → Console)
- Verify frontend is running: `curl http://localhost:5173`
- Restart both servers

#### "Permission denied"
- The app blocks system directories for safety
- Make sure you have read/write permissions on target folder
- Run with appropriate user permissions

### Debug Mode

Enable debug logging in backend:

```bash
LOG_LEVEL=DEBUG uvicorn main:app --reload
```

### Undo Operations

If something goes wrong, you can undo:

```bash
# Find undo logs
ls ~/.file_organizer/undo_*.json

# The app provides an undo button in the UI
# Or call the API directly:
curl -X POST http://localhost:8000/undo \
  -H "Content-Type: application/json" \
  -d '{"undo_log_path": "/home/user/.file_organizer/undo_xxx.json"}'
```

---

## Performance Notes

### Token Efficiency
- Files are batched (50 per API call by default)
- Extension mapping is cached (no API call for known types)
- Text file previews limited to 200 characters

### Speed
- Scanning: ~1000 files/second (depends on disk speed)
- AI categorization: ~50 files/second (API dependent)
- Duplicate detection: ~500 files/second (MD5 hashing)
- Organization execution: ~100 files/second (disk I/O)

---

## Security Considerations

1. **No system directories**: Blocks `/bin`, `/etc`, `/sys`, etc.
2. **Local only**: Runs on localhost by default
3. **Undo logs**: Stored in `~/.file_organizer/`
4. **API keys**: Never exposed to frontend, stored in `.env`

---

## Future Enhancements

Potential features to add:
- [ ] Cloud storage support (Google Drive, Dropbox)
- [ ] Custom category rules
- [ ] Schedule automatic organization
- [ ] File content search
- [ ] Image recognition for photo tagging
- [ ] Duplicate preview thumbnails
- [ ] Multi-language support

---

## License

This project is open source. Modify and use as needed.

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the fix summary in `FIX_SUMMARY.md`
3. Check backend logs at `/tmp/backend.log`
