from typing import List, Optional, Tuple
from sqlalchemy import select, func, extract, or_, desc, asc
from sqlalchemy.orm import Session, selectinload
from app.database.models.movie import Movie
from app.database.models.genre import Genre
from app.database.models.movie_genre import movie_genres
from app.repositories.base import BaseRepository
from recommendation.cache import rec_cache


class MovieRepository(BaseRepository[Movie]):
    def __init__(self, db: Session):
        super().__init__(Movie, db)

    def create(self, obj_in: Movie) -> Movie:
        result = super().create(obj_in)
        rec_cache.clear()
        return result

    def delete(self, obj: Movie) -> None:
        super().delete(obj)
        rec_cache.clear()

    def get_by_external_id(self, external_id: str) -> Optional[Movie]:
        stmt = select(Movie).where(Movie.external_id == str(external_id))
        return self.db.scalar(stmt)

    def get_with_genres(self, movie_id: int) -> Optional[Movie]:
        stmt = select(Movie).options(selectinload(Movie.genres)).where(Movie.id == movie_id)
        return self.db.scalar(stmt)

    def filter_movies(
        self,
        search: Optional[str] = None,
        genre_id: Optional[int] = None,
        year: Optional[int] = None,
        min_rating: Optional[float] = None,
        sort_by: str = "popular",
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Movie], int]:
        """Filter, search, sort, and paginate movies efficiently."""
        stmt = select(Movie).options(selectinload(Movie.genres))

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Movie.title.ilike(search_pattern),
                    Movie.overview.ilike(search_pattern),
                    Movie.director.ilike(search_pattern),
                )
            )

        if genre_id:
            stmt = stmt.join(movie_genres).where(movie_genres.c.genre_id == genre_id)

        if year:
            stmt = stmt.where(extract("year", Movie.release_date) == year)

        if min_rating is not None:
            stmt = stmt.where(Movie.rating >= min_rating)

        # Count total matching records before pagination
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Sorting logic
        if sort_by == "rating":
            stmt = stmt.order_by(desc(Movie.rating), desc(Movie.id))
        elif sort_by == "release_date":
            stmt = stmt.order_by(desc(Movie.release_date), desc(Movie.id))
        elif sort_by == "title":
            stmt = stmt.order_by(asc(Movie.title))
        else:  # "popular" default
            stmt = stmt.order_by(desc(Movie.rating), desc(Movie.release_date))

        # Pagination
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

        movies = list(self.db.scalars(stmt).all())
        return movies, total_count

    def get_trending(self, limit: int = 10) -> List[Movie]:
        """Fetch trending movies ordered by release date and rating."""
        stmt = (
            select(Movie)
            .options(selectinload(Movie.genres))
            .order_by(desc(Movie.release_date), desc(Movie.rating))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_popular(self, limit: int = 10) -> List[Movie]:
        """Fetch popular movies ordered by rating."""
        stmt = (
            select(Movie)
            .options(selectinload(Movie.genres))
            .order_by(desc(Movie.rating))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_top_rated(self, limit: int = 10) -> List[Movie]:
        """Fetch top rated movies (rating >= 7.0)."""
        stmt = (
            select(Movie)
            .options(selectinload(Movie.genres))
            .where(Movie.rating >= 7.0)
            .order_by(desc(Movie.rating))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_all_for_recommendations(self) -> List[Movie]:
        """Fetch all movies eager loading genres for vectorization."""
        stmt = select(Movie).options(selectinload(Movie.genres))
        return list(self.db.scalars(stmt).all())
