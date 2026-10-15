from datetime import datetime, date, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Float, Integer, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base
from app.database.models.movie_genre import movie_genres

if TYPE_CHECKING:
    from app.database.models.genre import Genre
    from app.database.models.rating import Rating
    from app.database.models.favorite import Favorite
    from app.database.models.watchlist import Watchlist
    from app.database.models.history import ViewingHistory


class Movie(Base):
    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    overview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tagline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, index=True, nullable=True)
    runtime: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # in minutes
    rating: Mapped[float] = mapped_column(Float, default=0.0, index=True, nullable=False)  # average rating (e.g. 0.0 - 10.0)
    poster_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    backdrop_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    director: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    cast_list: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # comma separated actors for content filtering
    keywords: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # comma separated keywords for content filtering

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Many-to-Many with Genre
    genres: Mapped[List["Genre"]] = relationship(
        "Genre", secondary=movie_genres, back_populates="movies"
    )

    # Relationships
    user_ratings: Mapped[List["Rating"]] = relationship("Rating", back_populates="movie", cascade="all, delete-orphan")
    favorites: Mapped[List["Favorite"]] = relationship("Favorite", back_populates="movie", cascade="all, delete-orphan")
    watchlist: Mapped[List["Watchlist"]] = relationship("Watchlist", back_populates="movie", cascade="all, delete-orphan")
    viewing_history: Mapped[List["ViewingHistory"]] = relationship("ViewingHistory", back_populates="movie", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Movie(id={self.id}, title='{self.title}', rating={self.rating})>"
