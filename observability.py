"""Structured JSON logs, request IDs, timing, simple metrics and health/readiness routes.

Nothing personal or secret should reach the logs: a redaction filter masks Algerian
phone numbers (keeping the last two digits) and removes API keys and bearer tokens
from every message and field, as a safety net behind careful logging calls.
"""
import hmac
import json
import logging
import re
import sys
import threading
import time
import uuid
from collections import Counter

from flask import Blueprint, g, jsonify, request

import config
import db

PHONE = re.compile(r"(?<!\d)(?:\+?213|0)\s?([567])(?:[\s.-]?\d){6}([\s.-]?\d)([\s.-]?\d)(?!\d)")
SECRETS = re.compile(r"(sk-ant-[A-Za-z0-9_\-]{8,}|Bearer\s+[A-Za-z0-9._\-]{8,})")
REQUEST_ID = re.compile(r"[A-Za-z0-9\-]{8,64}")

bp = Blueprint("observability", __name__)
_metrics = Counter()
_metrics_lock = threading.Lock()


def redact(text):
    text = SECRETS.sub("[redacted]", str(text))
    return PHONE.sub(lambda m: f"0{m.group(1)}******{m.group(2)[-1]}{m.group(3)[-1]}", text)


def mask_phone(phone):
    digits = "".join(ch for ch in str(phone) if ch.isdigit())
    return f"{digits[:2]}******{digits[-2:]}" if len(digits) >= 4 else "***"


class RedactingFilter(logging.Filter):
    def filter(self, record):
        record.msg = redact(record.getMessage())
        record.args = ()
        fields = getattr(record, "fields", None)
        if isinstance(fields, dict):
            record.fields = {k: redact(v) if isinstance(v, str) else v for k, v in fields.items()}
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)) + "Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None)
        if request_id:
            entry["request_id"] = request_id
        entry.update(getattr(record, "fields", None) or {})
        if record.exc_info:
            entry["error"] = redact(self.formatException(record.exc_info))  # stack traces stay in server logs
        return json.dumps(entry, ensure_ascii=False, default=str)


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        try:
            record.request_id = getattr(g, "request_id", None)
        except RuntimeError:  # outside a request
            record.request_id = None
        return True


def setup_logging():
    install_redaction()
    root = logging.getLogger()
    if any(getattr(h, "_store_handler", False) for h in root.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler._store_handler = True
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())
    handler.addFilter(RedactingFilter())
    root.addHandler(handler)
    root.setLevel(config.env_str("LOG_LEVEL", "INFO").upper() or "INFO")
    logging.getLogger("httpx").setLevel(logging.WARNING)


def install_redaction():
    """Redact every log message when the record is created, so all handlers and loggers get it."""
    current = logging.getLogRecordFactory()
    if getattr(current, "_store_redacting", False):
        return

    def factory(*args, **kwargs):
        record = current(*args, **kwargs)
        try:
            record.msg = redact(record.getMessage())
            record.args = ()
        except Exception:
            pass
        return record

    factory._store_redacting = True
    logging.setLogRecordFactory(factory)


def count(name, value=1):
    with _metrics_lock:
        _metrics[name] += value


def metrics_snapshot():
    with _metrics_lock:
        return dict(_metrics)


def init_app(app):
    log = logging.getLogger("store.http")

    @app.before_request
    def start_request():
        incoming = request.headers.get("X-Request-ID", "")
        g.request_id = incoming if REQUEST_ID.fullmatch(incoming) else uuid.uuid4().hex
        g.started = time.perf_counter()

    @app.after_request
    def finish_request(response):
        duration_ms = round((time.perf_counter() - getattr(g, "started", time.perf_counter())) * 1000, 1)
        endpoint = request.url_rule.rule if request.url_rule else "unmatched"
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")
        count(f"http.{request.method} {endpoint}.{response.status_code}")
        if endpoint not in ("/health", "/static/<path:filename>"):
            log.info("request", extra={"fields": {"method": request.method, "endpoint": endpoint,
                                                  "status": response.status_code, "duration_ms": duration_ms}})
        return response

    @app.errorhandler(Exception)
    def unexpected_error(exc):
        from werkzeug.exceptions import HTTPException
        if isinstance(exc, HTTPException):
            return jsonify({"error": exc.description, "code": exc.name.lower().replace(" ", "_")}), exc.code
        count("errors.unhandled")
        logging.getLogger("store.error").exception("unhandled error")
        return jsonify({"error": "حدث خطأ غير متوقع. · Une erreur inattendue s'est produite.",
                        "code": "server_error", "request_id": getattr(g, "request_id", None)}), 500

    app.register_blueprint(bp)


@bp.get("/ready")
def ready():
    """Readiness: the database answers. Liveness (/health) does not touch it."""
    try:
        db.ping()
        return jsonify({"status": "ready"})
    except Exception:
        logging.getLogger("store.error").exception("readiness check failed")
        return jsonify({"status": "unavailable"}), 503


@bp.get("/metrics")
def metrics():
    """Counters as JSON, behind METRICS_TOKEN; 404 while no token is configured."""
    token = config.metrics_token()
    if not token:
        return jsonify({"error": "Not found"}), 404
    sent = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(sent.encode(), token.encode()):
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(metrics_snapshot())
