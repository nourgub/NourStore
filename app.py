import getpass
import os

from dotenv import load_dotenv

load_dotenv()  # read .env before anything below looks at the environment

import click
from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

import admin_api
import auth
import config
import db
import observability
import ratelimit
import security
import web
from agent import run_agent
from web import BadRequest, json_body, rate_limited, within_limit

MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_ENTRIES = 50
DAILY_CAP_MESSAGE = "وصل العرض التجريبي إلى حدّه اليومي. عُد غدًا. · The demo has reached today's limit, please come back tomorrow."

# Customer-facing texts for order problems, by OrderError code: (Arabic, French).
ORDER_MESSAGES = {
    "proposal_not_found": ("لم نجد ملخص الطلب هذا.", "Ce récapitulatif de commande est introuvable."),
    "already_confirmed": ("تم تأكيد هذا الطلب من قبل.", "Cette commande est déjà confirmée."),
    "proposal_expired": ("انتهت صلاحية ملخص الطلب. اطلبه من المساعد مرة أخرى.", "Ce récapitulatif a expiré. Redemandez-le à l'assistant."),
    "stock_changed": ("تغيّر المخزون قبل التأكيد، ولم يعد هذا المنتج متوفرًا بهذه الكمية.",
                      "Le stock a changé avant la confirmation : ce produit n'est plus disponible en cette quantité."),
}

observability.setup_logging()
app = Flask(__name__)
app.json.ensure_ascii = False  # return Arabic as readable UTF-8
app.config["MAX_CONTENT_LENGTH"] = config.max_request_bytes()
if config.trusted_proxy_count():
    # Trust X-Forwarded-For/Proto only from the configured number of proxies in front of the app.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=config.trusted_proxy_count(), x_proto=config.trusted_proxy_count())

limiter = web.limiter = ratelimit.build_limiter()
app.register_blueprint(admin_api.bp)
observability.init_app(app)
app.before_request(security.preflight)
app.after_request(security.apply_headers)


@app.errorhandler(BadRequest)
def bad_request(exc):
    return jsonify({"error": str(exc), "code": "bad_request"}), 400


@app.errorhandler(RequestEntityTooLarge)
def too_large(exc):
    return jsonify({"error": "Request body too large.", "code": "too_large"}), 413


def store_name():
    return os.getenv("STORE_NAME", "متجري الذكي")


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


# ---- pages ----------------------------------------------------------------------------------

@app.get("/")
def home():
    return render_template("chat.html", store_name=store_name())


@app.get("/admin")
def admin():
    return render_template("admin.html", store_name=store_name())


@app.get("/privacy")
def privacy():
    return render_template("privacy.html", store_name=store_name(),
                           retention_days=config.order_retention_days(),
                           proposal_hours=config.proposal_retention_hours())


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


# ---- public API -----------------------------------------------------------------------------

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
        ar, fr = ORDER_MESSAGES.get(exc.code, (str(exc), str(exc)))
        return jsonify({"error": f"{ar} · {fr}", "code": exc.code}), 409


@app.post("/api/orders/status")
@rate_limited("status")
def order_status_lookup():
    """Customers check an order with its number AND the phone used. POST keeps the phone out of URLs and logs."""
    payload = json_body()
    order_id, phone = payload.get("order_id"), payload.get("phone")
    if isinstance(order_id, bool) or not isinstance(order_id, (int, str)) or not isinstance(phone, str) or len(phone) > 20:
        raise BadRequest("order_id and phone are required")
    status = db.order_status_for_customer(order_id, phone)
    if not status:
        return jsonify({"error": "لم نجد طلبًا بهذا الرقم وهذا الهاتف. · Aucune commande avec ce numéro et ce téléphone.",
                        "code": "not_found"}), 404
    return jsonify(status)


@app.get("/api/wilayas")
def wilaya_list():
    """Codes, names and server-side delivery fees, for the wilaya picker."""
    return jsonify([{"code": w["code"], "name_fr": w["name_fr"], "name_ar": w["name_ar"], "delivery_fee": w["delivery_fee"]}
                    for w in db.list_wilayas()])


@app.get("/api/products")
def products():
    return jsonify(db.list_products(request.args.get("keyword", ""), request.args.get("category", "")))


# ---- management commands --------------------------------------------------------------------

@app.cli.command("migrate")
def migrate_command():
    """Apply pending database migrations."""
    applied = db.migrations.migrate(db.db_path())
    click.echo(f"Applied migrations: {applied or 'none (already up to date)'}")


@app.cli.command("create-user")
@click.option("--username", required=True)
@click.option("--role", type=click.Choice(auth.ROLES), default="staff", show_default=True)
def create_user_command(username, role):
    """Create a staff account. The password is read from STAFF_PASSWORD or asked interactively."""
    password = os.getenv("STAFF_PASSWORD") or getpass.getpass("Password (12+ characters): ")
    try:
        user = auth.create_user(username, password, role)
    except auth.AuthError as exc:
        raise click.ClickException(str(exc))
    click.echo(f"Created {user['role']} '{user['username']}'.")


@app.cli.command("purge-data")
def purge_data_command():
    """Apply the retention policy: anonymise old closed orders, delete old proposals and sessions."""
    orders = db.anonymize_old_orders(config.order_retention_days())
    proposals = db.delete_old_proposals(config.proposal_retention_hours())
    sessions = auth.delete_expired_sessions()
    click.echo(f"Anonymised {orders} orders, deleted {proposals} proposals and {sessions} expired sessions.")


db.init_db()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5000")), debug=False)
