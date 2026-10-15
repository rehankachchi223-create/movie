from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database.models.genre import Genre
from app.repositories.base import BaseRepository


class GenreRepository(BaseRepository[Genre]):
    def __init__(self, db: Session):
        super().__init__(Genre, db)

    def get_by_name(self, name: str) -> Optional[Genre]:
        """Find genre by name."""
        stmt = select(Genre).where(Genre.name.ilike(name))
        return self.db.scalar(stmt)

    def get_all_genres(self) -> List[Genre]:
        """Fetch all genres ordered by name."""
        stmt = select(Genre).order_by(Genre.name.asc())
        return list(self.db.scalars(stmt).all())
