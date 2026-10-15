from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.favorite import FavoriteResponse, FavoriteStatusResponse
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.post("/{movie_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a movie to user's favorites list."""
    service = InteractionService(db)
    return service.add_favorite(user_id=current_user.id, movie_id=movie_id)


@router.delete("/{movie_id}", response_model=MessageResponse)
def remove_favorite(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a movie from user's favorites list."""
    service = InteractionService(db)
    service.remove_favorite(user_id=current_user.id, movie_id=movie_id)
    return MessageResponse(message="Movie removed from favorites.")


@router.get("", response_model=List[FavoriteResponse])
def get_user_favorites(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all favorite movies for current user."""
    service = InteractionService(db)
    return service.get_user_favorites(user_id=current_user.id, skip=skip, limit=limit)


@router.get("/{movie_id}/status", response_model=FavoriteStatusResponse)
def get_favorite_status(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if a specific movie is in user's favorites list."""
    service = InteractionService(db)
    is_fav = service.is_favorite(user_id=current_user.id, movie_id=movie_id)
    return FavoriteStatusResponse(movie_id=movie_id, is_favorite=is_fav)
