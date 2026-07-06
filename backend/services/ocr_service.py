"""
OCR Service — Local, CPU-only text extraction using EasyOCR.
No API key required. Runs entirely on the local machine.
"""

import base64
import io
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

# Lazy import: easyocr is only imported once first use (heavy initialization ~3-5s)
_reader = None

# Security Safeguards
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_PIXELS = 16000000  # e.g., 4000x4000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def _get_reader():
    """Lazy-initialize EasyOCR reader in CPU-only mode."""
    global _reader
    if _reader is None:
        import easyocr
        print("[OCRService] Initializing EasyOCR (CPU mode)... this may take a moment on first load.")
        _reader = easyocr.Reader(["en"], gpu=False)
        print("[OCRService] Ready.")
    return _reader


class OCRService:
    def extract_text(self, image_base64: str) -> str:
        """
        Extract all text from a base64-encoded image using EasyOCR.

        Returns:
            A single cleaned string of extracted text, or "" on failure.
        """
        if not image_base64:
            return ""

        try:
            # Strip data URI prefix if present (e.g., "data:image/png;base64,...")
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            
            # Add back missing padding
            missing_padding = len(image_base64) % 4
            if missing_padding:
                image_base64 += "=" * (4 - missing_padding)

            # 1. Enforce File Size Limits
            # Base64 size to bytes approx: len(base64) * 3 / 4
            approx_size = len(image_base64) * 3 / 4
            if approx_size > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=413, detail="Payload Too Large: Image exceeds maximum allowed size.")

            image_bytes = base64.b64decode(image_base64)
            
            if len(image_bytes) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=413, detail="Payload Too Large: Image exceeds maximum allowed size.")

            # 2. Validate Image and Configuration Safeguards
            try:
                # Open image to verify integrity and format
                img = Image.open(io.BytesIO(image_bytes))
                
                # Pillow's verify() checks for decompression bombs and broken files
                img.verify() 
                
                # Re-open because verify() leaves the file pointer at the end
                img = Image.open(io.BytesIO(image_bytes))
                
                if img.format not in ALLOWED_FORMATS:
                    raise HTTPException(status_code=400, detail=f"Bad Request: Unsupported image format {img.format}.")
                
                # 4. Re-encode Uploaded Images (Sanitization)
                # Convert to RGB to strip alpha channels or other formats and save as JPEG
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                    
                sanitized_io = io.BytesIO()
                img.save(sanitized_io, format="JPEG")
                sanitized_bytes = sanitized_io.getvalue()
                
            except UnidentifiedImageError:
                raise HTTPException(status_code=400, detail="Bad Request: Invalid or corrupted image file.")
            except Image.DecompressionBombError:
                raise HTTPException(status_code=413, detail="Payload Too Large: Decompression bomb detected.")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail="Bad Request: Malformed image data.")

            reader = _get_reader()
            results = reader.readtext(sanitized_bytes, detail=0, paragraph=True)
            extracted = " ".join(results).strip()
            print(f"[OCRService] Extracted {len(extracted)} chars from image.")
            return extracted
        except HTTPException:
            raise
        except Exception as e:
            print(f"[OCRService] Error during OCR: {e}")
            return ""
