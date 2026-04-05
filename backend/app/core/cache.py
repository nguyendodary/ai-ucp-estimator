import hashlib
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class Cache:
    """Simple in-memory cache with TTL for AI responses."""

    def __init__(self, ttl: int = 3600):
        self._store: dict[str, tuple[Any, float]] = {}
        self._ttl = ttl

    def _make_key(self, text: str) -> str:
        """Create a deterministic cache key from input text."""
        return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()

    def get(self, text: str) -> Optional[Any]:
        """Retrieve cached result if it exists and hasn't expired."""
        import time

        key = self._make_key(text)
        entry = self._store.get(key)
        if entry is None:
            return None
        value, timestamp = entry
        if time.time() - timestamp > self._ttl:
            del self._store[key]
            logger.info("Cache expired for key %s", key[:16])
            return None
        logger.info("Cache hit for key %s", key[:16])
        return value

    def set(self, text: str, value: Any) -> None:
        """Store a result in the cache with current timestamp."""
        import time

        key = self._make_key(text)
        self._store[key] = (value, time.time())
        logger.info("Cache set for key %s", key[:16])

    def clear(self) -> None:
        """Clear all cached entries."""
        self._store.clear()
        logger.info("Cache cleared")


# Singleton instance
cache = Cache(ttl=3600)
