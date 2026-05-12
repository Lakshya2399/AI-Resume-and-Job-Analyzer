"""
Service: Resume text preprocessing.

Cleans raw extracted PDF text before it's sent to the LLM.
Better input = more consistent LLM output = fewer repair attempts.

What this fixes:
- Garbled unicode from PDF extraction (â€™ → ', Ã© → é)
- Excessive whitespace and blank lines
- Hyphenated line-breaks from PDF column layouts ("pro-\ngramming" → "programming")
- Invisible/control characters that confuse tokenisers
- Truncates to a safe token budget
"""

import re
import unicodedata
import logging

logger = logging.getLogger(__name__)

# ~6000 chars ≈ 1500 tokens — safe for all models including 4k-context Mistral
MAX_RESUME_CHARS = 6000
MAX_JD_CHARS = 3000


def fix_encoding(text: str) -> str:
    """
    Normalise unicode to NFC form and replace common mojibake sequences.
    PDF extraction sometimes produces mangled characters.
    """
    # NFC normalisation fixes many accented character issues
    text = unicodedata.normalize("NFC", text)

    # Replace common mojibake patterns
    replacements = {
        "\u2019": "'",   # right single quotation mark → apostrophe
        "\u2018": "'",   # left single quotation mark
        "\u201c": '"',   # left double quotation mark
        "\u201d": '"',   # right double quotation mark
        "\u2013": "-",   # en dash
        "\u2014": "-",   # em dash
        "\u00a0": " ",   # non-breaking space
        "\u2022": "-",   # bullet point
        "\u2026": "...", # ellipsis
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)

    # Remove control characters (except newline and tab)
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in "\n\t")
    return text


def fix_hyphenated_linebreaks(text: str) -> str:
    """
    PDF columns often break words across lines with a hyphen:
    'pro-\ngramming' → 'programming'
    """
    return re.sub(r"-\n(\w)", lambda m: m.group(1), text)


def normalise_whitespace(text: str) -> str:
    """
    Collapse runs of spaces/tabs to a single space.
    Collapse 3+ consecutive newlines to 2 (preserve section breaks).
    """
    # Collapse horizontal whitespace
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse excessive vertical whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(lines)
    return text.strip()


def truncate(text: str, max_chars: int, label: str = "text") -> str:
    """Truncate to max_chars with a log warning if truncation occurs."""
    if len(text) > max_chars:
        logger.warning(f"Truncating {label} from {len(text)} to {max_chars} chars.")
        return text[:max_chars]
    return text


def preprocess_resume_text(text: str) -> str:
    """
    Full preprocessing pipeline for resume text.
    Apply before sending to the LLM.
    """
    text = fix_encoding(text)
    text = fix_hyphenated_linebreaks(text)
    text = normalise_whitespace(text)
    text = truncate(text, MAX_RESUME_CHARS, label="resume")
    logger.info(f"Preprocessed resume: {len(text)} chars")
    return text


def preprocess_jd_text(text: str) -> str:
    """
    Full preprocessing pipeline for job description text.
    """
    text = fix_encoding(text)
    text = normalise_whitespace(text)
    text = truncate(text, MAX_JD_CHARS, label="job_description")
    logger.info(f"Preprocessed JD: {len(text)} chars")
    return text
