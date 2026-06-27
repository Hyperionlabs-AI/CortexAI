import re

_PATTERNS: dict[str, re.Pattern] = {
    "email":       re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
    "phone_us":    re.compile(r'\b(\+1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b'),
    "ssn":         re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    "credit_card": re.compile(r'\b(?:\d{4}[\s-]?){3}\d{4}\b'),
    "ipv4":        re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
}


def scan(text: str | None) -> bool:
    if not text:
        return False
    return any(p.search(text) for p in _PATTERNS.values())


def redact(text: str | None) -> str | None:
    if not text:
        return text
    for pattern in _PATTERNS.values():
        text = pattern.sub("[REDACTED]", text)
    return text
