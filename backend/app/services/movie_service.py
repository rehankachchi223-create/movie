from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.models.genre import Genre
from app.database.models.movie import Movie
from app.repositories.genre_repository import GenreRepository
from app.repositories.movie_repository import MovieRepository
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.schemas.movie import MovieResponse, MovieFilterQueryParams


class MovieService:
    def __init__(self, db: Session):
        self.db = db
        self.movie_repo = MovieRepository(db)
        self.genre_repo = GenreRepository(db)

    def get_movie_by_id(self, movie_id: int) -> Movie:
        """Fetch movie details by ID, raising HTTP 404 if not found."""
        movie = self.movie_repo.get_with_genres(movie_id)
        if not movie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Movie with ID {movie_id} not found.",
            )
        return movie

    def get_movies_paginated(
        self, query_params: MovieFilterQueryParams
    ) -> PaginatedResponse[MovieResponse]:
        """Fetch paginated, filtered, sorted movie records."""
        movies, total_count = self.movie_repo.filter_movies(
            search=query_params.search,
            genre_id=query_params.genre_id,
            year=query_params.year,
            min_rating=query_params.min_rating,
            sort_by=query_params.sort_by or "popular",
            page=query_params.page,
            limit=query_params.limit,
        )

        total_pages = (total_count + query_params.limit - 1) // query_params.limit if total_count > 0 else 0
        has_next = query_params.page < total_pages
        has_prev = query_params.page > 1

        meta = PaginationMeta(
            page=query_params.page,
            limit=query_params.limit,
            total_items=total_count,
            total_pages=total_pages,
            has_next=has_next,
            has_prev=has_prev,
        )

        # Convert ORM to Pydantic schemas
        items = [MovieResponse.model_validate(m) for m in movies]
        return PaginatedResponse(items=items, meta=meta)

    def get_trending_movies(self, limit: int = 10) -> List[Movie]:
        return self.movie_repo.get_trending(limit=limit)

    def get_popular_movies(self, limit: int = 10) -> List[Movie]:
        return self.movie_repo.get_popular(limit=limit)

    def get_top_rated_movies(self, limit: int = 10) -> List[Movie]:
        return self.movie_repo.get_top_rated(limit=limit)

    def get_all_genres(self) -> List[Genre]:
        return self.genre_repo.get_all_genres()
