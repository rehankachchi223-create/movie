import logging
import re
import sys
from app.core.config import settings

REDACTION_PATTERNS = [
    # Authorization header with Bearer token
    (re.compile(r'(Bearer\s+)[A-Za-z0-9\-_.~+/]+=*', re.IGNORECASE), r'\1[REDACTED]'),
    # Standalone JWT string
    (re.compile(r'\beyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+', re.IGNORECASE), r'[REDACTED_JWT]'),
    # Connection string password (e.g., postgresql://user:pass@host)
    (re.compile(r'(://[^:\s]+:)[^@\s]+(@)', re.IGNORECASE), r'\1[REDACTED]\2'),
    # Sensitive keys in JSON, query params, or key-value assignments
    (
        re.compile(
            r'(?i)(["\']?(?:password|passwd|pwd|access_token|refresh_token|token|secret|secret_key|api_key|authorization)["\']?\s*[:=]\s*["\']?)([^"\'\s,\}\]]+)(["\']?)'
        ),
        r'\1[REDACTED]\3',
    ),
]


def redact_sensitive_text(text: str) -> str:
    """Scrub sensitive information such as passwords, tokens, and secrets from string."""
    if not isinstance(text, str):
        text = str(text)
    for pattern, replacement in REDACTION_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class SensitiveScrubbingFormatter(logging.Formatter):
    """Log formatter that actively scrubs sensitive tokens, passwords, and secrets."""

    def format(self, record: logging.LogRecord) -> str:
        formatted = super().format(record)
        return redact_sensitive_text(formatted)


def setup_logging() -> logging.Logger:
    """Configure application logging with active sensitive data redaction."""
    logger = logging.getLogger("movierec")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = SensitiveScrubbingFormatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
