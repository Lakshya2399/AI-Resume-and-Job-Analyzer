"""
Service: PDF parsing and text chunking.

Week 1 focus: get clean text out of a PDF resume,
then split it into chunks suitable for embedding.
"""

import io
import logging
from typing import List

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract all text from a PDF resume.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        Cleaned plain text string.

    Raises:
        ValueError: If the PDF has no extractable text (scanned image PDF).
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages_text = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages_text.append(text.strip())
        else:
            logger.warning(f"Page {page_num + 1} yielded no text — may be image-based.")

    if not pages_text:
        raise ValueError(
            "No text could be extracted from this PDF. "
            "If it's a scanned resume, please use a text-based PDF."
        )

    full_text = "\n\n".join(pages_text)
    logger.info(f"Extracted {len(full_text)} characters from {len(reader.pages)}-page PDF.")
    return full_text


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
    """
    Split text into overlapping chunks for vector embedding.

    Uses RecursiveCharacterTextSplitter which respects natural
    boundaries (paragraphs → sentences → words) before hard-splitting.

    Args:
        text: Full document text.
        chunk_size: Max characters per chunk.
        chunk_overlap: Characters of overlap between consecutive chunks.

    Returns:
        List of text chunks.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        # Prefer splitting at resume section boundaries
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    logger.info(f"Split into {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap}).")
    return chunks


def preprocess_resume(pdf_bytes: bytes) -> dict:
    """
    Full preprocessing pipeline: PDF → text → chunks.

    Returns a dict with:
        - full_text: complete extracted text
        - chunks: list of text chunks for embedding
        - char_count: length of full text
        - chunk_count: number of chunks
    """
    full_text = extract_text_from_pdf(pdf_bytes)
    chunks = chunk_text(full_text)

    return {
        "full_text": full_text,
        "chunks": chunks,
        "char_count": len(full_text),
        "chunk_count": len(chunks),
    }
