"""Migrations, wilayas, delivery fees, order-line rules, retention and lock retries."""
import importlib
import sqlite3
from datetime import timedelta

import pytest

ORIGINAL_SCHEMA = """
CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT NOT NULL, phone TEXT NOT NULL, wilaya TEXT NOT NULL,
  items TEXT NOT NULL, subtotal INTEGER NOT NULL, delivery_fee INTEGER NOT NULL, total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
INSERT INTO products(name,category,price,stock,created_at,updated_at) VALUES ('Old Phone','phone',10000,3,'2025-01-01','2025-01-01');
INSERT INTO orders(customer,phone,wilaya,items,subtotal,delivery_fee,total,status,created_at,updated_at)
  VALUES ('Old Customer','0555000000','Oran','[]',10000,900,10900,'delivered','2025-01-01','2025-01-01');
"""


@pytest.fixture()
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "store.db"))
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    import db as db_module
    importlib.reload(db_module)
    db_module.init_db()
    return db_module


def tables(path):
    conn = sqlite3.connect(path)
    try:
        return {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    finally:
        conn.close()


# ---- migrations -----------------------------------------------------------------------------

def test_migrations_on_an_empty_database(tmp_path):
    import migrations
    path = tmp_path / "empty.db"
    assert migrations.migrate(path) == [1, 2, 3, 4, 5]
    assert {"products", "orders", "order_proposals", "wilayas", "users", "sessions", "audit_log",
            "schema_migrations"} <= tables(path)
    assert migrations.migrate(path) == []  # idempotent


def test_migrations_keep_data_from_the_original_version(tmp_path, monkeypatch):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.executescript(ORIGINAL_SCHEMA)
    conn.close()
    monkeypatch.setenv("DB_PATH", str(path))
    import db as db_module
    importlib.reload(db_module)
    db_module.init_db()
    assert [p["name"] for p in db_module.list_products()] == ["Old Phone"]  # no demo seeding over real data
    old_order = db_module.list_orders()[0]
    assert old_order["customer"] == "Old Customer" and old_order["wilaya_code"] is None
    proposal = db_module.propose_order("New", "0666000000", "Oran", [{"product_id": 1, "quantity": 1}])
    assert db_module.confirm_order(proposal["proposal_id"])["order_id"] == 2


def test_failed_migration_rolls_back(tmp_path, monkeypatch):
    import migrations
    path = tmp_path / "broken.db"

    def broken(conn):
        conn.execute("CREATE TABLE half_done (x INTEGER)")
        raise RuntimeError("boom")

    monkeypatch.setattr(migrations, "MIGRATIONS", migrations.MIGRATIONS[:1] + [(2, "broken", broken)])
    with pytest.raises(RuntimeError):
        migrations.migrate(path)
    assert "half_done" not in tables(path)
    conn = sqlite3.connect(path)
    assert [r[0] for r in conn.execute("SELECT version FROM schema_migrations")] == [1]
    conn.close()


# ---- wilayas and fees -----------------------------------------------------------------------

def test_all_58_wilayas_are_seeded(db):
    rows = db.list_wilayas()
    assert len(rows) == 58 and [r["code"] for r in rows] == list(range(1, 59))


@pytest.mark.parametrize("text, code", [
    ("Alger", 16), ("algiers", 16), ("الجزائر", 16), ("العاصمة", 16), ("Dzayer", 16), ("16", 16), ("wilaya de Alger", 16),
    ("Oran", 31), ("وهران", 31), ("WAHRAN", 31),
    ("Béjaïa", 6), ("bejaia", 6), ("Bgayet", 6), ("06", 6),
    ("Sidi Bel Abbes", 22), ("sba", 22), ("Bordj Bou Arreridj", 34), ("bba", 34),
    ("Tizi-Ouzou", 15), ("قسنطينة", 25), ("Qsentina", 25), ("M'Sila", 28), ("msila", 28),
    ("البليدة", 9), ("بليدة", 9), ("Tamanrasset", 11),
])
def test_wilaya_names_aliases_and_codes(db, text, code):
    assert db.resolve_wilaya(text)["code"] == code


@pytest.mark.parametrize("text", ["", "   ", "Paris", "Oranne", "99", "0", "wilaya"])
def test_unknown_wilayas_are_rejected(db, text):
    assert db.resolve_wilaya(text) is None


def test_unknown_wilaya_in_an_order_is_a_clear_error(db):
    with pytest.raises(db.OrderError) as err:
        db.propose_order("A", "0555123456", "Paris", [{"product_id": 5, "quantity": 1}])
    assert err.value.code == "unknown_wilaya"


@pytest.mark.parametrize("wilaya, fee", [("Alger", 600), ("Oran", 900), ("Tamanrasset", 1200), ("Djanet", 1200)])
def test_delivery_fee_depends_on_the_wilaya(db, wilaya, fee):
    proposal = db.propose_order("A", "0555123456", wilaya, [{"product_id": 5, "quantity": 1}])
    assert proposal["delivery_fee"] == fee and proposal["total"] == 2500 + fee


def test_fee_comes_from_the_database_not_the_caller(db):
    proposal = db.propose_order("A", "0555123456", "Oran", [{"product_id": 5, "quantity": 1, "unit_price": 1}])
    assert proposal["items"][0]["unit_price"] == 2500 and proposal["delivery_fee"] == 900


def test_wilaya_endpoint_lists_fees(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "s.db"))
    import db as db_module
    import app as app_module
    importlib.reload(db_module)
    app_module = importlib.reload(app_module)
    rows = app_module.app.test_client().get("/api/wilayas").get_json()
    assert len(rows) == 58 and {"code", "name_fr", "name_ar", "delivery_fee"} == set(rows[0])


# ---- order lines ----------------------------------------------------------------------------

def test_duplicate_lines_are_merged(db):
    proposal = db.propose_order("A", "0555123456", "Oran", [
        {"product_id": 5, "quantity": 2}, {"product_id": 6, "quantity": 1}, {"product_id": 5, "quantity": 3}])
    assert [(l["product_id"], l["quantity"]) for l in proposal["items"]] == [(5, 5), (6, 1)]
    assert proposal["subtotal"] == 5 * 2500 + 4000


def test_merged_duplicates_cannot_bypass_stock(db):
    with pytest.raises(db.OrderError) as err:
        db.propose_order("A", "0555123456", "Oran", [{"product_id": 3, "quantity": 6}, {"product_id": 3, "quantity": 6}])
    assert err.value.code in {"out_of_stock", "too_many_units"}


@pytest.mark.parametrize("items, code", [
    ([{"product_id": 5, "quantity": 21}], "too_many_units"),
    ([{"product_id": 5, "quantity": 0}], "invalid_quantity"),
    ([{"product_id": 5, "quantity": -3}], "invalid_quantity"),
    ([{"product_id": True, "quantity": 1}], "invalid_items"),
    (["5x2"], "invalid_items"),
    ([{"product_id": 5, "quantity": 1}] * 21, "invalid_items"),
])
def test_unreasonable_lines_are_rejected(db, items, code):
    with pytest.raises(db.OrderError) as err:
        db.propose_order("A", "0555123456", "Oran", items)
    assert err.value.code == code


# ---- retention and cleanup ------------------------------------------------------------------

def test_old_closed_orders_are_anonymized(db, monkeypatch):
    for status in ("delivered", "pending"):
        proposal = db.propose_order("Amina", "0555123456", "Oran", [{"product_id": 5, "quantity": 1}])
        order_id = db.confirm_order(proposal["proposal_id"])["order_id"]
        db.update_order_status(order_id, status)
    later = db.now() + timedelta(days=400)
    monkeypatch.setattr(db, "now", lambda: later)
    assert db.anonymize_old_orders(365) == 1
    orders = {o["status"]: o for o in db.list_orders()}
    assert orders["delivered"]["customer"] == "[anonymized]" and orders["delivered"]["phone"] == "anonymized"
    assert orders["pending"]["customer"] == "Amina"  # open orders are kept
    assert db.get_order(orders["delivered"]["id"], "0555123456") is None


def test_old_proposals_are_deleted(db, monkeypatch):
    db.propose_order("A", "0555123456", "Oran", [{"product_id": 5, "quantity": 1}])
    assert db.delete_old_proposals(24) == 0
    later = db.now() + timedelta(hours=25)
    monkeypatch.setattr(db, "now", lambda: later)
    assert db.delete_old_proposals(24) == 1


# ---- locking --------------------------------------------------------------------------------

def test_locked_database_is_retried_a_limited_number_of_times(db, monkeypatch):
    calls = []
    monkeypatch.setattr(db.time, "sleep", lambda s: None)

    @db.retry_on_lock
    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise sqlite3.OperationalError("database is locked")
        return "ok"

    assert flaky() == "ok" and len(calls) == 3

    @db.retry_on_lock
    def always_locked():
        calls.append(1)
        raise sqlite3.OperationalError("database is locked")

    calls.clear()
    with pytest.raises(sqlite3.OperationalError):
        always_locked()
    assert len(calls) == db.LOCK_RETRIES


def test_other_database_errors_are_not_retried(db):
    calls = []

    @db.retry_on_lock
    def broken():
        calls.append(1)
        raise sqlite3.OperationalError("no such table: nope")

    with pytest.raises(sqlite3.OperationalError):
        broken()
    assert len(calls) == 1
