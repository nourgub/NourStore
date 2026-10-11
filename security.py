"""Security headers and CORS for every response.

Pages load scripts and styles only from /static (no inline code), which is what
lets the Content-Security-Policy forbid inline scripts entirely.
"""
from flask import request

import config

CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])
# Public endpoints another site may call when its origin is listed in CORS_ORIGINS.
CORS_PATHS = ("/api/chat", "/api/orders/confirm", "/api/orders/status", "/api/wilayas", "/api/products")


def _cors_allowed(origin):
    return bool(origin) and origin in config.cors_origins() and request.path in CORS_PATHS


def apply_headers(response):
    headers = response.headers
    headers["Content-Security-Policy"] = CSP
    headers["X-Content-Type-Options"] = "nosniff"
    headers["X-Frame-Options"] = "DENY"
    headers["Referrer-Policy"] = "same-origin"
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    headers["Cross-Origin-Opener-Policy"] = "same-origin"
    if config.hsts_enabled():
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.path.startswith("/api/"):
        headers["Cache-Control"] = "no-store"  # responses may contain personal data
    origin = request.headers.get("Origin", "")
    if _cors_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Methods"] = "GET, POST"
        headers["Access-Control-Allow-Headers"] = "Content-Type"
        headers["Access-Control-Max-Age"] = "600"
        headers.add("Vary", "Origin")
    return response


def preflight():
    """Answer CORS preflight requests for allowed origins; refuse the rest."""
    if request.method == "OPTIONS" and request.path.startswith("/api/"):
        from flask import make_response
        status = 204 if _cors_allowed(request.headers.get("Origin", "")) else 403
        return make_response("", status)
    return None
