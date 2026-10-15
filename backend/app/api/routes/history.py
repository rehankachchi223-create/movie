from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.history import HistoryResponse
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/history", tags=["Viewing History"])


@router.post("/{movie_id}", response_model=HistoryResponse, status_code=status.HTTP_201_CREATED)
def record_viewing_history(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a movie view in user's viewing history."""
    service = InteractionService(db)
    return service.record_history(user_id=current_user.id, movie_id=movie_id)


@router.get("", response_model=List[HistoryResponse])
def get_user_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve viewing history for current user."""
    service = InteractionService(db)
    return service.get_user_history(user_id=current_user.id, skip=skip, limit=limit)


@router.delete("/{movie_id}", response_model=MessageResponse)
def delete_history_item(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a movie entry from user's viewing history."""
    service = InteractionService(db)
    service.delete_history_item(user_id=current_user.id, movie_id=movie_id)
    return MessageResponse(message="History record deleted.")
