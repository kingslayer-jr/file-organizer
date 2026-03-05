# File Organizer AI - Visual Flow Diagrams

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    FILE ORGANIZER AI FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SELECT FOLDER                                               │
│     └── User picks folder via input or browser                  │
│                                                                 │
│  2. SCAN (Scanner Module)                                       │
│     └── Read all files → Extract metadata (size, type, dates)   │
│                                                                 │
│  3. CATEGORIZE (AI Analyzer)                                    │
│     └── Extension check → AI analysis → Assign categories       │
│                                                                 │
│  4. DUPLICATE CHECK (Duplicate Detector)                        │
│     └── Size filter → MD5 hash → Group identical files          │
│                                                                 │
│  5. PREVIEW (Organizer Module)                                  │
│     └── Smart Rename? → AI suggests names → Show plan           │
│                                                                 │
│  6. EXECUTE (Organizer Module)                                  │
│     └── Create undo log → Move/copy files → Complete            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
User Interface
     │
     ├──▶ FolderSelector ──▶ POST /scan ──┐
     │                                      │
     ├──▶ Scan Results ◀───────────────────┤
     │                                      │
     ├──▶ AI Analysis ◀──── POST /analyze ─┤
     │                                      │
     ├──▶ Duplicate Check ◀─ POST /duplicates
     │                                      │
     ├──▶ Preview ◀─────── POST /organize/preview
     │                                      │
     └──▶ Execute ─────────▶ POST /organize/execute
                                │
                                ▼
                    ┌───────────────────────┐
                    │   File System         │
                    │   - Move files        │
                    │   - Create folders    │
                    │   - Write undo log    │
                    └───────────────────────┘
```

## Smart Rename Decision Tree

```
File Name Matches Pattern?
        │
        ├── YES ──▶ Messy Name Detected
        │                │
        │                ├──▶ Send to AI
        │                │       │
        │                │       └──▶ AI Suggests New Name
        │                │               │
        │                │               └──▶ Preview: Old → New
        │                │
        │                └──▶ User Approves?
        │                        │
        │                        ├── YES ──▶ Rename on Execute
        │                        │
        │                        └── NO ───▶ Keep Original Name
        │
        └── NO ───▶ Good Name ──▶ Keep As Is

Pattern Examples:
- IMG_\d+ (IMG_1234.jpg)
- DSC_\d+ (DSC_0001.jpg)
- screenshot[_-]?\d* (screenshot_1.png)
- file[_-]?\d+ (file_1.txt)
- .*\(\d+\).* (file (1).pdf)
- \d{8}_\d{6} (20240203_123456.jpg)
```

## Category Assignment Logic

```
File Extension
      │
      ├── .pdf, .doc, .docx ────────────▶ Documents
      │
      ├── .jpg, .png, .gif, .svg ────────▶ Images
      │
      ├── .mp4, .avi, .mov, .mkv ────────▶ Videos
      │
      ├── .mp3, .wav, .flac, .aac ───────▶ Audio
      │
      ├── .zip, .rar, .7z, .tar ─────────▶ Archives
      │
      ├── .py, .js, .ts, .html, .css ────▶ Code
      │
      ├── .json, .xml, .csv, .yaml ──────▶ Data
      │
      ├── .ppt, .pptx, .key ─────────────▶ Presentations
      │
      ├── .xls, .xlsx, .numbers, .ods ───▶ Spreadsheets
      │
      ├── .epub, .mobi, .azw ────────────▶ Ebooks
      │
      ├── .psd, .ai, .sketch, .fig ──────▶ Design
      │
      ├── .exe, .msi, .app, .dmg ────────▶ Executables
      │
      └── Unknown ───▶ Send to AI ────▶ AI suggests category
```

## State Management Flow

```
React State (App.tsx)
        │
        ├── selectedPath: string
        │       └── User's chosen folder
        │
        ├── scanResult: ScanResult
        │       └── Files found + metadata
        │
        ├── analyzeResult: AnalyzeResult
        │       └── AI categories per file
        │
        ├── duplicateResult: DuplicateResult
        │       └── Groups of duplicate files
        │
        ├── previewResult: PreviewResult
        │       └── Operations to execute
        │
        ├── smartRename: boolean
        │       └── User toggle state
        │
        ├── copyMode: boolean
        │       └── Copy vs Move toggle
        │
        └── currentStep: 'select' | 'scanning' | 'analyzing' 
                          | 'duplicates' | 'preview' | 'organizing' 
                          | 'complete'
```

## Undo System Architecture

```
Execute Organization
        │
        ├──▶ Create undo_log.json
        │       {
        │         "timestamp": "2024-03-02T14:30:00",
        │         "source_path": "/home/user/Downloads",
        │         "operations": [
        │           {
        │             "source": "/path/old/file.pdf",
        │             "target": "/path/new/file.pdf",
        │             "action": "move"
        │           }
        │         ]
        │       }
        │
        ├──▶ Execute each operation
        │       - Move file from source to target
        │       - Log to undo file
        │
        └──▶ Complete

If User clicks UNDO:
        │
        └──▶ Read undo_log.json
                │
                └──▶ Reverse each operation
                        - Move from target back to source
                        - Mark undo log as undone
```

## API Call Sequence

```
User Journey: Organize Folder

Step 1: Select Folder
  Frontend: POST /scan {path: "/home/user/Downloads"}
  Backend:  Scanner scans directory
  Response: {files: [...], total_files: 150, ...}

Step 2: AI Analysis (Auto)
  Frontend: POST /analyze {files: [...]}
  Backend:  AI Analyzer categorizes
  Response: {categories: {"file.pdf": "Documents", ...}}

Step 3: Duplicate Check (Auto)
  Frontend: POST /duplicates {path: "/home/user/Downloads"}
  Backend:  Duplicate Detector hashes files
  Response: {duplicates: [[file1, file1_copy], ...]}

Step 4: Preview
  Frontend: POST /organize/preview {
              source_path: "...",
              categories: {...},
              files: [...],
              smart_rename: true
            }
  Backend:  If smart_rename: AI suggests names
            Organizer builds operation list
  Response: {operations: [...], new_structure: {...}, stats: {...}}

Step 5: Execute
  Frontend: POST /organize/execute {
              source_path: "...",
              organization_plan: {operations: [...]},
              copy_mode: false
            }
  Backend:  Create undo log
            Execute operations
  Response: {success: true, undo_log_path: "..."}
```

## Error Handling Flow

```
API Call
   │
   ├──▶ Success ──▶ Update State ──▶ Render Results
   │
   └──▶ Error
         │
         ├── 400 Bad Request
         │       └── Show validation error to user
         │
         ├── 403 Forbidden
         │       └── "Access to system directories blocked"
         │
         ├── 404 Not Found
         │       └── "Folder not found, check path"
         │
         ├── 500 Server Error
         │       └── Log error, show generic message
         │
         └── Network Error
                 └── "Cannot connect to backend, is it running?"
```

## File Type Detection

```
File Path
    │
    ├──▶ Extract Extension (.pdf)
    │         │
    │         ├── Known Extension?
    │         │       ├── YES ──▶ Map to Category
    │         │       │              (Documents, Images, etc.)
    │         │       │
    │         │       └── NO ───▶ Check MIME Type
    │         │                      │
    │         │                      └──▶ python-magic library
    │         │                             │
    │         │                             └──▶ application/pdf
    │         │                                    │
    │         │                                    └──▶ Documents
    │         │
    │         └── Fallback ──▶ "Uncategorized"
    │
    └──▶ Extension + MIME stored in FileInfo
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTIMIZATION STRATEGIES                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. EXTENSION CACHING                                        │
│     └── Known extensions mapped to categories                │
│         No API call needed for .pdf, .jpg, etc.              │
│                                                              │
│  2. BATCH PROCESSING                                         │
│     └── AI calls process 50 files at once                    │
│         Reduces API calls and token usage                    │
│                                                              │
│  3. SIZE-FIRST FILTERING (Duplicates)                        │
│     └── Only hash files with same size                       │
│         Skips 99% of non-duplicates instantly                │
│                                                              │
│  4. TEXT PREVIEW LIMITS                                      │
│     └── Only read first 200 chars of text files              │
│         Saves memory and AI token usage                      │
│                                                              │
│  5. ASYNC OPERATIONS                                         │
│     └── FastAPI handles concurrent requests                  │
│         UI stays responsive during long operations           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App.tsx (Root)
    │
    ├── Header (Logo + Title)
    │
    ├── Error Banner (conditional)
    │
    ├── Step: select
    │       └── FolderSelector
    │               ├── Path Input
    │               ├── Browse Button
    │               └── Submit Button
    │
    ├── Step: scanning / analyzing
    │       └── Loading Spinner
    │
    ├── Step: duplicates
    │       └── DuplicateView
    │               ├── Duplicate Groups
    │               ├── Checkboxes
    │               └── Continue Button
    │
    ├── Step: preview
    │       └── Stats Grid
    │       └── FileList
    │       └── CategoryView
    │       └── PreviewPanel
    │               ├── Smart Rename Toggle
    │               ├── Copy Mode Toggle
    │               ├── Safety Notice
    │               └── Execute Button
    │
    ├── Step: organizing
    │       └── Loading Spinner
    │
    └── Step: complete
            └── Success Message + Reset Button
```
