"""Security helpers for untrusted customer content."""
import re

INJECTION_PATTERNS = (
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"reveal\s+(?:the\s+)?system\s+prompt",
    r"disregard\s+(?:your\s+)?rules",
    r"bypass\s+(?:human\s+)?review",
    r"approve\s+my\s+refund",
    r"change\s+(?:the\s+)?confidence\s+threshold",
)

def contains_prompt_injection(text: str) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in INJECTION_PATTERNS)

def safe_metadata(value: object, limit: int = 500) -> str:
    """Return bounded metadata without credentials or full customer messages."""
    text = str(value).replace("\n", " ")
    text = re.sub(r"(?i)(api[_ -]?key|authorization|bearer|token|password)\s*[:=]\s*\S+", r"\1=[REDACTED]", text)
    return text[:limit]
