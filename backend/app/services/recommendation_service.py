from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.movie import MovieResponse
from app.schemas.recommendation import RecommendationItem, RecommendationResponse
from recommendation.content_based import ContentBasedRecommender
from recommendation.personalized import PersonalizedHybridRecommender


class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.content_recommender = ContentBasedRecommender()
        self.personalized_recommender = PersonalizedHybridRecommender()

    def get_similar_movies(
        self, movie_id: int, limit: int = 10, skip: int = 0
    ) -> RecommendationResponse:
        """Get content-based recommendations similar to target movie_id."""
        tuples, strategy = self.content_recommender.recommend(
            db=self.db, movie_id=movie_id, limit=limit, skip=skip
        )

        items = []
        for movie, score, explanation in tuples:
            items.append(
                RecommendationItem(
                    movie=MovieResponse.model_validate(movie),
                    similarity_score=score,
                    recommendation_type="content_based",
                    explanation=explanation,
                )
            )

        return RecommendationResponse(
            items=items,
            count=len(items),
            recommendation_type="similar_movies",
            strategy_used=strategy,
        )

    def get_personalized_recommendations(
        self, user_id: Optional[int] = None, limit: int = 10, skip: int = 0
    ) -> RecommendationResponse:
        """Get personalized hybrid recommendations for authenticated user or cold-start popular fallback."""
        tuples, strategy = self.personalized_recommender.recommend(
            db=self.db, user_id=user_id, limit=limit, skip=skip
        )

        items = []
        rec_type = "personalized_hybrid" if user_id and strategy != "cold_start_popular" else "cold_start_popular"

        for movie, score, explanation in tuples:
            items.append(
                RecommendationItem(
                    movie=MovieResponse.model_validate(movie),
                    similarity_score=score,
                    recommendation_type=rec_type,
                    explanation=explanation,
                )
            )

        return RecommendationResponse(
            items=items,
            count=len(items),
            recommendation_type=rec_type,
            strategy_used=strategy,
        )
