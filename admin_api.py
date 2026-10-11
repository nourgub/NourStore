"""Staff login and the admin API. Roles are enforced here, on the server.

- admin: users, products, stock and orders
- staff: view orders and change their status only

State-changing requests made with the session cookie must also send the
X-CSRF-Token header returned at login.
"""
import hmac
import logging
from functools import wraps

from flask import Blueprint, g, jsonify, request

import auth
import config
import db
import web
from web import BadRequest, json_body, rate_limited

log = logging.getLogger("store.admin")
bp = Blueprint("admin_api", __name__)

SESSION_COOKIE = "store_session"
MIN_DEMO_TOKEN_LENGTH = 16
UNSAFE_DEMO_TOKENS = {"change-me", "غيّر-هذا-الرمز-إلى-قيمة-سرية-قوية"}
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def demo_token():
    """The legacy shared ADMIN_TOKEN, honoured only in DEMO_MODE and only if strong."""
    token = config.env_str("ADMIN_TOKEN")
    if not config.demo_mode() or len(token) < MIN_DEMO_TOKEN_LENGTH or token in UNSAFE_DEMO_TOKENS:
        return None
    return token


def current_user():
    token = demo_token()
    supplied = request.headers.get("X-Admin-Token", "")
    if token and supplied and hmac.compare_digest(supplied.encode(), token.encode()):
        log.warning("admin request authenticated with the shared demo ADMIN_TOKEN (DEMO_MODE); not for production")
        return {"id": None, "username": "demo-admin", "role": "admin", "csrf_token": None, "via": "demo_token"}
    user = auth.session_user(request.cookies.get(SESSION_COOKIE))
    if user:
        user["via"] = "session"
    return user


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user:
                return jsonify({"error": "Login required.", "code": "unauthenticated"}), 401
            if user["role"] not in roles:
                return jsonify({"error": "Your role does not allow this action.", "code": "forbidden"}), 403
            if user["via"] == "session" and request.method in UNSAFE_METHODS:
                sent = request.headers.get("X-CSRF-Token", "")
                if not sent or not hmac.compare_digest(sent.encode(), user["csrf_token"].encode()):
                    return jsonify({"error": "Missing or invalid CSRF token.", "code": "csrf"}), 403
            g.user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def staff_or_admin(fn):
    return rate_limited("admin")(require_role("admin", "staff")(fn))


def admin_only(fn):
    return rate_limited("admin")(require_role("admin")(fn))


@bp.errorhandler(auth.AuthError)
def auth_error(exc):
    return jsonify({"error": str(exc), "code": "invalid"}), 400


@bp.errorhandler(db.NotFound)
def not_found(exc):
    return jsonify({"error": str(exc), "code": "not_found"}), 404


@bp.errorhandler(ValueError)
def invalid_value(exc):
    return jsonify({"error": str(exc), "code": "invalid"}), 400


# ---- login ----------------------------------------------------------------------------------

@bp.post("/api/auth/login")
def login():
    payload = json_body()
    username, password = payload.get("username"), payload.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        raise BadRequest("username and password are required")
    # Two limits: per client IP and per account, so neither one IP nor a botnet can grind one account.
    if not web.within_limit("login") or not web.within_limit("login", key="user:" + username.strip().lower()[:40]):
        log.warning("login rate limit reached")
        return jsonify({"error": web.RATE_LIMIT_MESSAGE, "code": "rate_limited"}), 429
    user = auth.authenticate(username, password)
    if not user:
        log.info("failed staff login")
        return jsonify({"error": "Wrong username or password.", "code": "invalid_credentials"}), 401
    token, csrf = auth.create_session(user["id"])
    log.info("staff login", extra={"fields": {"user_id": user["id"], "role": user["role"]}})
    response = jsonify({"user": {"username": user["username"], "role": user["role"]}, "csrf_token": csrf})
    response.set_cookie(SESSION_COOKIE, token, max_age=config.session_hours() * 3600, httponly=True,
                        secure=config.secure_cookies(), samesite="Strict", path="/")
    return response


@bp.post("/api/auth/logout")
@require_role("admin", "staff")
def logout():
    auth.end_session(request.cookies.get(SESSION_COOKIE))
    response = jsonify({"ok": True})
    response.delete_cookie(SESSION_COOKIE, path="/", secure=config.secure_cookies(), httponly=True, samesite="Strict")
    return response


@bp.get("/api/auth/me")
@require_role("admin", "staff")
def me():
    return jsonify({"user": {"username": g.user["username"], "role": g.user["role"]}, "csrf_token": g.user["csrf_token"]})


# ---- orders (staff and admin) ---------------------------------------------------------------

@bp.get("/api/admin/orders")
@bp.get("/api/orders")
@staff_or_admin
def orders():
    result = db.search_orders(status=request.args.get("status", ""), query=request.args.get("q", ""),
                              page=web.int_arg("page", 1), per_page=web.int_arg("per_page", 20, high=100))
    if request.path == "/api/orders":  # original endpoint returned a plain list
        return jsonify(result["items"])
    return jsonify(result)


@bp.patch("/api/admin/orders/<int:order_id>/status")
@bp.patch("/api/orders/<int:order_id>/status")
@staff_or_admin
def order_status(order_id):
    status = json_body().get("status")
    if status not in db.ORDER_STATUSES:
        raise BadRequest(f"status must be one of {', '.join(db.ORDER_STATUSES)}")
    db.update_order_status(order_id, status, actor=g.user["username"])
    return jsonify({"ok": True})


# ---- products (admin) -----------------------------------------------------------------------

@bp.get("/api/admin/products")
@admin_only
def products():
    return jsonify(db.search_products_admin(request.args.get("q", ""), web.int_arg("page", 1),
                                            web.int_arg("per_page", 20, high=100)))


@bp.post("/api/admin/products")
@admin_only
def create_product():
    return jsonify(db.create_product(g.user["username"], json_body())), 201


@bp.patch("/api/admin/products/<int:product_id>")
@admin_only
def update_product(product_id):
    return jsonify(db.update_product(g.user["username"], product_id, json_body()))


@bp.post("/api/admin/products/<int:product_id>/stock")
@admin_only
def adjust_stock(product_id):
    payload = json_body()
    if set(payload) - {"delta", "set_to"}:
        raise BadRequest("send delta or set_to")
    return jsonify(db.adjust_stock(g.user["username"], product_id, payload.get("delta"), payload.get("set_to")))


@bp.delete("/api/admin/products/<int:product_id>")
@admin_only
def archive_product(product_id):
    db.archive_product(g.user["username"], product_id)
    return jsonify({"ok": True})


@bp.get("/api/admin/products/<int:product_id>/audit")
@admin_only
def product_audit(product_id):
    return jsonify(db.audit_entries("product", product_id))


# ---- users (admin) --------------------------------------------------------------------------

@bp.get("/api/admin/users")
@admin_only
def users():
    return jsonify(auth.list_users())


@bp.post("/api/admin/users")
@admin_only
def create_user():
    payload = json_body()
    user = auth.create_user(payload.get("username", ""), payload.get("password", ""), payload.get("role", ""))
    return jsonify(user), 201


@bp.patch("/api/admin/users/<int:user_id>")
@admin_only
def update_user(user_id):
    return jsonify(auth.update_user(g.user["username"], user_id, json_body()))
