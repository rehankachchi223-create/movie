from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload
from app.database.models.history import ViewingHistory
from app.database.models.movie import Movie
from app.repositories.base import BaseRepository


class HistoryRepository(BaseRepository[ViewingHistory]):
    def __init__(self, db: Session):
        super().__init__(ViewingHistory, db)

    def get_by_user_and_movie(self, user_id: int, movie_id: int) -> Optional[ViewingHistory]:
        stmt = (
            select(ViewingHistory)
            .where(ViewingHistory.user_id == user_id, ViewingHistory.movie_id == movie_id)
            .order_by(desc(ViewingHistory.viewed_at))
        )
        return self.db.scalars(stmt).first()

    def get_user_history(self, user_id: int, skip: int = 0, limit: int = 50) -> List[ViewingHistory]:
        stmt = (
            select(ViewingHistory)
            .options(selectinload(ViewingHistory.movie).selectinload(Movie.genres))
            .where(ViewingHistory.user_id == user_id)
            .order_by(desc(ViewingHistory.viewed_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
