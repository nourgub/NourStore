import hmac
import os
import threading
import time
from collections import defaultdict, deque
from functools import wraps

from dotenv import load_dotenv

load_dotenv()  # read .env before anything below looks at the environment

from flask import Flask, jsonify, render_template, request

import db
from agent import run_agent

MIN_ADMIN_TOKEN_LENGTH = 16
UNSAFE_ADMIN_TOKENS = {"change-me", "غيّر-هذا-الرمز-إلى-قيمة-سرية-قوية"}
MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_MESSAGES = 10

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False


class RateLimiter:
    """Small in-process sliding-window limiter, keyed by client IP.

    Enough for a single-server store; with several workers or servers, move
    this to Redis or the reverse proxy so the limit is shared.
    """

    def __init__(self, limit, window_seconds):
        self.limit, self.window = limit, window_seconds
        self.hits = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key):
        current = time.monotonic()
        with self.lock:
            hits = self.hits[key]
            while hits and current - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(current)
            return True


chat_limiter = RateLimiter(int(os.getenv("CHAT_LIMIT_PER_10_MIN", "30")), 600)
confirm_limiter = RateLimiter(10, 600)


def client_key():
    return request.remote_addr or "unknown"


def rate_limited(limiter):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not limiter.allow(client_key()):
                return jsonify({"error": "Too many requests. Please wait a few minutes."}), 429
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_token():
    """The configured admin token, or None when it is missing or unsafe."""
    token = os.getenv("ADMIN_TOKEN", "")
    if len(token) < MIN_ADMIN_TOKEN_LENGTH or token in UNSAFE_ADMIN_TOKENS:
        return None
    return token


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        expected = admin_token()
        if expected is None:
            return jsonify({"error": "Admin access is disabled: set a strong ADMIN_TOKEN (16+ characters) in .env."}), 503
        supplied = request.headers.get("X-Admin-Token", "")  # header only: query strings end up in logs
        if not hmac.compare_digest(supplied.encode(), expected.encode()):
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


def clean_history(history):
    """Keep only plain-text user/assistant turns from the browser.

    The browser is untrusted: tool blocks or other structured content are
    dropped, so a client cannot inject fake tool calls or tool results. Forged
    assistant text cannot place an order either, because orders are only
    created by the customer's confirmation click.
    """
    if not isinstance(history, list):
        return []
    cleaned = []
    for entry in history[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(entry, dict) or entry.get("role") not in {"user", "assistant"}:
            continue
        content = entry.get("content")
        if not isinstance(content, str) or not content.strip():
            continue
        cleaned.append({"role": entry["role"], "content": content[:MAX_MESSAGE_CHARS]})
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    return cleaned


@app.get("/")
def home():
    return render_template("chat.html", store_name=os.getenv("STORE_NAME", "متجري الذكي"))


@app.get("/admin")
def admin():
    return render_template("admin.html", store_name=os.getenv("STORE_NAME", "متجري الذكي"))


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/chat")
@rate_limited(chat_limiter)
def chat():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    if not message or len(message) > MAX_MESSAGE_CHARS:
        return jsonify({"error": f"Message is required and must be under {MAX_MESSAGE_CHARS} characters."}), 400
    messages = clean_history(payload.get("history", []))
    messages.append({"role": "user", "content": message})
    result = run_agent(messages)
    return jsonify({"reply": result["reply"], "proposal": result["proposal"]})


@app.post("/api/orders/confirm")
@rate_limited(confirm_limiter)
def confirm():
    payload = request.get_json(silent=True) or {}
    proposal_id = str(payload.get("proposal_id", ""))
    if not proposal_id:
        return jsonify({"error": "proposal_id is required"}), 400
    try:
        return jsonify(db.confirm_order(proposal_id)), 201
    except db.OrderError as exc:
        return jsonify({"error": str(exc)}), 409


@app.get("/api/products")
def products():
    return jsonify(db.list_products(request.args.get("keyword", ""), request.args.get("category", "")))


@app.get("/api/orders")
@admin_required
def orders():
    return jsonify(db.list_orders(request.args.get("status", "")))


@app.patch("/api/orders/<int:order_id>/status")
@admin_required
def order_status(order_id):
    payload = request.get_json(silent=True) or {}
    try:
        db.update_order_status(order_id, str(payload.get("status", "")))
        return jsonify({"ok": True})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


db.init_db()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5000")), debug=False)
