"""All runtime settings, read from environment variables (.env is loaded by app.py).

Read through functions rather than module constants so tests and the CLI can
change the environment without re-importing modules.
"""
import os


def env_str(name, default=""):
    return os.getenv(name, default).strip()


def env_int(name, default):
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def db_path():
    return env_str("DB_PATH", "data/store.db")


def demo_mode():
    """Demo mode allows the legacy ADMIN_TOKEN login. Never enable it in production."""
    return env_bool("DEMO_MODE", False)


def secret_key():
    return env_str("SECRET_KEY")


def secure_cookies():
    return env_bool("SESSION_COOKIE_SECURE", True)


def session_hours():
    return max(1, env_int("SESSION_HOURS", 8))


def hsts_enabled():
    """Only true when the app is really served over HTTPS (e.g. behind a TLS proxy)."""
    return env_bool("ENABLE_HSTS", False)


def cors_origins():
    return [origin.strip() for origin in env_str("CORS_ORIGINS").split(",") if origin.strip()]


def trusted_proxy_count():
    """Number of reverse proxies in front of the app whose X-Forwarded-For is trusted (0 = none)."""
    return max(0, env_int("TRUSTED_PROXY_COUNT", 0))


def max_request_bytes():
    return max(1024, env_int("MAX_REQUEST_BYTES", 32 * 1024))


def redis_url():
    return env_str("REDIS_URL")


def order_retention_days():
    """Closed orders older than this are anonymised by `flask purge-data` (0 = keep forever)."""
    return max(0, env_int("ORDER_RETENTION_DAYS", 365))


def proposal_retention_hours():
    return max(1, env_int("PROPOSAL_RETENTION_HOURS", 24))


def metrics_token():
    """Bearer token for /metrics; the endpoint is disabled while this is empty."""
    return env_str("METRICS_TOKEN")


def max_quantity_per_line():
    return max(1, env_int("MAX_QUANTITY_PER_LINE", 20))
