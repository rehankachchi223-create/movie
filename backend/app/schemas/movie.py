from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GenreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: Optional[str] = None
    title: str
    overview: Optional[str] = None
    tagline: Optional[str] = None
    release_date: Optional[date] = None
    runtime: Optional[int] = None
    rating: float
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    director: Optional[str] = None
    genres: List[GenreResponse] = []


class MovieDetailResponse(MovieResponse):
    cast_list: Optional[str] = None
    keywords: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MovieFilterQueryParams(BaseModel):
    search: Optional[str] = None
    genre_id: Optional[int] = None
    year: Optional[int] = None
    min_rating: Optional[float] = Field(None, ge=0.0, le=10.0)
    sort_by: Optional[str] = Field("popular", description="popular, rating, title, release_date")
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
