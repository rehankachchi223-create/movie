from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.movie import MovieResponse


class RatingCreate(BaseModel):
    movie_id: int
    rating: float = Field(..., ge=0.5, le=10.0, examples=[8.5])


class RatingUpdate(BaseModel):
    rating: float = Field(..., ge=0.5, le=10.0, examples=[9.0])


class RatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    movie_id: int
    rating: float
    created_at: datetime
    updated_at: datetime
    movie: MovieResponse
