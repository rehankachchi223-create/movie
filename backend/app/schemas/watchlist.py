from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.movie import MovieResponse


class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    movie_id: int
    created_at: datetime
    movie: MovieResponse


class WatchlistStatusResponse(BaseModel):
    movie_id: int
    in_watchlist: bool
