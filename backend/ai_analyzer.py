"""
AI Analyzer Module - Uses OpenClaw Gateway for AI processing
"""

import os
import json
import logging
import asyncio
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """
    AI-powered file categorizer using OpenClaw Gateway
    """

    # Common category mappings
    DEFAULT_CATEGORIES = [
        "Documents",
        "Images",
        "Videos",
        "Audio",
        "Archives",
        "Code",
        "Data",
        "Presentations",
        "Spreadsheets",
        "Ebooks",
        "Design",
        "Executables",
        "Uncategorized",
    ]

    EXTENSION_CATEGORIES = {
        # Documents
        ".pdf": "Documents",
        ".doc": "Documents",
        ".docx": "Documents",
        ".txt": "Documents",
        ".rtf": "Documents",
        ".md": "Documents",
        ".odt": "Documents",
        ".pages": "Documents",
        # Images
        ".jpg": "Images",
        ".jpeg": "Images",
        ".png": "Images",
        ".gif": "Images",
        ".bmp": "Images",
        ".svg": "Images",
        ".webp": "Images",
        ".ico": "Images",
        ".tiff": "Images",
        ".psd": "Images",
        ".ai": "Images",
        ".sketch": "Images",
        # Videos
        ".mp4": "Videos",
        ".avi": "Videos",
        ".mkv": "Videos",
        ".mov": "Videos",
        ".wmv": "Videos",
        ".flv": "Videos",
        ".webm": "Videos",
        ".m4v": "Videos",
        # Audio
        ".mp3": "Audio",
        ".wav": "Audio",
        ".flac": "Audio",
        ".aac": "Audio",
        ".ogg": "Audio",
        ".m4a": "Audio",
        ".wma": "Audio",
        ".opus": "Audio",
        # Archives
        ".zip": "Archives",
        ".rar": "Archives",
        ".7z": "Archives",
        ".tar": "Archives",
        ".gz": "Archives",
        ".bz2": "Archives",
        ".xz": "Archives",
        # Code
        ".py": "Code",
        ".js": "Code",
        ".ts": "Code",
        ".jsx": "Code",
        ".tsx": "Code",
        ".html": "Code",
        ".css": "Code",
        ".scss": "Code",
        ".java": "Code",
        ".cpp": "Code",
        ".c": "Code",
        ".h": "Code",
        ".go": "Code",
        ".rs": "Code",
        ".rb": "Code",
        ".php": "Code",
        ".swift": "Code",
        ".kt": "Code",
        ".scala": "Code",
        # Data
        ".json": "Data",
        ".xml": "Data",
        ".csv": "Data",
        ".yaml": "Data",
        ".yml": "Data",
        ".sql": "Data",
        ".db": "Data",
        ".sqlite": "Data",
        # Presentations
        ".ppt": "Presentations",
        ".pptx": "Presentations",
        ".key": "Presentations",
        ".odp": "Presentations",
        # Spreadsheets
        ".xls": "Spreadsheets",
        ".xlsx": "Spreadsheets",
        ".numbers": "Spreadsheets",
        ".ods": "Spreadsheets",
        ".csv": "Spreadsheets",
        # Ebooks
        ".epub": "Ebooks",
        ".mobi": "Ebooks",
        ".azw": "Ebooks",
        # Design
        ".fig": "Design",
        ".xd": "Design",
        ".afdesign": "Design",
        # Executables
        ".exe": "Executables",
        ".msi": "Executables",
        ".dmg": "Executables",
        ".app": "Executables",
        ".deb": "Executables",
        ".rpm": "Executables",
        ".sh": "Executables",
        ".bat": "Executables",
    }

    def __init__(self, gateway_token: Optional[str] = None, max_batch_size: int = 50):
        self.gateway_token = gateway_token or os.getenv("GATEWAY_TOKEN")
        self.gateway_url = os.getenv("GATEWAY_URL", "ws://127.0.0.1:18789")
        self.max_batch_size = max_batch_size
        self._cache: Dict[str, str] = {}
        self.client = httpx.AsyncClient(timeout=60.0)

        if self.gateway_token:
            logger.info("AI Analyzer initialized with OpenClaw Gateway")
        else:
            logger.info("AI Analyzer initialized (local mode, no gateway token)")

    async def suggest_categories(self, files: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Suggest categories for files using extension mapping first,
        then OpenClaw Gateway for ambiguous cases
        """
        categories = {}
        agent_candidates = []

        # First pass: extension-based categorization
        for file_info in files:
            file_name = file_info.get("name", "")
            extension = file_info.get("extension", "").lower()

            # Check cache first
            if file_name in self._cache:
                categories[file_name] = self._cache[file_name]
                continue

            # Check extension mapping
            if extension in self.EXTENSION_CATEGORIES:
                category = self.EXTENSION_CATEGORIES[extension]
                categories[file_name] = category
                self._cache[file_name] = category
            else:
                # Needs AI analysis
                agent_candidates.append(file_info)

        # Second pass: AI categorization for ambiguous files
        if agent_candidates and self.gateway_token:
            agent_categories = await self._gateway_categorize_batch(agent_candidates)
            categories.update(agent_categories)
        elif agent_candidates:
            # Fallback to MIME type if no gateway
            mime_categories = self._fallback_categorize(agent_candidates)
            categories.update(mime_categories)

        return categories

    async def _gateway_categorize_batch(
        self, files: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Categorize files using OpenClaw Gateway
        """
        results = {}

        # Process in batches
        for i in range(0, len(files), self.max_batch_size):
            batch = files[i : i + self.max_batch_size]
            batch_results = await self._ask_gateway_to_categorize(batch)
            results.update(batch_results)

        return results

    async def _ask_gateway_to_categorize(
        self, files: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Ask OpenClaw Gateway to categorize files
        """
        # Build file descriptions
        file_list = []
        for f in files:
            desc = f"- {f.get('name', '')}"
            if f.get("mime_type"):
                desc += f" (type: {f['mime_type']})"
            if f.get("preview"):
                preview = f["preview"][:100].replace("\n", " ")
                desc += f" | preview: {preview}"
            file_list.append(desc)

        files_str = "\n".join(file_list)

        prompt = f"""Categorize these files into one category each.

Available categories: Documents, Images, Videos, Audio, Archives, Code, Data, Presentations, Spreadsheets, Ebooks, Design, Executables, Uncategorized

Files:
{files_str}

Respond ONLY with a JSON object mapping each filename to its category:
{{"filename1.ext": "Category", "filename2.ext": "Category", ...}}

Use only the category names listed above."""

        try:
            result = await self._call_gateway(prompt)

            # Parse the response
            categories = self._parse_gateway_json_response(result, files)

            # Cache results
            for file_name, category in categories.items():
                self._cache[file_name] = category

            return categories

        except Exception as e:
            logger.error(f"Gateway categorization failed: {e}")
            return self._fallback_categorize(files)

    async def suggest_renames(self, files: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Suggest better, more descriptive filenames using OpenClaw Gateway
        """
        # Only rename files with generic/messy names
        messy_patterns = [
            r"IMG_\d+",
            r"DSC_\d+",
            r"IMG-\d+",
            r"image\d+",
            r"photo\d+",
            r"screenshot[_-]?\d*",
            r"pic\d+",
            r"file\d+",
            r"doc\d+",
            r"\d{8}_\d{6}",
            r"\d{4}-\d{2}-\d{2}[_-]\d+",
            r"\.tmp$",
            r"\.temp$",
            r"copy$",
            r"\(\d+\)$",
            # YouTube/video IDs (random alphanumeric strings)
            r"[a-zA-Z0-9]{8,}_[a-zA-Z0-9]{6,}$",  # e.g., YyepU5ztLf4_62dae498
            r"[a-zA-Z0-9]{10,}$",  # Long random strings at end
            # Social media download prefixes
            r"^pinsnap-",
            r"^download[_-]",
            r"^tiktok[_-]",
            r"^instagram[_-]",
            r"^fb-",
            r"^twitter-",
            r"^youtube-",
            r"^yt[_-]",
            # Generic prefixes
            r"^video[_-]?\d*",
            r"^audio[_-]?\d*",
            r"^recording[_-]?\d*",
        ]

        import re

        files_to_rename = []
        for file_info in files:
            file_name = file_info.get("name", "")
            # Check filename without extension for pattern matching
            name_without_ext = os.path.splitext(file_name)[0]
            is_messy = any(
                re.search(pattern, name_without_ext, re.I) for pattern in messy_patterns
            )
            if is_messy or len(file_name) < 10:
                files_to_rename.append(file_info)

        if not files_to_rename:
            return {}

        # Try AI first via OpenClaw agent
        renames = {}
        try:
            for i in range(0, len(files_to_rename), self.max_batch_size):
                batch = files_to_rename[i : i + self.max_batch_size]
                batch_renames = await self._ask_gateway_to_rename(batch)
                renames.update(batch_renames)

            if renames:
                logger.info(f"AI generated {len(renames)} rename suggestions")
        except Exception as e:
            logger.error(f"AI rename failed: {e}")

        # If no renames from AI, use fallback
        if not renames:
            logger.info("Using local fallback rename suggestions")
            renames = self._fallback_rename(files_to_rename)

        return renames

    async def _ask_gateway_to_rename(
        self, files: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Ask OpenClaw Gateway to suggest better filenames
        """
        # Build file descriptions
        file_list = []
        for f in files:
            desc = f"Current: {f.get('name', '')}"
            if f.get("preview"):
                preview = f["preview"][:80].replace("\n", " ")
                desc += f" | Content preview: {preview}"
            file_list.append(desc)

        files_str = "\n".join([f"{i + 1}. {desc}" for i, desc in enumerate(file_list)])

        prompt = f"""Suggest better, more descriptive filenames for these files.

Rules:
- Use descriptive, human-readable names
- Keep the same file extension
- Capitalize words (Title Case)
- Be specific about content when possible
- Use spaces instead of underscores
- Maximum 5 words per name

Examples of good renames:
- IMG_20240203_123456.jpg -> Sunset Beach Vacation.jpg
- screenshot_123.png -> Settings Dashboard.png  
- document_final.pdf -> Project Proposal.pdf

Files to rename:
{files_str}

Respond ONLY with a JSON object mapping old filenames to new filenames:
{{"old_filename.ext": "New Filename.ext", "old2.png": "New Name.png", ...}}

Only include files that need renaming. If a name is already good, omit it."""

        try:
            result = await self._call_gateway(prompt)
            return self._parse_rename_response(result)

        except Exception as e:
            logger.error(f"Gateway rename failed: {e}")
            # Fallback to local rename suggestions
            logger.info("Using local fallback for rename suggestions")
            return self._fallback_rename(files)

    async def _call_gateway(self, prompt: str) -> str:
        """
        Call OpenClaw Gateway with the prompt via subprocess
        Uses 'openclaw agent' command which properly handles the Gateway protocol
        """
        import subprocess

        try:
            # Call openclaw agent command with proper parameters
            # --local: Run embedded agent locally
            # --agent main: Specify which agent to use (required)
            # --json: Get JSON output for easier parsing
            result = subprocess.run(
                [
                    "openclaw",
                    "agent",
                    "--local",
                    "--agent",
                    "main",
                    "--json",
                    "-m",
                    prompt,
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                # Try to parse JSON response
                try:
                    data = json.loads(result.stdout)
                    # Extract the response content from the JSON structure
                    # The output typically contains metadata and the actual response
                    if isinstance(data, dict):
                        # Try common response fields
                        for key in ["response", "content", "output", "text", "message"]:
                            if key in data:
                                return data[key]
                        # If no recognized key, return the raw output
                        return result.stdout
                    return result.stdout
                except json.JSONDecodeError:
                    # If not valid JSON, return raw output
                    return result.stdout
            else:
                error_msg = result.stderr.strip() if result.stderr else "Unknown error"
                raise Exception(f"OpenClaw agent failed: {error_msg}")

        except subprocess.TimeoutExpired:
            logger.error("Gateway call timed out after 60 seconds")
            raise
        except FileNotFoundError:
            logger.error("openclaw command not found. Make sure OpenClaw is installed.")
            raise
        except Exception as e:
            logger.error(f"Gateway call failed: {e}")
            raise

    def _parse_gateway_json_response(
        self, response: str, files: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Parse JSON response from gateway"""
        try:
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]

            response = response.strip()
            categories = json.loads(response)

            # Validate
            valid_categories = set(self.DEFAULT_CATEGORIES)
            result = {}

            for file_info in files:
                file_name = file_info.get("name", "")
                category = categories.get(file_name, "Uncategorized")

                if category not in valid_categories:
                    category = "Uncategorized"

                result[file_name] = category

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse gateway response: {e}")
            return self._fallback_categorize(files)

    def _parse_rename_response(self, response: str) -> Dict[str, str]:
        """Parse rename JSON response from OpenClaw"""
        try:
            response = response.strip()

            # Try to parse as OpenClaw JSON output first
            try:
                data = json.loads(response)

                # OpenClaw returns a complex structure with payloads
                if isinstance(data, dict) and "payloads" in data:
                    # Extract text from first payload
                    payloads = data.get("payloads", [])
                    if payloads and len(payloads) > 0:
                        text_content = payloads[0].get("text", "")
                        if text_content:
                            # The text content should be the JSON with renames
                            try:
                                renames = json.loads(text_content)
                                if isinstance(renames, dict):
                                    return self._validate_renames(renames)
                            except json.JSONDecodeError:
                                # Try extracting JSON from text using regex
                                import re

                                json_match = re.search(r"\{[^}]*\}", text_content)
                                if json_match:
                                    try:
                                        renames = json.loads(json_match.group())
                                        return self._validate_renames(renames)
                                    except:
                                        pass

                # If it's a simple dict, use it directly
                if isinstance(data, dict) and "payloads" not in data:
                    return self._validate_renames(data)

            except json.JSONDecodeError:
                pass

            # Handle markdown code blocks
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]

            response = response.strip()
            renames = json.loads(response)
            return self._validate_renames(renames)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse rename response: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error parsing rename response: {e}")
            return {}

    def _validate_renames(self, renames: Dict[str, str]) -> Dict[str, str]:
        """Validate rename suggestions and ensure extensions are preserved"""
        valid_renames = {}
        for old_name, new_name in renames.items():
            # Skip non-string values
            if not isinstance(old_name, str) or not isinstance(new_name, str):
                continue

            old_ext = os.path.splitext(old_name)[1] if "." in old_name else ""
            new_ext = os.path.splitext(new_name)[1] if "." in new_name else ""

            if old_ext and new_ext != old_ext:
                new_name = os.path.splitext(new_name)[0] + old_ext

            valid_renames[old_name] = new_name

        return valid_renames

    def _fallback_categorize(self, files: List[Dict[str, Any]]) -> Dict[str, str]:
        """Fallback categorization based on MIME type patterns"""
        results = {}

        mime_categories = {
            "image/": "Images",
            "video/": "Videos",
            "audio/": "Audio",
            "text/": "Documents",
            "application/pdf": "Documents",
            "application/zip": "Archives",
            "application/x-": "Archives",
        }

        for file_info in files:
            file_name = file_info.get("name", "")
            mime = file_info.get("mime_type", "")

            category = "Uncategorized"
            for pattern, cat in mime_categories.items():
                if mime.startswith(pattern):
                    category = cat
                    break

            # Try extension as last resort
            if category == "Uncategorized":
                ext = os.path.splitext(file_name)[1].lower()
                category = self.EXTENSION_CATEGORIES.get(ext, "Uncategorized")

            results[file_name] = category
            self._cache[file_name] = category

        return results

    def _fallback_rename(self, files: List[Dict[str, Any]]) -> Dict[str, str]:
        """Generate fallback rename suggestions without AI Gateway"""
        renames = {}
        import re

        # Type counters for generating unique names
        type_counters = {
            "video": 0,
            "image": 0,
            "audio": 0,
            "document": 0,
            "other": 0,
        }

        # Friendly type names
        type_names = {
            "video": "Video",
            "image": "Image",
            "audio": "Audio",
            "document": "Document",
            "other": "File",
        }

        for file_info in files:
            file_name = file_info.get("name", "")
            mime_type = file_info.get("mime_type", "").lower()
            extension = os.path.splitext(file_name)[1].lower()

            # Determine file type from MIME type or extension
            file_type = "other"
            if "video" in mime_type or extension in [
                ".mp4",
                ".avi",
                ".mkv",
                ".mov",
                ".wmv",
                ".webm",
            ]:
                file_type = "video"
            elif "image" in mime_type or extension in [
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".bmp",
                ".webp",
                ".svg",
            ]:
                file_type = "image"
            elif "audio" in mime_type or extension in [
                ".mp3",
                ".wav",
                ".flac",
                ".aac",
                ".ogg",
                ".m4a",
                ".wma",
            ]:
                file_type = "audio"
            elif any(
                doc in mime_type
                for doc in [
                    "text/",
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats",
                ]
            ) or extension in [".pdf", ".doc", ".docx", ".txt", ".rtf", ".md"]:
                file_type = "document"

            # Check if it's a messy name (check filename without extension)
            name_without_ext = os.path.splitext(file_name)[0]
            messy_patterns = [
                r"^[a-zA-Z0-9]{8,}_[a-zA-Z0-9]{6,}$",  # YouTube IDs
                r"^pinsnap-",  # Pinterest downloads
                r"^download[_-]",
                r"^tiktok[_-]",
                r"^instagram[_-]",
                r"^fb-",
                r"^twitter-",
                r"^youtube-",
                r"^yt[_-]",
                r"^IMG_\d+",
                r"^DSC_\d+",
                r"^screenshot[_-]?\d*",
                r"^file[_-]?\d*",
                r"^doc[_-]?\d*",
                r"^video[_-]?\d*",
            ]

            is_messy = any(
                re.search(pattern, name_without_ext, re.I) for pattern in messy_patterns
            )

            if is_messy:
                type_counters[file_type] += 1
                counter = type_counters[file_type]
                new_name = f"{type_names[file_type]} {counter}{extension}"
                renames[file_name] = new_name

        logger.info(f"Fallback rename generated {len(renames)} suggestions")
        return renames
