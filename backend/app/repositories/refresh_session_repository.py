from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database.models.refresh_session import RefreshSession
from app.repositories.base import BaseRepository


class RefreshSessionRepository(BaseRepository[RefreshSession]):
    def __init__(self, db: Session):
        super().__init__(RefreshSession, db)

    def create_session(
        self,
        user_id: int,
        token_hash: str,
        jti: str,
        expires_at: datetime,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> RefreshSession:
        session = RefreshSession(
            user_id=user_id,
            token_hash=token_hash,
            jti=jti,
            expires_at=expires_at,
            revoked=False,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        return self.create(session)

    def get_by_token_hash(self, token_hash: str) -> Optional[RefreshSession]:
        stmt = select(RefreshSession).where(RefreshSession.token_hash == token_hash)
        return self.db.scalar(stmt)

    def get_by_jti(self, jti: str) -> Optional[RefreshSession]:
        stmt = select(RefreshSession).where(RefreshSession.jti == jti)
        return self.db.scalar(stmt)

    def revoke_session(self, session: RefreshSession) -> None:
        session.revoked = True
        session.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def revoke_by_token_hash(self, token_hash: str) -> bool:
        session = self.get_by_token_hash(token_hash)
        if session:
            self.revoke_session(session)
            return True
        return False

    def revoke_all_for_user(self, user_id: int) -> int:
        stmt = (
            update(RefreshSession)
            .where(RefreshSession.user_id == user_id, RefreshSession.revoked == False)
            .values(revoked=True, updated_at=datetime.now(timezone.utc))
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount
