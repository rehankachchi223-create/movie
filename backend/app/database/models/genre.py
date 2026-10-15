from typing import List, TYPE_CHECKING
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base

if TYPE_CHECKING:
    from app.database.models.movie import Movie


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Relationship to Movies via association
    movies: Mapped[List["Movie"]] = relationship(
        "Movie", secondary="movie_genres", back_populates="genres"
    )

    def __repr__(self) -> str:
        return f"<Genre(id={self.id}, name='{self.name}')>"
