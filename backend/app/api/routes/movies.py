from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.movie import MovieResponse, MovieDetailResponse, MovieFilterQueryParams
from app.schemas.recommendation import RecommendationResponse
from app.services.movie_service import MovieService
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/movies", tags=["Movies"])


@router.get("", response_model=PaginatedResponse[MovieResponse])
def list_movies(
    search: Optional[str] = Query(None, description="Search term for title/overview/director"),
    genre_id: Optional[int] = Query(None, description="Filter by Genre ID"),
    year: Optional[int] = Query(None, description="Filter by Release Year"),
    min_rating: Optional[float] = Query(None, ge=0.0, le=10.0, description="Minimum movie rating"),
    sort_by: Optional[str] = Query("popular", description="popular, rating, title, release_date"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """Retrieve list of movies supporting search, genre/year/rating filtering, sorting, and pagination."""
    movie_service = MovieService(db)
    query_params = MovieFilterQueryParams(
        search=search,
        genre_id=genre_id,
        year=year,
        min_rating=min_rating,
        sort_by=sort_by,
        page=page,
        limit=limit,
    )
    return movie_service.get_movies_paginated(query_params)


@router.get("/search", response_model=PaginatedResponse[MovieResponse])
def search_movies(
    q: str = Query(..., min_length=1, description="Search query string"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search movies by title, overview, or director."""
    movie_service = MovieService(db)
    query_params = MovieFilterQueryParams(search=q, page=page, limit=limit)
    return movie_service.get_movies_paginated(query_params)


@router.get("/trending", response_model=List[MovieResponse])
def get_trending_movies(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get trending movies."""
    movie_service = MovieService(db)
    return movie_service.get_trending_movies(limit=limit)


@router.get("/popular", response_model=List[MovieResponse])
def get_popular_movies(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get popular movies."""
    movie_service = MovieService(db)
    return movie_service.get_popular_movies(limit=limit)


@router.get("/top-rated", response_model=List[MovieResponse])
def get_top_rated_movies(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get top rated movies."""
    movie_service = MovieService(db)
    return movie_service.get_top_rated_movies(limit=limit)


@router.get("/{movie_id}", response_model=MovieDetailResponse)
def get_movie_detail(movie_id: int, db: Session = Depends(get_db)):
    """Get detailed information for a specific movie."""
    movie_service = MovieService(db)
    return movie_service.get_movie_by_id(movie_id)


@router.get("/{movie_id}/similar", response_model=RecommendationResponse)
def get_similar_movies(
    movie_id: int,
    limit: int = Query(10, ge=1, le=50),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get movies similar to target movie using Content-Based TF-IDF Cosine Similarity."""
    rec_service = RecommendationService(db)
    return rec_service.get_similar_movies(movie_id=movie_id, limit=limit, skip=skip)
