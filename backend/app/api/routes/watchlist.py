from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.watchlist import WatchlistResponse, WatchlistStatusResponse
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.post("/{movie_id}", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a movie to user's watchlist."""
    service = InteractionService(db)
    return service.add_watchlist(user_id=current_user.id, movie_id=movie_id)


@router.delete("/{movie_id}", response_model=MessageResponse)
def remove_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a movie from user's watchlist."""
    service = InteractionService(db)
    service.remove_watchlist(user_id=current_user.id, movie_id=movie_id)
    return MessageResponse(message="Movie removed from watchlist.")


@router.get("", response_model=List[WatchlistResponse])
def get_user_watchlist(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all watchlist movies for current user."""
    service = InteractionService(db)
    return service.get_user_watchlist(user_id=current_user.id, skip=skip, limit=limit)


@router.get("/{movie_id}/status", response_model=WatchlistStatusResponse)
def get_watchlist_status(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if a specific movie is in user's watchlist."""
    service = InteractionService(db)
    in_wl = service.in_watchlist(user_id=current_user.id, movie_id=movie_id)
    return WatchlistStatusResponse(movie_id=movie_id, in_watchlist=in_wl)
