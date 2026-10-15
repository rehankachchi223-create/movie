from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.core.config import settings
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse, RefreshTokenRequest
from app.schemas.common import MessageResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_auth_cookies(response: Response, refresh_token: str, csrf_token: str) -> None:
    """Set secure HttpOnly refresh token cookie and CSRF token cookie."""
    is_production = settings.ENVIRONMENT.lower() == "production"
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=max_age,
        path="/",
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=is_production,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    """Clear session and CSRF cookies on logout."""
    is_production = settings.ENVIRONMENT.lower() == "production"
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=is_production,
        samesite="lax",
    )
    response.delete_cookie(
        key="csrf_token",
        path="/",
        secure=is_production,
        samesite="lax",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    user_service = UserService(db)
    return user_service.register_user(user_in)


@router.post("/login", response_model=Token)
def login(
    login_in: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate user credentials, set HttpOnly refresh cookie, and return access token."""
    user_service = UserService(db)
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    token_model, raw_refresh, csrf_token, _ = user_service.authenticate_user(
        login_in, user_agent=user_agent, ip_address=ip_address
    )
    _set_auth_cookies(response, raw_refresh, csrf_token)
    return token_model


@router.post("/refresh", response_model=Token)
def refresh_token(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    refresh_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    csrf_cookie: Optional[str] = Cookie(None, alias="csrf_token"),
    x_csrf_token: Optional[str] = Header(None, alias="X-CSRF-Token"),
    db: Session = Depends(get_db),
):
    """Rotate refresh token using HttpOnly cookie (or body fallback) and return fresh access token."""
    token_str = refresh_cookie or (body.refresh_token if body else None)
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # CSRF verification for cookie-based requests:
    # If the refresh token was sent via cookie and a CSRF cookie exists, enforce CSRF token header
    if refresh_cookie and csrf_cookie:
        if not x_csrf_token or x_csrf_token != csrf_cookie:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed.",
            )

    user_service = UserService(db)
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    token_model, new_refresh, new_csrf, _ = user_service.refresh_session(
        token_str, user_agent=user_agent, ip_address=ip_address
    )
    _set_auth_cookies(response, new_refresh, new_csrf)
    return token_model


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    refresh_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Revoke user refresh session and clear authentication cookies."""
    token_str = refresh_cookie or (body.refresh_token if body else None)
    user_service = UserService(db)

    user_service.logout_session(
        raw_refresh_token=token_str,
        user_id=current_user.id if current_user else None,
    )
    _clear_auth_cookies(response)
    return MessageResponse(message="Successfully logged out.")
