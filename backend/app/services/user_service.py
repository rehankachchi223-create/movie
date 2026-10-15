from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
    generate_csrf_token,
)
from app.database.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_session_repository import RefreshSessionRepository
from app.schemas.auth import UserRegister, UserLogin, Token


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = RefreshSessionRepository(db)

    def register_user(self, user_in: UserRegister) -> User:
        """Register a new user account with duplicate email prevention."""
        existing_user = self.user_repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists.",
            )

        hashed_pw = get_password_hash(user_in.password)
        new_user = User(
            name=user_in.name,
            email=user_in.email.lower(),
            password_hash=hashed_pw,
        )
        return self.user_repo.create(new_user)

    def authenticate_user(
        self,
        login_in: UserLogin,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[Token, str, str, User]:
        """Authenticate user credentials, issue JWT access token, and establish refresh session."""
        user = self.user_repo.get_by_email(login_in.email)
        if not user or not verify_password(login_in.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        access_token = create_access_token(subject=user.id)
        raw_refresh_token, jti = create_refresh_token()
        csrf_token = generate_csrf_token()

        refresh_expires = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        self.session_repo.create_session(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            jti=jti,
            expires_at=refresh_expires,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        token_model = Token(
            access_token=access_token,
            token_type="bearer",
            expires_in_seconds=expires_in_seconds,
            csrf_token=csrf_token,
            refresh_token=raw_refresh_token,
        )
        return token_model, raw_refresh_token, csrf_token, user

    def refresh_session(
        self,
        raw_refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[Token, str, str, User]:
        """Rotate refresh token and issue new access token."""
        if not raw_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token required.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_hash = hash_token(raw_refresh_token)
        session = self.session_repo.get_by_token_hash(token_hash)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check for revocation / reuse
        if session.revoked:
            # If an already revoked token is used, trigger security protection: revoke all user sessions
            self.session_repo.revoke_all_for_user(session.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check expiry
        now = datetime.now(timezone.utc)
        session_expires = session.expires_at
        if session_expires.tzinfo is None:
            session_expires = session_expires.replace(tzinfo=timezone.utc)

        if session_expires < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Revoke the old session (Rotation)
        self.session_repo.revoke_session(session)

        # Create new session
        new_raw_refresh, new_jti = create_refresh_token()
        new_csrf = generate_csrf_token()
        new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        self.session_repo.create_session(
            user_id=session.user_id,
            token_hash=hash_token(new_raw_refresh),
            jti=new_jti,
            expires_at=new_expires,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        user = self.get_user_by_id(session.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with token no longer exists.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        access_token = create_access_token(subject=user.id)

        token_model = Token(
            access_token=access_token,
            token_type="bearer",
            expires_in_seconds=expires_in_seconds,
            csrf_token=new_csrf,
            refresh_token=new_raw_refresh,
        )
        return token_model, new_raw_refresh, new_csrf, user

    def logout_session(
        self,
        raw_refresh_token: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> bool:
        """Revoke active refresh session on logout."""
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            return self.session_repo.revoke_by_token_hash(token_hash)
        elif user_id:
            count = self.session_repo.revoke_all_for_user(user_id)
            return count > 0
        return False

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.user_repo.get_by_id(user_id)
