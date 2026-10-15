from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("", response_model=RecommendationResponse)
def get_personalized_recommendations(
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Retrieve personalized hybrid recommendations for authenticated users or cold-start fallback for guests."""
    rec_service = RecommendationService(db)
    user_id = current_user.id if current_user else None
    return rec_service.get_personalized_recommendations(user_id=user_id, limit=limit, skip=skip)
