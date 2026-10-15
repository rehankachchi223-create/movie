from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base

if TYPE_CHECKING:
    from app.database.models.rating import Rating
    from app.database.models.favorite import Favorite
    from app.database.models.watchlist import Watchlist
    from app.database.models.history import ViewingHistory
    from app.database.models.refresh_session import RefreshSession


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    ratings: Mapped[List["Rating"]] = relationship("Rating", back_populates="user", cascade="all, delete-orphan")
    favorites: Mapped[List["Favorite"]] = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    watchlist: Mapped[List["Watchlist"]] = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    viewing_history: Mapped[List["ViewingHistory"]] = relationship("ViewingHistory", back_populates="user", cascade="all, delete-orphan")
    refresh_sessions: Mapped[List["RefreshSession"]] = relationship("RefreshSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"
