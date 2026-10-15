import os
import json
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Movie Recommendation Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite:///./movierec.db"

    # Security & JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Short-lived access token (15 mins)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh token lifetime (7 days)

    # External Provider
    EXTERNAL_MOVIE_API_KEY: str = ""
    TMDB_API_KEY: str = ""
    MOVIE_IMPORT_PAGE_LIMIT: int = 10
    MOVIE_IMPORT_MAX_MOVIES: int = 500
    MOVIE_IMPORT_MINIMUM_COUNT: int = 200
    MOVIE_IMPORT_START_YEAR: int = 1900
    MOVIE_IMPORT_END_YEAR: int = 2026

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def validate_security_settings(self):
        if not self.SECRET_KEY.strip():
            raise ValueError("SECRET_KEY must be set via environment variables or .env file.")
        insecure_defaults = {
            "change-this-to-a-long-random-secret",
            "secret",
            "changeme",
            "password",
            "default",
        }
        if self.ENVIRONMENT.lower() == "production":
            if self.SECRET_KEY in insecure_defaults or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "In production, SECRET_KEY must be a strong, cryptographically secure secret "
                    "(at least 32 characters) provided through environment configuration."
                )
        return self

    # Redis Cache (Optional)
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_REDIS_CACHE: bool = False

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
