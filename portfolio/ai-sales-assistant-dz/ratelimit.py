"""Fixed-window rate limiting shared by every endpoint.

With REDIS_URL set, counters live in Redis and are shared by all workers and
containers. Without it (or if Redis cannot be reached at start-up) counters are
kept in this process only, which is correct for a single worker; a warning is
logged because each extra worker would then get its own budget.
"""
import logging
import threading
import time

import config

log = logging.getLogger("store.ratelimit")


def window_index(window_seconds, at=None):
    return int((time.time() if at is None else at) // window_seconds)


class MemoryLimiter:
    backend = "memory"

    def __init__(self):
        self.counts = {}
        self.lock = threading.Lock()

    def hit(self, key, limit, window_seconds):
        """Count one request. Returns True if it is within the limit."""
        if limit <= 0:
            return True
        bucket = (key, window_seconds, window_index(window_seconds))
        with self.lock:
            if len(self.counts) > 50_000:  # drop finished windows
                current = {k for k in self.counts if k[2] == window_index(k[1])}
                self.counts = {k: v for k, v in self.counts.items() if k in current}
            self.counts[bucket] = self.counts.get(bucket, 0) + 1
            return self.counts[bucket] <= limit

    def reset(self):
        with self.lock:
            self.counts.clear()


class RedisLimiter:
    backend = "redis"

    def __init__(self, client, fallback=None):
        self.client = client
        self.fallback = fallback or MemoryLimiter()

    def hit(self, key, limit, window_seconds):
        if limit <= 0:
            return True
        redis_key = f"ratelimit:{key}:{window_seconds}:{window_index(window_seconds)}"
        try:
            count = self.client.incr(redis_key)
            if count == 1:
                self.client.expire(redis_key, window_seconds + 5)
            return count <= limit
        except Exception:
            log.warning("redis rate limiter unavailable, using in-process counters for this request", exc_info=True)
            return self.fallback.hit(key, limit, window_seconds)

    def reset(self):
        self.fallback.reset()


def build_limiter(url=None, client_factory=None):
    """Return a Redis-backed limiter when REDIS_URL works, else the in-process one."""
    url = config.redis_url() if url is None else url
    if not url:
        log.warning("REDIS_URL not set: rate limits are per process; run a single worker or configure Redis")
        return MemoryLimiter()
    try:
        if client_factory is None:
            import redis
            client_factory = lambda u: redis.Redis.from_url(u, socket_timeout=0.5, socket_connect_timeout=0.5)
        client = client_factory(url)
        client.ping()
        return RedisLimiter(client)
    except Exception:
        log.warning("could not connect to Redis at start-up: falling back to per-process rate limits", exc_info=True)
        return MemoryLimiter()


def limits():
    """(max requests, window seconds) per category; all overridable from the environment."""
    return {
        "chat": (config.env_int("CHAT_LIMIT_PER_10_MIN", 30), 600),
        "confirm": (config.env_int("CONFIRM_LIMIT_PER_10_MIN", 10), 600),
        "status": (config.env_int("STATUS_LIMIT_PER_10_MIN", 20), 600),
        "login": (config.env_int("LOGIN_LIMIT_PER_15_MIN", 5), 900),
        "admin": (config.env_int("ADMIN_LIMIT_PER_MIN", 120), 60),
        "daily_chat": (config.env_int("DAILY_CHAT_LIMIT", 0), 86400),
    }
