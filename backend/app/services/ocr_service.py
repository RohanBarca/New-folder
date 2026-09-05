import time
import httpx
from ..config import OCR_SPACE_API_KEY, OCR_SPACE_URL

class OCRService:
    """Service to interact with OCR.space API for medical document text extraction."""

    @staticmethod
    async def extract_text(file_bytes: bytes, filename: str) -> dict:
        """
        Sends document to OCR.space API and extracts raw parsed text.
        
        Args:
            file_bytes: Raw binary content of the uploaded document
            filename: Original name of the uploaded document
            
        Returns:
            dict with success (bool), text (str), processing_time (float), or error (str)
        """
        if not OCR_SPACE_API_KEY:
            return {
                "success": False,
                "text": "",
                "error": "OCR service is not configured. Please set OCR_SPACE_API_KEY in backend/.env"
            }

        start_time = time.time()

        payload = {
            "apikey": OCR_SPACE_API_KEY,
            "language": "eng",
            "isOverlayRequired": "false",
            "OCREngine": "2",  # Engine 2 is optimized for structured, rotated, and medical documents
            "detectOrientation": "true",
            "scale": "true",
        }

        files = {
            "file": (filename, file_bytes)
        }

        try:
            # Set a generous 60s timeout for OCR.space processing of high-res images / PDFs
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(OCR_SPACE_URL, data=payload, files=files)

            elapsed_time = round(time.time() - start_time, 2)

            if response.status_code != 200:
                return {
                    "success": False,
                    "text": "",
                    "error": f"OCR service returned an unexpected status ({response.status_code}). Please try again."
                }

            result = response.json()

            # Check if OCR.space encountered an error during parsing
            if result.get("IsErroredOnProcessing", False):
                error_msgs = result.get("ErrorMessage") or ["Unable to process document with OCR."]
                error_str = error_msgs[0] if isinstance(error_msgs, list) else str(error_msgs)
                return {
                    "success": False,
                    "text": "",
                    "error": f"OCR processing failed: {error_str}"
                }

            parsed_results = result.get("ParsedResults", [])
            if not parsed_results:
                return {
                    "success": True,
                    "text": "",
                    "processing_time": elapsed_time,
                    "is_empty": True
                }

            # Concatenate parsed text across all pages (for multi-page PDFs or single images)
            all_text_chunks = []
            for page in parsed_results:
                page_text = page.get("ParsedText", "")
                if page_text:
                    all_text_chunks.append(page_text.strip())

            extracted_text = "\n\n".join(all_text_chunks).strip()

            return {
                "success": True,
                "text": extracted_text,
                "processing_time": elapsed_time,
                "is_empty": len(extracted_text) == 0
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "text": "",
                "error": "OCR service timed out while reading the document. Please try a smaller or clearer image."
            }
        except httpx.RequestError as e:
            return {
                "success": False,
                "text": "",
                "error": "Failed to connect to OCR service. Please verify your internet connection."
            }
        except Exception as e:
            return {
                "success": False,
                "text": "",
                "error": "An unexpected error occurred while reading the document."
            }
