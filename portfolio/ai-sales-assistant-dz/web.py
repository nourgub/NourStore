"""Request helpers shared by the public and admin endpoints."""
from functools import wraps

from flask import jsonify, request

import ratelimit

RATE_LIMIT_MESSAGE = "طلبات كثيرة في وقت قصير، انتظر بضع دقائق. · Trop de demandes, réessayez dans quelques minutes."

# Replaced by app.py at start-up with a Redis-backed limiter when REDIS_URL works.
limiter = ratelimit.MemoryLimiter()


class BadRequest(ValueError):
    pass


def client_key():
    """Client IP. Behind a proxy this is only meaningful with TRUSTED_PROXY_COUNT set."""
    return request.remote_addr or "unknown"


def within_limit(category, key=None):
    limit, window = ratelimit.limits()[category]
    return limiter.hit(f"{category}:{key or client_key()}", limit, window)


def rate_limited(category):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not within_limit(category):
                return jsonify({"error": RATE_LIMIT_MESSAGE, "code": "rate_limited"}), 429
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def json_body():
    """The request's JSON object, or BadRequest for anything else."""
    if not request.is_json:
        raise BadRequest("Send a JSON body with Content-Type: application/json.")
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise BadRequest("The JSON body must be an object.")
    return payload


def int_arg(name, default, low=1, high=10_000):
    try:
        return min(high, max(low, int(request.args.get(name, default))))
    except ValueError:
        raise BadRequest(f"{name} must be a number") from None
