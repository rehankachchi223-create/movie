from typing import List, Optional
from pydantic import BaseModel
from app.schemas.movie import MovieResponse


class RecommendationItem(BaseModel):
    movie: MovieResponse
    similarity_score: Optional[float] = None
    recommendation_type: str = "personalized"  # e.g., "content_based", "personalized_hybrid", "cold_start_popular"
    explanation: Optional[str] = None


class RecommendationResponse(BaseModel):
    items: List[RecommendationItem]
    count: int
    recommendation_type: str
    strategy_used: str
