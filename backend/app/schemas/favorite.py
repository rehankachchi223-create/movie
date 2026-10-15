from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.movie import MovieResponse


class FavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    movie_id: int
    created_at: datetime
    movie: MovieResponse


class FavoriteStatusResponse(BaseModel):
    movie_id: int
    is_favorite: bool
