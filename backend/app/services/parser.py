import io
import logging
from pathlib import Path

import PyPDF2
from docx import Document

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        result = "\n".join(text_parts)
        logger.info("Extracted %d characters from PDF", len(result))
        return result
    except Exception as e:
        logger.error("Failed to extract text from PDF: %s", e)
        raise ValueError(f"Failed to parse PDF: {e}") from e


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text content from a DOCX file."""
    try:
        doc = Document(io.BytesIO(file_bytes))
        text_parts = [para.text for para in doc.paragraphs if para.text.strip()]
        result = "\n".join(text_parts)
        logger.info("Extracted %d characters from DOCX", len(result))
        return result
    except Exception as e:
        logger.error("Failed to extract text from DOCX: %s", e)
        raise ValueError(f"Failed to parse DOCX: {e}") from e


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract text content from a TXT file."""
    try:
        result = file_bytes.decode("utf-8")
        logger.info("Extracted %d characters from TXT", len(result))
        return result
    except UnicodeDecodeError:
        result = file_bytes.decode("utf-8", errors="replace")
        logger.warning("TXT file had encoding issues, used replacement characters")
        return result


def parse_file(file_bytes: bytes, filename: str) -> str:
    """Route file parsing based on extension."""
    ext = Path(filename).suffix.lower()
    parsers = {
        ".pdf": extract_text_from_pdf,
        ".docx": extract_text_from_docx,
        ".doc": extract_text_from_docx,
        ".txt": extract_text_from_txt,
    }
    parser = parsers.get(ext)
    if parser is None:
        raise ValueError(
            f"Unsupported file type: {ext}. Supported: {', '.join(parsers.keys())}"
        )
    return parser(file_bytes)
