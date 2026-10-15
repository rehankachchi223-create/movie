from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.movie import MovieResponse


class HistoryCreate(BaseModel):
    movie_id: int


class HistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    movie_id: int
    viewed_at: datetime
    movie: MovieResponse
