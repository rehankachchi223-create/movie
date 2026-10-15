from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload
from app.database.models.watchlist import Watchlist
from app.database.models.movie import Movie
from app.repositories.base import BaseRepository


class WatchlistRepository(BaseRepository[Watchlist]):
    def __init__(self, db: Session):
        super().__init__(Watchlist, db)

    def get_by_user_and_movie(self, user_id: int, movie_id: int) -> Optional[Watchlist]:
        stmt = select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.movie_id == movie_id)
        return self.db.scalar(stmt)

    def get_user_watchlist(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Watchlist]:
        stmt = (
            select(Watchlist)
            .options(selectinload(Watchlist.movie).selectinload(Movie.genres))
            .where(Watchlist.user_id == user_id)
            .order_by(desc(Watchlist.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
