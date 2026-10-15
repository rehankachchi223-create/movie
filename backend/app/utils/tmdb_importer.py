import argparse
import json

from app.database.database import SessionLocal
from app.services.movie_data_service import MovieDataService


def run_import(max_pages: int, max_movies: int, start_year: int, end_year: int, page_size: int) -> dict:
    db = SessionLocal()
    try:
        service = MovieDataService(db)
        return service.import_hollywood_catalog(
            max_pages=max_pages,
            max_movies=max_movies,
            start_year=start_year,
            end_year=end_year,
            page_size=page_size,
        )
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Import a large TMDB-backed Hollywood/American movie catalog.")
    parser.add_argument("--max-pages", type=int, default=10, help="Maximum number of TMDB discover pages to fetch.")
    parser.add_argument("--max-movies", type=int, default=500, help="Maximum number of unique movie records to import.")
    parser.add_argument("--start-year", type=int, default=1900, help="Earliest release year to consider.")
    parser.add_argument("--end-year", type=int, default=2026, help="Latest release year to consider.")
    parser.add_argument("--page-size", type=int, default=20, help="Number of movies to inspect per page.")
    args = parser.parse_args()

    result = run_import(
        max_pages=args.max_pages,
        max_movies=args.max_movies,
        start_year=args.start_year,
        end_year=args.end_year,
        page_size=args.page_size,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
