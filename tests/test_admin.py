"""Staff accounts, roles, CSRF, product administration, headers, CORS, privacy and CLI."""
import logging
from datetime import timedelta

import pytest

ADMIN_PW, STAFF_PW = "admin-password-123", "staff-password-123"


@pytest.fixture()
def site(make_app):
    app = make_app(SESSION_COOKIE_SECURE="false", DEMO_MODE="false", ADMIN_TOKEN="")
    import auth
    auth.create_user("boss", ADMIN_PW, "admin")
    auth.create_user("clerk", STAFF_PW, "staff")
    return app


def login(client, username, password, **kwargs):
    response = client.post("/api/auth/login", json={"username": username, "password": password}, **kwargs)
    return response, (response.get_json() or {}).get("csrf_token", "")


def make_order(app, status="pending"):
    import db
    proposal = db.propose_order("Amina B", "0555123456", "Oran", [{"product_id": 5, "quantity": 1}])
    order_id = db.confirm_order(proposal["proposal_id"])["order_id"]
    if status != "pending":
        db.update_order_status(order_id, status)
    return order_id


# ---- login and sessions ------------------------------------------------------------------

def test_login_sets_a_protected_session_cookie(site):
    client = site.app.test_client()
    response, csrf = login(client, "boss", ADMIN_PW)
    assert response.status_code == 200 and csrf
    cookie = response.headers["Set-Cookie"]
    assert "store_session=" in cookie and "HttpOnly" in cookie and "SameSite=Strict" in cookie
    assert client.get("/api/auth/me").get_json()["user"] == {"username": "boss", "role": "admin"}


def test_cookie_is_secure_by_default(make_app):
    app = make_app(DEMO_MODE="false")
    import auth
    auth.create_user("boss", ADMIN_PW, "admin")
    response, _ = login(app.app.test_client(), "boss", ADMIN_PW)
    assert "Secure" in response.headers["Set-Cookie"]


@pytest.mark.parametrize("username, password", [("boss", "wrong-password-1"), ("nobody", ADMIN_PW), ("BOSS ", "x")])
def test_wrong_credentials_are_refused(site, username, password):
    response, _ = login(site.app.test_client(), username, password)
    assert response.status_code == 401 and "store_session" not in response.headers.get("Set-Cookie", "")


def test_login_is_rate_limited_per_client(site):
    client = site.app.test_client()
    codes = [login(client, "boss", "wrong-password-1")[0].status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]
    assert login(client, "boss", ADMIN_PW)[0].status_code == 429  # even the right password waits


def test_login_is_rate_limited_per_account_across_ips(make_app):
    app = make_app(SESSION_COOKIE_SECURE="false", TRUSTED_PROXY_COUNT="1")
    import auth
    auth.create_user("boss", ADMIN_PW, "admin")
    client = app.app.test_client()
    codes = [login(client, "boss", "wrong-password-1", headers={"X-Forwarded-For": f"10.0.0.{i}"})[0].status_code
             for i in range(6)]
    assert codes[-1] == 429


def test_logout_revokes_the_session(site):
    client = site.app.test_client()
    _, csrf = login(client, "boss", ADMIN_PW)
    cookie = client.get_cookie("store_session").value
    assert client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 200
    client.set_cookie("store_session", cookie)  # replaying the old cookie must not work
    assert client.get("/api/auth/me").status_code == 401


def test_expired_session_is_refused(site, monkeypatch):
    client = site.app.test_client()
    login(client, "boss", ADMIN_PW)
    import db
    later = db.now() + timedelta(hours=9)
    monkeypatch.setattr(db, "now", lambda: later)
    assert client.get("/api/auth/me").status_code == 401


def test_deactivated_user_is_logged_out_and_cannot_log_in(site):
    admin_client, staff_client = site.app.test_client(), site.app.test_client()
    _, csrf = login(admin_client, "boss", ADMIN_PW)
    login(staff_client, "clerk", STAFF_PW)
    clerk_id = next(u["id"] for u in admin_client.get("/api/admin/users").get_json() if u["username"] == "clerk")
    assert admin_client.patch(f"/api/admin/users/{clerk_id}", json={"active": False},
                              headers={"X-CSRF-Token": csrf}).status_code == 200
    assert staff_client.get("/api/admin/orders").status_code == 401
    assert login(site.app.test_client(), "clerk", STAFF_PW)[0].status_code == 401


def test_admin_cannot_lock_themself_out(site):
    client = site.app.test_client()
    _, csrf = login(client, "boss", ADMIN_PW)
    boss_id = next(u["id"] for u in client.get("/api/admin/users").get_json() if u["username"] == "boss")
    response = client.patch(f"/api/admin/users/{boss_id}", json={"active": False}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 400


@pytest.mark.parametrize("payload", [
    {"username": "ab", "password": "long-enough-pass", "role": "staff"},
    {"username": "new.user", "password": "short", "role": "staff"},
    {"username": "new.user", "password": "long-enough-pass", "role": "owner"},
    {"username": "clerk", "password": "long-enough-pass", "role": "staff"},
])
def test_invalid_new_users_are_rejected(site, payload):
    client = site.app.test_client()
    _, csrf = login(client, "boss", ADMIN_PW)
    assert client.post("/api/admin/users", json=payload, headers={"X-CSRF-Token": csrf}).status_code == 400


def test_passwords_are_hashed(site):
    import db
    with db.connect() as conn:
        stored = conn.execute("SELECT password_hash FROM users WHERE username='boss'").fetchone()[0]
    assert ADMIN_PW not in stored and stored.startswith(("scrypt:", "pbkdf2:"))


def test_passwords_and_tokens_are_never_logged(site, caplog):
    client = site.app.test_client()
    with caplog.at_level(logging.DEBUG):
        login(client, "boss", "wrong-password-xyz")
        response, csrf = login(client, "boss", ADMIN_PW)
    token = client.get_cookie("store_session").value
    for secret in ("wrong-password-xyz", ADMIN_PW, token, csrf):
        assert secret not in caplog.text


# ---- roles and CSRF ----------------------------------------------------------------------

@pytest.mark.parametrize("method, path", [
    ("get", "/api/admin/orders"), ("get", "/api/admin/products"), ("get", "/api/admin/users"),
    ("patch", "/api/admin/orders/1/status"), ("post", "/api/admin/products"), ("get", "/api/orders"),
])
def test_admin_api_requires_login(site, method, path):
    assert getattr(site.app.test_client(), method)(path, json={}).status_code == 401


def test_staff_can_manage_orders_only(site):
    order_id = make_order(site)
    client = site.app.test_client()
    _, csrf = login(client, "clerk", STAFF_PW)
    assert client.get("/api/admin/orders").get_json()["total"] == 1
    assert client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "shipped"},
                        headers={"X-CSRF-Token": csrf}).status_code == 200
    for method, path, body in [("get", "/api/admin/products", None), ("post", "/api/admin/products", {"name": "x", "price": 1}),
                               ("post", "/api/admin/products/1/stock", {"delta": 5}), ("patch", "/api/admin/products/1", {"price": 1}),
                               ("delete", "/api/admin/products/1", None), ("get", "/api/admin/users", None)]:
        response = getattr(client, method)(path, json=body, headers={"X-CSRF-Token": csrf})
        assert response.status_code == 403, path


def test_state_changes_require_the_csrf_token(site):
    order_id = make_order(site)
    client = site.app.test_client()
    login(client, "boss", ADMIN_PW)
    for headers in ({}, {"X-CSRF-Token": "forged"}):
        response = client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "shipped"}, headers=headers)
        assert response.status_code == 403 and response.get_json()["code"] == "csrf"


def test_order_status_must_be_known(site):
    order_id = make_order(site)
    client = site.app.test_client()
    _, csrf = login(client, "boss", ADMIN_PW)
    assert client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "lost"},
                        headers={"X-CSRF-Token": csrf}).status_code == 400


def test_orders_search_and_pagination(site):
    for _ in range(3):
        make_order(site)
    client = site.app.test_client()
    login(client, "clerk", STAFF_PW)
    page = client.get("/api/admin/orders?per_page=2&page=2").get_json()
    assert page["total"] == 3 and len(page["items"]) == 1 and page["page"] == 2
    assert client.get("/api/admin/orders?q=Amina").get_json()["total"] == 3
    assert client.get("/api/admin/orders?q=nobody").get_json()["total"] == 0
    assert client.get("/api/admin/orders?q=3456").get_json()["total"] == 3  # phone suffix


# ---- products ----------------------------------------------------------------------------

@pytest.fixture()
def admin_client(site):
    client = site.app.test_client()
    _, csrf = login(client, "boss", ADMIN_PW)
    client.csrf = {"X-CSRF-Token": csrf}
    return client


def test_admin_creates_and_edits_products_with_an_audit_trail(admin_client):
    created = admin_client.post("/api/admin/products", json={"name": "Galaxy Tab", "category": "tablet", "price": 45000, "stock": 3},
                                headers=admin_client.csrf)
    assert created.status_code == 201
    pid = created.get_json()["id"]
    assert admin_client.patch(f"/api/admin/products/{pid}", json={"price": 43000}, headers=admin_client.csrf).status_code == 200
    assert admin_client.post(f"/api/admin/products/{pid}/stock", json={"delta": 2}, headers=admin_client.csrf).get_json()["stock"] == 5
    assert admin_client.patch(f"/api/admin/products/{pid}", json={"active": False}, headers=admin_client.csrf).status_code == 200
    entries = admin_client.get(f"/api/admin/products/{pid}/audit").get_json()
    assert [e["action"] for e in entries] == ["update", "stock", "update", "create"]
    assert all(e["actor"] == "boss" for e in entries)
    assert '"price": 45000' in entries[2]["before"] and '"price": 43000' in entries[2]["after"]


@pytest.mark.parametrize("payload", [
    {"name": "x", "category": "c", "price": -1, "stock": 1},
    {"name": "x", "category": "c", "price": 10, "stock": -2},
    {"name": "", "category": "c", "price": 10, "stock": 1},
    {"name": "x", "category": "c", "price": "10", "stock": 1},
    {"name": "x", "category": "c", "price": 1.5, "stock": 1},
])
def test_invalid_products_are_rejected(admin_client, payload):
    assert admin_client.post("/api/admin/products", json=payload, headers=admin_client.csrf).status_code == 400


def test_stock_never_goes_negative(admin_client):
    assert admin_client.post("/api/admin/products/1/stock", json={"delta": -5}, headers=admin_client.csrf).status_code == 400
    assert admin_client.post("/api/admin/products/1/stock", json={"set_to": -1}, headers=admin_client.csrf).status_code == 400
    assert admin_client.post("/api/admin/products/1/stock", json={"delta": 1, "set_to": 3}, headers=admin_client.csrf).status_code == 400
    assert admin_client.post("/api/admin/products/1/stock", json={"set_to": 2}, headers=admin_client.csrf).get_json()["stock"] == 2


def test_stock_cannot_be_edited_through_the_product_update(admin_client):
    assert admin_client.patch("/api/admin/products/1", json={"stock": 999}, headers=admin_client.csrf).status_code == 400


def test_archived_products_keep_old_orders_intact(site, admin_client):
    order_id = make_order(site)  # contains product 5
    assert admin_client.delete("/api/admin/products/5", headers=admin_client.csrf).status_code == 200
    import db
    assert all(p["id"] != 5 for p in db.list_products())
    assert all(p["id"] != 5 for p in admin_client.get("/api/admin/products?per_page=100").get_json()["items"])
    order = next(o for o in db.list_orders() if o["id"] == order_id)
    assert order["items"][0]["product_id"] == 5
    with pytest.raises(db.OrderError):
        db.propose_order("A", "0555123456", "Oran", [{"product_id": 5, "quantity": 1}])


def test_products_search_and_pagination(admin_client):
    page = admin_client.get("/api/admin/products?per_page=4").get_json()
    assert page["total"] == 6 and len(page["items"]) == 4
    assert admin_client.get("/api/admin/products?q=laptop").get_json()["total"] == 2


# ---- demo token --------------------------------------------------------------------------

def test_demo_token_works_only_in_demo_mode(make_app):
    headers = {"X-Admin-Token": "a-very-long-demo-token"}
    app = make_app(DEMO_MODE="true", ADMIN_TOKEN="a-very-long-demo-token")
    assert app.app.test_client().get("/api/admin/products", headers=headers).status_code == 200
    app = make_app(DEMO_MODE="false", ADMIN_TOKEN="a-very-long-demo-token")
    assert app.app.test_client().get("/api/admin/products", headers=headers).status_code == 401


# ---- headers and CORS --------------------------------------------------------------------

@pytest.mark.parametrize("path", ["/", "/admin", "/privacy", "/api/wilayas"])
def test_security_headers(site, path):
    headers = site.app.test_client().get(path).headers
    assert "script-src 'self'" in headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in headers["Content-Security-Policy"]
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"
    assert headers["Referrer-Policy"] == "same-origin"
    assert "camera=()" in headers["Permissions-Policy"]
    assert "Strict-Transport-Security" not in headers


def test_hsts_only_when_enabled(make_app):
    headers = make_app(ENABLE_HSTS="true").app.test_client().get("/").headers
    assert headers["Strict-Transport-Security"].startswith("max-age=")


def test_api_responses_are_not_cached(site):
    assert site.app.test_client().get("/api/wilayas").headers["Cache-Control"] == "no-store"


def test_cors_is_closed_by_default(site):
    response = site.app.test_client().get("/api/wilayas", headers={"Origin": "https://evil.example"})
    assert "Access-Control-Allow-Origin" not in response.headers


def test_cors_allows_only_listed_origins_on_public_endpoints(make_app):
    client = make_app(CORS_ORIGINS="https://shop.example").app.test_client()
    ok = client.get("/api/wilayas", headers={"Origin": "https://shop.example"})
    assert ok.headers["Access-Control-Allow-Origin"] == "https://shop.example"
    assert "Access-Control-Allow-Credentials" not in ok.headers
    assert "Access-Control-Allow-Origin" not in client.get("/api/wilayas", headers={"Origin": "https://other.example"}).headers
    assert "Access-Control-Allow-Origin" not in client.get("/api/admin/orders", headers={"Origin": "https://shop.example"}).headers
    assert client.options("/api/chat", headers={"Origin": "https://shop.example"}).status_code == 204
    assert client.options("/api/chat", headers={"Origin": "https://other.example"}).status_code == 403
    assert client.options("/api/admin/orders", headers={"Origin": "https://shop.example"}).status_code == 403


# ---- customers: privacy and order lookup -------------------------------------------------

def test_privacy_page_explains_data_and_retention(site):
    html = site.app.test_client().get("/privacy").get_data(as_text=True)
    assert "سياسة الخصوصية" in html and "365" in html and "Anthropic" in html


def test_customer_order_lookup_needs_number_and_phone(site):
    order_id = make_order(site)
    client = site.app.test_client()
    found = client.post("/api/orders/status", json={"order_id": order_id, "phone": "0555 123 456"})
    assert found.status_code == 200
    body = found.get_json()
    assert body["status"] == "pending" and "phone" not in body and "customer" not in body
    assert client.post("/api/orders/status", json={"order_id": order_id, "phone": "0555000000"}).status_code == 404
    assert client.post("/api/orders/status", json={"order_id": order_id}).status_code == 400


def test_customer_order_lookup_is_rate_limited(make_app):
    client = make_app(STATUS_LIMIT_PER_10_MIN="2").app.test_client()
    codes = [client.post("/api/orders/status", json={"order_id": i, "phone": "0555000000"}).status_code for i in range(3)]
    assert codes == [404, 404, 429]


# ---- management commands -----------------------------------------------------------------

def test_cli_creates_the_first_admin(site, monkeypatch):
    monkeypatch.setenv("STAFF_PASSWORD", "first-admin-pass-1")
    result = site.app.test_cli_runner().invoke(args=["create-user", "--username", "owner", "--role", "admin"])
    assert result.exit_code == 0 and "Created admin 'owner'" in result.output
    assert login(site.app.test_client(), "owner", "first-admin-pass-1")[0].status_code == 200


def test_cli_rejects_weak_passwords(site, monkeypatch):
    monkeypatch.setenv("STAFF_PASSWORD", "short")
    result = site.app.test_cli_runner().invoke(args=["create-user", "--username", "owner"])
    assert result.exit_code != 0


def test_cli_purge_data_applies_retention(site, monkeypatch):
    make_order(site, status="delivered")
    import db
    later = db.now() + timedelta(days=400)
    monkeypatch.setattr(db, "now", lambda: later)
    result = site.app.test_cli_runner().invoke(args=["purge-data"])
    assert result.exit_code == 0 and "Anonymised 1 orders" in result.output
    assert db.list_orders()[0]["customer"] == "[anonymized]"


def test_cli_migrate_is_idempotent(site):
    result = site.app.test_cli_runner().invoke(args=["migrate"])
    assert result.exit_code == 0 and "already up to date" in result.output
