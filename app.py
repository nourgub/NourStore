import hmac
import os
from functools import wraps

from dotenv import load_dotenv

load_dotenv()  # read .env before anything below looks at the environment

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

import config
import db
import ratelimit
from agent import run_agent

MIN_ADMIN_TOKEN_LENGTH = 16
UNSAFE_ADMIN_TOKENS = {"change-me", "غيّر-هذا-الرمز-إلى-قيمة-سرية-قوية"}
MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_ENTRIES = 50
DAILY_CAP_MESSAGE = "وصل العرض التجريبي إلى حدّه اليومي. عُد غدًا. · The demo has reached today's limit, please come back tomorrow."
RATE_LIMIT_MESSAGE = "طلبات كثيرة في وقت قصير، انتظر بضع دقائق. · Trop de demandes, réessayez dans quelques minutes."

app = Flask(__name__)
app.json.ensure_ascii = False  # return Arabic as readable UTF-8
app.config["MAX_CONTENT_LENGTH"] = config.max_request_bytes()
if config.trusted_proxy_count():
    # Trust X-Forwarded-For/Proto only from the configured number of proxies in front of the app.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=config.trusted_proxy_count(), x_proto=config.trusted_proxy_count())

limiter = ratelimit.build_limiter()


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


class BadRequest(ValueError):
    pass


def json_body():
    """The request's JSON object, or BadRequest for anything else."""
    if not request.is_json:
        raise BadRequest("Send a JSON body with Content-Type: application/json.")
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise BadRequest("The JSON body must be an object.")
    return payload


@app.errorhandler(BadRequest)
def bad_request(exc):
    return jsonify({"error": str(exc), "code": "bad_request"}), 400


@app.errorhandler(RequestEntityTooLarge)
def too_large(exc):
    return jsonify({"error": "Request body too large.", "code": "too_large"}), 413


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


def validate_history(history):
    """Reject malformed history outright; content-level filtering is done by clean_history."""
    if history is None:
        return []
    if not isinstance(history, list) or len(history) > MAX_HISTORY_ENTRIES:
        raise BadRequest(f"history must be a list of at most {MAX_HISTORY_ENTRIES} messages.")
    return history


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
@rate_limited("chat")
def chat():
    payload = json_body()
    message = payload.get("message")
    if not isinstance(message, str) or not message.strip() or len(message) > MAX_MESSAGE_CHARS:
        raise BadRequest(f"message is required and must be under {MAX_MESSAGE_CHARS} characters.")
    history = validate_history(payload.get("history"))
    if not within_limit("daily_chat", key="all"):
        return jsonify({"reply": DAILY_CAP_MESSAGE, "proposal": None, "code": "daily_limit"}), 429
    messages = clean_history(history)
    messages.append({"role": "user", "content": message.strip()})
    result = run_agent(messages)
    return jsonify({"reply": result["reply"], "proposal": result["proposal"]})


@app.post("/api/orders/confirm")
@rate_limited("confirm")
def confirm():
    proposal_id = json_body().get("proposal_id")
    if not isinstance(proposal_id, str) or not 8 <= len(proposal_id) <= 64:
        raise BadRequest("proposal_id is required")
    try:
        return jsonify(db.confirm_order(proposal_id)), 201
    except db.OrderError as exc:
        return jsonify({"error": str(exc), "code": exc.code}), 409


@app.get("/api/wilayas")
def wilaya_list():
    """Codes, names and server-side delivery fees, for the wilaya picker."""
    return jsonify([{"code": w["code"], "name_fr": w["name_fr"], "name_ar": w["name_ar"], "delivery_fee": w["delivery_fee"]}
                    for w in db.list_wilayas()])


@app.get("/api/products")
def products():
    return jsonify(db.list_products(request.args.get("keyword", ""), request.args.get("category", "")))


@app.get("/api/orders")
@rate_limited("admin")
@admin_required
def orders():
    return jsonify(db.list_orders(request.args.get("status", "")))


@app.patch("/api/orders/<int:order_id>/status")
@rate_limited("admin")
@admin_required
def order_status(order_id):
    payload = json_body()
    try:
        db.update_order_status(order_id, str(payload.get("status", "")))
        return jsonify({"ok": True})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


db.init_db()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5000")), debug=False)
