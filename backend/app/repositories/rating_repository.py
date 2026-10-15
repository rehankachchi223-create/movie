from typing import List, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session, selectinload
from app.database.models.rating import Rating
from app.database.models.movie import Movie
from app.repositories.base import BaseRepository


class RatingRepository(BaseRepository[Rating]):
    def __init__(self, db: Session):
        super().__init__(Rating, db)

    def get_user_rating_for_movie(self, user_id: int, movie_id: int) -> Optional[Rating]:
        stmt = select(Rating).where(Rating.user_id == user_id, Rating.movie_id == movie_id)
        return self.db.scalar(stmt)

    def get_user_ratings(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Rating]:
        stmt = (
            select(Rating)
            .options(selectinload(Rating.movie).selectinload(Movie.genres))
            .where(Rating.user_id == user_id)
            .order_by(desc(Rating.updated_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_movie_ratings(self, movie_id: int, skip: int = 0, limit: int = 50) -> List[Rating]:
        stmt = (
            select(Rating)
            .where(Rating.movie_id == movie_id)
            .order_by(desc(Rating.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def calculate_average_rating(self, movie_id: int) -> Optional[float]:
        stmt = select(func.avg(Rating.rating)).where(Rating.movie_id == movie_id)
        val = self.db.scalar(stmt)
        return round(float(val), 1) if val is not None else None
