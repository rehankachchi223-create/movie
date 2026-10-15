from typing import List, Optional, Tuple
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload
from app.database.models.movie import Movie
from recommendation.base import BaseRecommenderStrategy


class ColdStartRecommender(BaseRecommenderStrategy):
    """Cold-Start Recommender strategy for new users or anonymous guests."""

    @property
    def strategy_name(self) -> str:
        return "cold_start_popular"

    def recommend(
        self,
        db: Session,
        user_id: Optional[int] = None,
        movie_id: Optional[int] = None,
        limit: int = 10,
        skip: int = 0,
    ) -> Tuple[List[Tuple[Movie, float, str]], str]:
        """Return top-rated movies as fallback recommendations, prioritizing rated catalog entries."""
        # Rank by rating (prioritizing rated items over 0.0), then release date
        stmt = (
            select(Movie)
            .options(selectinload(Movie.genres))
            .order_by(
                desc(Movie.rating > 0.0),
                desc(Movie.rating),
                desc(Movie.release_date),
                desc(Movie.id),
            )
            .offset(skip)
            .limit(limit)
        )
        movies = list(db.scalars(stmt).all())

        results = []
        for movie in movies:
            score = round(float(movie.rating / 10.0), 4)
            explanation = f"Popular movie with a rating of {movie.rating}/10"
            results.append((movie, score, explanation))

        return results, self.strategy_name
