import time
from typing import Any, Dict, Optional, Tuple

_TTL_SECONDS = 12 * 60 * 60  # 12 hours

class TTLCache:
    def __init__(self, default_ttl: int = _TTL_SECONDS) -> None:
        self._store: Dict[str, Tuple[float, Any]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.time() > expires_at:
            # expired
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        ttl = ttl if ttl is not None else self._default_ttl
        self._store[key] = (time.time() + ttl, value)

# Process-wide cache instance
cache = TTLCache()

