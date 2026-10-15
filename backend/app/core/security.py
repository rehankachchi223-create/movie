import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Tuple, Union
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

# Setup password hashing context with pwdlib
password_hash = PasswordHash((BcryptHasher(),))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of the password."""
    return password_hash.hash(password)


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": now,
        "type": "access",
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_type = payload.get("type")
        if token_type and token_type != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None


def create_refresh_token() -> Tuple[str, str]:
    """Generate a cryptographically secure raw refresh token and unique jti."""
    raw_token = secrets.token_urlsafe(48)
    jti = uuid.uuid4().hex
    return raw_token, jti


def hash_token(raw_token: str) -> str:
    """Generate a SHA-256 hash of a token string for safe database persistence."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def verify_token_hash(raw_token: str, stored_hash: str) -> bool:
    """Timing-attack-safe comparison of a raw token against its stored hash."""
    computed = hash_token(raw_token)
    return hmac.compare_digest(computed, stored_hash)


def generate_csrf_token() -> str:
    """Generate a secure CSRF token for cookie-based state-changing requests."""
    return secrets.token_hex(16)
