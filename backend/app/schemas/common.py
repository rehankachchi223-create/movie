from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    meta: PaginationMeta


class MessageResponse(BaseModel):
    message: str


class HealthCheckResponse(BaseModel):
    status: str
    environment: str
    database: str
    version: str = "1.0.0"
