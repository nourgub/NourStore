import os
from functools import wraps
from flask import Flask, jsonify, render_template, request

import db
from agent import run_agent

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "change-me")


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        supplied = request.headers.get("X-Admin-Token", "") or request.args.get("token", "")
        if not ADMIN_TOKEN or supplied != ADMIN_TOKEN:
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


@app.before_request
def ensure_db():
    db.init_db()


@app.get("/")
def home():
    return render_template("chat.html", store_name=os.getenv("STORE_NAME", "متجري الذكي"))


@app.get("/admin")
def admin():
    return render_template("admin.html", store_name=os.getenv("STORE_NAME", "متجري الذكي"))


@app.get("/health")
def health():
    return jsonify({"status": "ok", "database": str(db.DB_PATH)})


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    history = payload.get("history", [])
    if not message or len(message) > 2000:
        return jsonify({"error": "Message is required and must be under 2000 characters."}), 400
    safe_history = [m for m in history[-10:] if isinstance(m, dict) and m.get("role") in {"user", "assistant"}]
    safe_history.append({"role": "user", "content": message})
    return jsonify({"reply": run_agent(safe_history)})


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


@app.post("/api/orders")
def direct_order():
    payload = request.get_json(silent=True) or {}
    required = ["customer", "phone", "wilaya", "items", "confirmed"]
    if any(key not in payload for key in required):
        return jsonify({"error": "customer, phone, wilaya, items and confirmed are required"}), 400
    result = db.create_order(payload["customer"], payload["phone"], payload["wilaya"], payload["items"], bool(payload["confirmed"]))
    return jsonify(result), 201 if "order_id" in result else 400


if __name__ == "__main__":
    db.init_db()
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "5000")), debug=False)
