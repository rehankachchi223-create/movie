from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.database.models.movie import Movie


class BaseRecommenderStrategy(ABC):
    """Abstract Base Class for Recommendation Strategies."""

    @property
    @abstractmethod
    def strategy_name(self) -> str:
        """Name identifier of the strategy."""
        pass

    @abstractmethod
    def recommend(
        self,
        db: Session,
        user_id: Optional[int] = None,
        movie_id: Optional[int] = None,
        limit: int = 10,
        skip: int = 0,
    ) -> Tuple[List[Tuple[Movie, float, str]], str]:
        """Generate movie recommendations.

        Returns:
            Tuple containing:
            - List of tuples: (Movie instance, similarity/confidence score, explanation string)
            - strategy_used string
        """
        pass
