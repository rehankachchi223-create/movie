from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.models.favorite import Favorite
from app.database.models.history import ViewingHistory
from app.database.models.movie import Movie
from app.database.models.rating import Rating
from app.database.models.watchlist import Watchlist
from app.repositories.favorite_repository import FavoriteRepository
from app.repositories.history_repository import HistoryRepository
from app.repositories.movie_repository import MovieRepository
from app.repositories.rating_repository import RatingRepository
from app.repositories.watchlist_repository import WatchlistRepository
from app.schemas.rating import RatingCreate, RatingUpdate


class InteractionService:
    def __init__(self, db: Session):
        self.db = db
        self.movie_repo = MovieRepository(db)
        self.rating_repo = RatingRepository(db)
        self.favorite_repo = FavoriteRepository(db)
        self.watchlist_repo = WatchlistRepository(db)
        self.history_repo = HistoryRepository(db)

    def _ensure_movie_exists(self, movie_id: int) -> Movie:
        movie = self.movie_repo.get_by_id(movie_id)
        if not movie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Movie with ID {movie_id} does not exist.",
            )
        return movie

    def _recalculate_movie_rating(self, movie_id: int) -> None:
        avg_rating = self.rating_repo.calculate_average_rating(movie_id)
        movie = self.movie_repo.get_by_id(movie_id)
        if movie and avg_rating is not None:
            movie.rating = avg_rating
            self.db.commit()

    # --- RATINGS ---
    def create_rating(self, user_id: int, rating_in: RatingCreate) -> Rating:
        self._ensure_movie_exists(rating_in.movie_id)
        existing = self.rating_repo.get_user_rating_for_movie(user_id, rating_in.movie_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating already exists for this movie. Use PUT to update.",
            )
        rating_obj = Rating(
            user_id=user_id,
            movie_id=rating_in.movie_id,
            rating=rating_in.rating,
        )
        created = self.rating_repo.create(rating_obj)
        self._recalculate_movie_rating(rating_in.movie_id)
        return created

    def update_rating(self, user_id: int, movie_id: int, rating_in: RatingUpdate) -> Rating:
        self._ensure_movie_exists(movie_id)
        existing = self.rating_repo.get_user_rating_for_movie(user_id, movie_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rating not found for this user and movie.",
            )
        existing.rating = rating_in.rating
        existing.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(existing)
        self._recalculate_movie_rating(movie_id)
        return existing

    def delete_rating(self, user_id: int, movie_id: int) -> None:
        existing = self.rating_repo.get_user_rating_for_movie(user_id, movie_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rating not found.",
            )
        self.rating_repo.delete(existing)
        self._recalculate_movie_rating(movie_id)

    def get_user_ratings(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Rating]:
        return self.rating_repo.get_user_ratings(user_id, skip=skip, limit=limit)

    def get_movie_ratings(self, movie_id: int, skip: int = 0, limit: int = 50) -> List[Rating]:
        self._ensure_movie_exists(movie_id)
        return self.rating_repo.get_movie_ratings(movie_id, skip=skip, limit=limit)

    # --- FAVORITES ---
    def add_favorite(self, user_id: int, movie_id: int) -> Favorite:
        self._ensure_movie_exists(movie_id)
        existing = self.favorite_repo.get_by_user_and_movie(user_id, movie_id)
        if existing:
            return existing
        fav = Favorite(user_id=user_id, movie_id=movie_id)
        return self.favorite_repo.create(fav)

    def remove_favorite(self, user_id: int, movie_id: int) -> None:
        existing = self.favorite_repo.get_by_user_and_movie(user_id, movie_id)
        if existing:
            self.favorite_repo.delete(existing)

    def get_user_favorites(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Favorite]:
        return self.favorite_repo.get_user_favorites(user_id, skip=skip, limit=limit)

    def is_favorite(self, user_id: int, movie_id: int) -> bool:
        return self.favorite_repo.get_by_user_and_movie(user_id, movie_id) is not None

    # --- WATCHLIST ---
    def add_watchlist(self, user_id: int, movie_id: int) -> Watchlist:
        self._ensure_movie_exists(movie_id)
        existing = self.watchlist_repo.get_by_user_and_movie(user_id, movie_id)
        if existing:
            return existing
        wl = Watchlist(user_id=user_id, movie_id=movie_id)
        return self.watchlist_repo.create(wl)

    def remove_watchlist(self, user_id: int, movie_id: int) -> None:
        existing = self.watchlist_repo.get_by_user_and_movie(user_id, movie_id)
        if existing:
            self.watchlist_repo.delete(existing)

    def get_user_watchlist(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Watchlist]:
        return self.watchlist_repo.get_user_watchlist(user_id, skip=skip, limit=limit)

    def in_watchlist(self, user_id: int, movie_id: int) -> bool:
        return self.watchlist_repo.get_by_user_and_movie(user_id, movie_id) is not None

    # --- VIEWING HISTORY ---
    def record_history(self, user_id: int, movie_id: int) -> ViewingHistory:
        self._ensure_movie_exists(movie_id)
        # Avoid creating duplicate history records within the same minute
        existing = self.history_repo.get_by_user_and_movie(user_id, movie_id)
        if existing:
            # Update viewed_at timestamp instead of duplicating
            existing.viewed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        history_item = ViewingHistory(user_id=user_id, movie_id=movie_id)
        return self.history_repo.create(history_item)

    def get_user_history(self, user_id: int, skip: int = 0, limit: int = 50) -> List[ViewingHistory]:
        return self.history_repo.get_user_history(user_id, skip=skip, limit=limit)

    def delete_history_item(self, user_id: int, movie_id: int) -> None:
        existing = self.history_repo.get_by_user_and_movie(user_id, movie_id)
        if existing:
            self.history_repo.delete(existing)
