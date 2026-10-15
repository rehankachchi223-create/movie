import numpy as np
from typing import Any, List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.database.models.movie import Movie
from recommendation.base import BaseRecommenderStrategy
from recommendation.cache import rec_cache


class ContentBasedRecommender(BaseRecommenderStrategy):
    """Content-Based Filtering using TF-IDF text vectorization and On-Demand Cosine Similarity.

    Avoids generating or storing a dense N x N matrix in memory to ensure linear O(N) scaling.

    The TF-IDF matrix and ordered list of movie IDs are cached (not ORM objects), so cached
    data is always session-agnostic.  ORM objects are fetched fresh from the caller's session.
    """

    @property
    def strategy_name(self) -> str:
        return "content_based_tfidf"

    def _build_feature_document(self, movie: Movie) -> str:
        """Combine movie metadata (genres, overview, director, cast, keywords) into a single document string."""
        parts = [
            movie.title or "",
            movie.overview or "",
            movie.tagline or "",
            movie.director or "",
            movie.cast_list or "",
            movie.keywords or "",
        ]
        # Include genre names with higher weight
        if movie.genres:
            genre_names = " ".join([g.name for g in movie.genres])
            parts.append(genre_names)
            parts.append(genre_names)

        return " ".join(parts).lower()

    def get_tfidf_model(self, db: Session) -> Tuple[List[Movie], Any, Any]:
        """Fetch all movies, compute sparse TF-IDF feature matrix, and cache model.

        Only movie IDs and the sparse TF-IDF matrix are stored in the cache (no ORM objects),
        preventing detached-instance errors across sessions.

        Returns:
            movies   – ORM Movie objects fetched within the provided *db* session.
            tfidf_matrix – Sparse CSR matrix aligned to *movies* ordering.
            vectorizer   – Fitted TfidfVectorizer instance.
        """
        db_count = db.scalar(select(func.count(Movie.id))) or 0

        cached = rec_cache.get("tfidf_sparse_model")
        if cached:
            cached_movie_ids, tfidf_matrix, vectorizer = cached
            # Quick validation: if DB count matches cache, re-fetch ORM objects in current session
            if db_count == len(cached_movie_ids):
                id_to_idx = {mid: i for i, mid in enumerate(cached_movie_ids)}
                stmt = select(Movie).options(selectinload(Movie.genres)).where(
                    Movie.id.in_(cached_movie_ids)
                )
                fetched = {m.id: m for m in db.scalars(stmt).all()}
                # Reconstruct list in original cache order (matrix rows must align)
                movies = [fetched[mid] for mid in cached_movie_ids if mid in fetched]
                if len(movies) == len(cached_movie_ids):
                    return movies, tfidf_matrix, vectorizer
                # Fall through to rebuild if any movie is missing

        # Fetch all movies from database with genres eager loaded
        stmt = select(Movie).options(selectinload(Movie.genres))
        movies = list(db.scalars(stmt).all())

        if not movies:
            return [], None, None

        documents = [self._build_feature_document(m) for m in movies]

        # Fit TF-IDF Vectorizer
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),
        )
        tfidf_matrix = vectorizer.fit_transform(documents)

        # Cache only movie IDs (not ORM objects) + sparse matrix + vectorizer
        movie_ids = [m.id for m in movies]
        rec_cache.set("tfidf_sparse_model", (movie_ids, tfidf_matrix, vectorizer), ttl_seconds=1800)
        return movies, tfidf_matrix, vectorizer

    def get_similarity_matrix(self, db: Session) -> Tuple[List[Movie], np.ndarray]:
        """Backward-compatible helper that computes full similarity matrix if explicitly required."""
        movies, tfidf_matrix, _ = self.get_tfidf_model(db)
        if not movies or tfidf_matrix is None or tfidf_matrix.shape[0] == 0:
            return [], np.array([])
        sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        return movies, sim_matrix

    def recommend(
        self,
        db: Session,
        user_id: Optional[int] = None,
        movie_id: Optional[int] = None,
        limit: int = 10,
        skip: int = 0,
    ) -> Tuple[List[Tuple[Movie, float, str]], str]:
        """Find similar movies to target movie_id using on-demand sparse cosine similarity."""
        if movie_id is None:
            return [], self.strategy_name

        movies, tfidf_matrix, _ = self.get_tfidf_model(db)
        if not movies or tfidf_matrix is None or tfidf_matrix.shape[0] == 0:
            return [], self.strategy_name

        movie_index_map = {m.id: i for i, m in enumerate(movies)}
        if movie_id not in movie_index_map:
            return [], self.strategy_name

        target_idx = movie_index_map[movie_id]
        target_movie = movies[target_idx]
        target_vec = tfidf_matrix[target_idx]

        # Compute cosine similarity for target movie against all movies on demand
        sim_scores_row = cosine_similarity(target_vec, tfidf_matrix).flatten()

        sim_scores = list(enumerate(sim_scores_row))
        sim_scores.sort(key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in sim_scores:
            candidate = movies[idx]
            # Exclude the target movie itself
            if candidate.id == movie_id:
                continue

            explanation = f"Similar metadata, genres, or theme to '{target_movie.title}'"
            results.append((candidate, round(float(score), 4), explanation))

            if len(results) >= (skip + limit):
                break

        paginated_results = results[skip : skip + limit]
        return paginated_results, self.strategy_name
