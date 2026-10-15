from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
import time

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.database.models.genre import Genre
from app.database.models.movie import Movie
from app.repositories.genre_repository import GenreRepository
from app.repositories.movie_repository import MovieRepository
from app.utils.seed_data import INITIAL_GENRES, INITIAL_MOVIES
from recommendation.cache import rec_cache


class MovieDataService:
    """External Movie Data Provider Service (TMDB API Integration + Seeder)."""

    TMDB_BASE_URL = "https://api.themoviedb.org/3"

    def __init__(self, db: Session):
        self.db = db
        self.movie_repo = MovieRepository(db)
        self.genre_repo = GenreRepository(db)
        self.api_key = getattr(settings, "EXTERNAL_MOVIE_API_KEY", "") or getattr(settings, "TMDB_API_KEY", "")

    def seed_initial_data_if_empty(self) -> None:
        """Ensure genres and initial movie dataset exist in DB on startup."""
        try:
            genre_map: Dict[str, Genre] = {}
            for genre_name in INITIAL_GENRES:
                genre = self.genre_repo.get_by_name(genre_name)
                if not genre:
                    genre = Genre(name=genre_name)
                    self.genre_repo.create(genre)
                genre_map[genre_name] = genre

            if self.movie_repo.count() < len(INITIAL_MOVIES):
                logger.info("Seeding initial movie dataset into database...")
                for movie_data in INITIAL_MOVIES:
                    existing = self.movie_repo.get_by_external_id(movie_data["external_id"])
                    if not existing:
                        release_d = None
                        if movie_data.get("release_date"):
                            try:
                                release_d = datetime.strptime(movie_data["release_date"], "%Y-%m-%d").date()
                            except ValueError:
                                pass

                        movie = Movie(
                            external_id=movie_data["external_id"],
                            title=movie_data["title"],
                            overview=movie_data.get("overview"),
                            tagline=movie_data.get("tagline"),
                            release_date=release_d,
                            runtime=movie_data.get("runtime"),
                            rating=movie_data.get("rating", 0.0),
                            poster_url=movie_data.get("poster_url"),
                            backdrop_url=movie_data.get("backdrop_url"),
                            director=movie_data.get("director"),
                            cast_list=movie_data.get("cast_list"),
                            keywords=movie_data.get("keywords"),
                        )

                        for g_name in movie_data.get("genres", []):
                            if g_name in genre_map:
                                movie.genres.append(genre_map[g_name])

                        self.movie_repo.create(movie)
                logger.info("Movie dataset successfully seeded.")
        except Exception as e:
            logger.error(f"Failed to seed initial movie data: {e}", exc_info=True)

    def _http_get_json(self, url: str, params: Optional[Dict[str, Any]] = None, retry_count: int = 2) -> Optional[Dict[str, Any]]:
        """Perform a TMDB GET request with rate-limit aware retries."""
        if not self.api_key:
            logger.warning("No EXTERNAL_MOVIE_API_KEY provided; skipping external movie import.")
            return None

        request_params = {"api_key": self.api_key, "language": "en-US"}
        if params:
            request_params.update(params)

        for attempt in range(retry_count + 1):
            try:
                with httpx.Client(timeout=20.0) as client:
                    response = client.get(url, params=request_params)
                    if response.status_code == 429:
                        logger.warning("TMDB API rate limit reached. Retrying after backoff...")
                        if attempt < retry_count:
                            time.sleep(2 ** attempt)
                            continue
                        return None
                    if response.status_code >= 400:
                        logger.warning("TMDB API request failed with status %s for %s", response.status_code, url)
                        return None
                    return response.json()
            except httpx.HTTPError as exc:
                logger.warning("TMDB request failed for %s (attempt %s/%s): %s", url, attempt + 1, retry_count + 1, exc)
                if attempt < retry_count:
                    time.sleep(2 ** attempt)
                    continue
                return None
        return None

    def fetch_movie_from_external_provider(self, external_id: str) -> Optional[Dict[str, Any]]:
        """Fetch movie metadata from external TMDB API with rate limit & failure handling."""
        url = f"{self.TMDB_BASE_URL}/movie/{external_id.replace('tmdb-', '')}"
        params = {"append_to_response": "credits,keywords"}
        return self._http_get_json(url, params=params)

    def _normalize_date(self, value: Optional[str]) -> Optional[date]:
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            try:
                return datetime.strptime(value, "%Y-%m").date()
            except ValueError:
                return None

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _make_image_url(self, path: Optional[str], size: str = "w500") -> Optional[str]:
        if not path:
            return None
        return f"https://image.tmdb.org/t/p/{size}{path}"

    def _resolve_director(self, credits: Optional[Dict[str, Any]]) -> Optional[str]:
        if not isinstance(credits, dict):
            return None
        for person in credits.get("crew", []) or []:
            if person.get("job") == "Director":
                return person.get("name")
        return None

    def _resolve_cast(self, credits: Optional[Dict[str, Any]], limit: int = 8) -> Optional[str]:
        if not isinstance(credits, dict):
            return None
        cast_names = [person.get("name") for person in (credits.get("cast", []) or []) if person.get("name")]
        if not cast_names:
            return None
        return ", ".join(cast_names[:limit])

    def _resolve_keywords(self, data: Optional[Dict[str, Any]]) -> Optional[str]:
        if not isinstance(data, dict):
            return None
        keywords = data.get("keywords", {}).get("keywords", []) if isinstance(data.get("keywords"), dict) else []
        names = [item.get("name") for item in keywords if isinstance(item, dict) and item.get("name")]
        if not names:
            return None
        return ", ".join(names[:25])

    def _movie_record_from_tmdb(self, movie_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = movie_data.get("title") or movie_data.get("original_title")
        if not title:
            return None

        overview = movie_data.get("overview")
        tagline = movie_data.get("tagline")
        release_date = self._normalize_date(movie_data.get("release_date"))
        runtime = movie_data.get("runtime")
        rating = self._safe_float(movie_data.get("vote_average"), 0.0)
        poster_url = self._make_image_url(movie_data.get("poster_path"), "w500")
        backdrop_url = self._make_image_url(movie_data.get("backdrop_path"), "original")
        credits = movie_data.get("credits") or {}
        keywords = movie_data.get("keywords") or {}

        return {
            "external_id": f"tmdb-{movie_data.get('id')}",
            "title": title.strip(),
            "overview": overview.strip() if isinstance(overview, str) else overview,
            "tagline": tagline.strip() if isinstance(tagline, str) else tagline,
            "release_date": release_date,
            "runtime": int(runtime) if isinstance(runtime, (int, float)) else None,
            "rating": round(rating, 2),
            "poster_url": poster_url,
            "backdrop_url": backdrop_url,
            "director": self._resolve_director(credits),
            "cast_list": self._resolve_cast(credits),
            "keywords": self._resolve_keywords(keywords),
            "genres": [genre.get("name") for genre in movie_data.get("genres", []) if genre.get("name")],
        }

    def _ensure_genre(self, genre_name: str) -> Genre:
        genre = self.genre_repo.get_by_name(genre_name)
        if genre:
            return genre
        genre = Genre(name=genre_name)
        return self.genre_repo.create(genre)

    def _attach_genres(self, movie: Movie, genre_names: Iterable[str]) -> None:
        movie.genres = []
        for genre_name in genre_names:
            if not genre_name:
                continue
            movie.genres.append(self._ensure_genre(str(genre_name).strip()))

    def upsert_tmdb_movie(self, movie_data: Dict[str, Any]) -> bool:
        """Insert or update a movie using a TMDB payload while preventing duplicates."""
        if not movie_data:
            return False

        title = (movie_data.get("title") or "").strip()
        if not title:
            return False

        external_id = movie_data.get("external_id")
        existing: Optional[Movie] = None

        if external_id:
            existing = self.movie_repo.get_by_external_id(external_id)

        # Fallback check by title and release_date to prevent duplicate records
        if not existing and movie_data.get("release_date"):
            existing = (
                self.db.query(Movie)
                .filter(
                    Movie.title.ilike(title),
                    Movie.release_date == movie_data.get("release_date"),
                )
                .first()
            )

        if existing:
            # Update existing record
            existing.title = title
            if external_id and not existing.external_id:
                existing.external_id = external_id
            existing.overview = movie_data.get("overview", existing.overview)
            existing.tagline = movie_data.get("tagline", existing.tagline)
            existing.release_date = movie_data.get("release_date", existing.release_date)
            existing.runtime = movie_data.get("runtime", existing.runtime)
            existing.rating = movie_data.get("rating", existing.rating)
            existing.poster_url = movie_data.get("poster_url", existing.poster_url)
            existing.backdrop_url = movie_data.get("backdrop_url", existing.backdrop_url)
            existing.director = movie_data.get("director", existing.director)
            existing.cast_list = movie_data.get("cast_list", existing.cast_list)
            existing.keywords = movie_data.get("keywords", existing.keywords)
            if "genres" in movie_data:
                self._attach_genres(existing, movie_data.get("genres", []))
            self.db.commit()
            rec_cache.clear()
            return True

        movie = Movie(
            external_id=external_id,
            title=title,
            overview=movie_data.get("overview"),
            tagline=movie_data.get("tagline"),
            release_date=movie_data.get("release_date"),
            runtime=movie_data.get("runtime"),
            rating=movie_data.get("rating", 0.0),
            poster_url=movie_data.get("poster_url"),
            backdrop_url=movie_data.get("backdrop_url"),
            director=movie_data.get("director"),
            cast_list=movie_data.get("cast_list"),
            keywords=movie_data.get("keywords"),
        )
        self._attach_genres(movie, movie_data.get("genres", []))
        self.movie_repo.create(movie)
        rec_cache.clear()
        return True

    def import_hollywood_catalog(
        self,
        max_pages: int = 10,
        max_movies: int = 500,
        start_year: int = 1900,
        end_year: int = 2026,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Import a large, deduplicated Hollywood/American movie catalog from TMDB.

        This is safe to re-run: duplicate records are skipped using external IDs and a title+date fallback.
        """
        if not self.api_key:
            logger.warning("Skipping TMDB movie catalog import because EXTERNAL_MOVIE_API_KEY is not set.")
            return {"imported": 0, "skipped": 0, "pages": 0, "message": "No TMDB API key configured."}

        imported = 0
        skipped = 0
        pages_processed = 0

        for page in range(1, max_pages + 1):
            if imported >= max_movies:
                break

            data = self._http_get_json(
                f"{self.TMDB_BASE_URL}/discover/movie",
                params={
                    "sort_by": "popularity.desc",
                    "page": page,
                    "include_adult": "false",
                    "include_video": "false",
                    "with_origin_country": "US",
                    "primary_release_date.gte": f"{start_year}-01-01",
                    "primary_release_date.lte": f"{end_year}-12-31",
                    "vote_count.gte": "20",
                },
            )

            if not data or not isinstance(data, dict):
                break

            page_results = data.get("results", [])
            if not page_results:
                break

            pages_processed += 1

            for item in page_results[:page_size]:
                if imported >= max_movies:
                    break

                movie_id = item.get("id")
                if not movie_id:
                    continue

                detailed_movie = self.fetch_movie_from_external_provider(f"tmdb-{movie_id}")
                if not detailed_movie:
                    skipped += 1
                    continue

                normalized = self._movie_record_from_tmdb(detailed_movie)
                if not normalized:
                    skipped += 1
                    continue

                inserted = self.upsert_tmdb_movie(normalized)
                if inserted:
                    imported += 1
                else:
                    skipped += 1

            if not page_results:
                break

        logger.info(
            "TMDB catalog import finished: imported=%s skipped=%s pages=%s",
            imported,
            skipped,
            pages_processed,
        )

        return {
            "imported": imported,
            "skipped": skipped,
            "pages": pages_processed,
        }
