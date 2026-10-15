from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base

if TYPE_CHECKING:
    from app.database.models.user import User
    from app.database.models.movie import Movie


class Watchlist(Base):
    __tablename__ = "watchlist"
    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_user_movie_watchlist"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id: Mapped[int] = mapped_column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="watchlist")
    movie: Mapped["Movie"] = relationship("Movie", back_populates="watchlist")

    def __repr__(self) -> str:
        return f"<Watchlist(user_id={self.user_id}, movie_id={self.movie_id})>"
