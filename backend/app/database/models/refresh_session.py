from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base

if TYPE_CHECKING:
    from app.database.models.user import User


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="refresh_sessions")

    def __repr__(self) -> str:
        return f"<RefreshSession(id={self.id}, user_id={self.user_id}, revoked={self.revoked})>"
