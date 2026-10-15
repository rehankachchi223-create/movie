from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.rating import RatingCreate, RatingUpdate, RatingResponse
from app.services.interaction_service import InteractionService

router = APIRouter(tags=["Ratings"])


@router.post("/ratings", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def create_rating(
    rating_in: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rate a movie."""
    service = InteractionService(db)
    return service.create_rating(user_id=current_user.id, rating_in=rating_in)


@router.put("/ratings/{movie_id}", response_model=RatingResponse)
def update_rating(
    movie_id: int,
    rating_in: RatingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing rating for a movie."""
    service = InteractionService(db)
    return service.update_rating(user_id=current_user.id, movie_id=movie_id, rating_in=rating_in)


@router.delete("/ratings/{movie_id}", response_model=MessageResponse)
def delete_rating(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete rating for a movie."""
    service = InteractionService(db)
    service.delete_rating(user_id=current_user.id, movie_id=movie_id)
    return MessageResponse(message="Rating deleted successfully.")


@router.get("/ratings/me", response_model=List[RatingResponse])
def get_my_ratings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all ratings submitted by the current user."""
    service = InteractionService(db)
    return service.get_user_ratings(user_id=current_user.id, skip=skip, limit=limit)


@router.get("/movies/{movie_id}/ratings", response_model=List[RatingResponse])
def get_movie_ratings(
    movie_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get ratings submitted for a specific movie."""
    service = InteractionService(db)
    return service.get_movie_ratings(movie_id=movie_id, skip=skip, limit=limit)
