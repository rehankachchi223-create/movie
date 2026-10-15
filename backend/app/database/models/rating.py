from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, Integer, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base

if TYPE_CHECKING:
    from app.database.models.user import User
    from app.database.models.movie import Movie


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_user_movie_rating"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id: Mapped[int] = mapped_column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)  # 1.0 to 10.0 or 1.0 to 5.0

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
    user: Mapped["User"] = relationship("User", back_populates="ratings")
    movie: Mapped["Movie"] = relationship("Movie", back_populates="user_ratings")

    def __repr__(self) -> str:
        return f"<Rating(user_id={self.user_id}, movie_id={self.movie_id}, rating={self.rating})>"
