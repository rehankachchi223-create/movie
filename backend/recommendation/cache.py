import time
from typing import Any, Dict, Optional


class RecommendationCache:
    """In-memory recommendation & feature matrix cache with instant invalidation support."""

    def __init__(self, default_ttl_seconds: int = 3600):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl_seconds
        self.version: int = 0

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry["expires_at"]:
                return entry["value"]
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() + ttl,
        }

    def delete(self, key: str) -> None:
        self._cache.pop(key, None)

    def invalidate_catalog(self) -> None:
        """Immediately invalidate all cached models and recommendations when catalog changes."""
        self._cache.clear()
        self.version += 1

    def clear(self) -> None:
        """Clear cache immediately."""
        self.invalidate_catalog()


rec_cache = RecommendationCache()
