import numpy as np
from typing import List, Optional, Tuple, Set
from sqlalchemy import select
from sqlalchemy.orm import Session
from sklearn.metrics.pairwise import cosine_similarity

from app.database.models.movie import Movie
from app.database.models.rating import Rating
from app.database.models.favorite import Favorite
from app.database.models.watchlist import Watchlist
from app.database.models.history import ViewingHistory
from recommendation.base import BaseRecommenderStrategy
from recommendation.content_based import ContentBasedRecommender
from recommendation.cold_start import ColdStartRecommender


class PersonalizedHybridRecommender(BaseRecommenderStrategy):
    """Personalized Hybrid Recommendation Engine.

    Aggregates user implicit and explicit interaction signals (ratings, favorites, watchlist, history),
    constructs a weighted user preference vector in TF-IDF feature space, and scores unseen movies
    on demand without dense all-pairs similarity matrix precomputation.
    """

    def __init__(self):
        self.content_recommender = ContentBasedRecommender()
        self.cold_start_recommender = ColdStartRecommender()

    @property
    def strategy_name(self) -> str:
        return "personalized_user_hybrid"

    def recommend(
        self,
        db: Session,
        user_id: Optional[int] = None,
        movie_id: Optional[int] = None,
        limit: int = 10,
        skip: int = 0,
    ) -> Tuple[List[Tuple[Movie, float, str]], str]:
        """Generate personalized recommendations for an authenticated user."""
        if user_id is None:
            return self.cold_start_recommender.recommend(db, limit=limit, skip=skip)

        # 1. Fetch user signals from DB
        ratings = list(db.scalars(select(Rating).where(Rating.user_id == user_id)).all())
        favorites = list(db.scalars(select(Favorite).where(Favorite.user_id == user_id)).all())
        watchlist = list(db.scalars(select(Watchlist).where(Watchlist.user_id == user_id)).all())
        history = list(db.scalars(select(ViewingHistory).where(ViewingHistory.user_id == user_id)).all())

        # Track set of already interacted movie IDs to exclude from recommendations
        seen_movie_ids: Set[int] = set()
        movie_weights: dict[int, float] = {}

        # Signal Weights:
        # Favorites: +3.0
        for fav in favorites:
            seen_movie_ids.add(fav.movie_id)
            movie_weights[fav.movie_id] = movie_weights.get(fav.movie_id, 0.0) + 3.0

        # Ratings >= 6.0: +(rating - 5.0) / 2.0
        for r in ratings:
            seen_movie_ids.add(r.movie_id)
            if r.rating >= 6.0:
                weight = (r.rating - 5.0) / 2.0
                movie_weights[r.movie_id] = movie_weights.get(r.movie_id, 0.0) + weight

        # Watchlist: +1.5
        for wl in watchlist:
            seen_movie_ids.add(wl.movie_id)
            movie_weights[wl.movie_id] = movie_weights.get(wl.movie_id, 0.0) + 1.5

        # Viewing History: +1.0
        for h in history:
            seen_movie_ids.add(h.movie_id)
            movie_weights[h.movie_id] = movie_weights.get(h.movie_id, 0.0) + 1.0

        # Cold-Start fallback if insufficient activity
        if not movie_weights:
            return self.cold_start_recommender.recommend(db, limit=limit, skip=skip)

        # 2. Retrieve sparse TF-IDF model and movie list
        movies, tfidf_matrix, _ = self.content_recommender.get_tfidf_model(db)
        if not movies or tfidf_matrix is None or tfidf_matrix.shape[0] == 0:
            return self.cold_start_recommender.recommend(db, limit=limit, skip=skip)

        movie_index_map = {m.id: i for i, m in enumerate(movies)}

        # 3. Compute weighted user preference profile vector in feature space
        total_weight = sum(movie_weights.values())
        if total_weight <= 0:
            return self.cold_start_recommender.recommend(db, limit=limit, skip=skip)

        user_vec = None
        for m_id, weight in movie_weights.items():
            if m_id in movie_index_map:
                idx = movie_index_map[m_id]
                normalized_weight = weight / total_weight
                m_vec = tfidf_matrix[idx] * normalized_weight
                if user_vec is None:
                    user_vec = m_vec.copy()
                else:
                    user_vec += m_vec

        if user_vec is None:
            return self.cold_start_recommender.recommend(db, limit=limit, skip=skip)

        # 4. On-demand cosine similarity between user vector and all candidate movies
        user_profile_scores = cosine_similarity(user_vec, tfidf_matrix).flatten()

        # 5. Rank candidate movies strictly excluding already seen ones
        ranked_indices = np.argsort(user_profile_scores)[::-1]

        results = []
        for idx in ranked_indices:
            candidate = movies[idx]
            if candidate.id in seen_movie_ids:
                continue

            score = round(float(user_profile_scores[idx]), 4)
            explanation = "Recommended based on your ratings, favorites, watchlist, and viewing history"
            results.append((candidate, score, explanation))

            if len(results) >= (skip + limit):
                break

        # Fallback if filtered results list is empty
        if not results:
            return self.cold_start_recommender.recommend(db, limit=limit, skip=skip)

        return results[skip : skip + limit], self.strategy_name
