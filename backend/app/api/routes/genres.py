from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.movie import GenreResponse
from app.services.movie_service import MovieService

router = APIRouter(prefix="/genres", tags=["Genres"])


@router.get("", response_model=List[GenreResponse])
def get_genres(db: Session = Depends(get_db)):
    """Fetch list of all available movie genres."""
    movie_service = MovieService(db)
    return movie_service.get_all_genres()
