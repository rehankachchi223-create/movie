from typing import List, Tuple
from sqlalchemy import inspect
from app.core.logging import logger

REQUIRED_TABLES = [
    "genres",
    "movies",
    "users",
    "movie_genres",
    "ratings",
    "favorites",
    "watchlist",
    "viewing_history",
    "refresh_sessions",
]


def check_db_schema_readiness(bind) -> Tuple[bool, List[str]]:
    """Inspect database schema and verify that all required application tables exist."""
    try:
        inspector = inspect(bind)
        existing_tables = set(inspector.get_table_names())
        missing_tables = [table for table in REQUIRED_TABLES if table not in existing_tables]
        return len(missing_tables) == 0, missing_tables
    except Exception as e:
        logger.error(f"Error inspecting database schema: {e}")
        return False, REQUIRED_TABLES
