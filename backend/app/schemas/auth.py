from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=6, max_length=100, examples=["SecretPass123!"])


class UserLogin(BaseModel):
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., examples=["SecretPass123!"])


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    csrf_token: Optional[str] = None
    refresh_token: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class TokenData(BaseModel):
    user_id: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    created_at: datetime
