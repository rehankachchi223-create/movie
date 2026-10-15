from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload
from app.database.models.favorite import Favorite
from app.database.models.movie import Movie
from app.repositories.base import BaseRepository


class FavoriteRepository(BaseRepository[Favorite]):
    def __init__(self, db: Session):
        super().__init__(Favorite, db)

    def get_by_user_and_movie(self, user_id: int, movie_id: int) -> Optional[Favorite]:
        stmt = select(Favorite).where(Favorite.user_id == user_id, Favorite.movie_id == movie_id)
        return self.db.scalar(stmt)

    def get_user_favorites(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Favorite]:
        stmt = (
            select(Favorite)
            .options(selectinload(Favorite.movie).selectinload(Movie.genres))
            .where(Favorite.user_id == user_id)
            .order_by(desc(Favorite.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
