import json
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROPOSAL_TTL_MINUTES = 30
ORDER_STATUSES = ("pending", "confirmed", "shipped", "delivered", "cancelled")
ALGERIAN_MOBILE = re.compile(r"0[567]\d{8}")
FREE_DELIVERY_FROM = 100000
DELIVERY_FEE_ALGER = 600
DELIVERY_FEE_OTHER = 900
ALGER_NAMES = {"alger", "algiers", "الجزائر", "العاصمة", "دزاير"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL CHECK(price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT NOT NULL,
    phone TEXT NOT NULL,
    wilaya TEXT NOT NULL,
    items TEXT NOT NULL,
    subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
    delivery_fee INTEGER NOT NULL CHECK(delivery_fee >= 0),
    total INTEGER NOT NULL CHECK(total >= 0),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
-- An order the assistant has prepared but the customer has not confirmed yet.
-- Only the customer's own click on "Confirm" turns a proposal into an order.
CREATE TABLE IF NOT EXISTS order_proposals (
    id TEXT PRIMARY KEY,
    customer TEXT NOT NULL,
    phone TEXT NOT NULL,
    wilaya TEXT NOT NULL,
    items TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER NOT NULL,
    total INTEGER NOT NULL,
    order_id INTEGER,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
"""

SEED_PRODUCTS = [
    ("Laptop HP 15", "laptop", 85000, 4),
    ("Laptop Lenovo IdeaPad", "laptop", 72000, 0),
    ("Samsung A55", "phone", 62000, 10),
    ("Redmi Note 13", "phone", 38000, 7),
    ("Wireless Mouse", "accessory", 2500, 30),
    ("Headphones", "accessory", 4000, 15),
]


class OrderError(ValueError):
    """A customer-facing problem with an order (bad input, out of stock, expired)."""


def db_path():
    return Path(os.getenv("DB_PATH", "data/store.db"))


def now():
    return datetime.now(timezone.utc)


def stamp(moment=None):
    return (moment or now()).isoformat(timespec="seconds")


@contextmanager
def connect(immediate=False):
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
    try:
        yield conn
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    finally:
        conn.close()


def init_db():
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    schema_conn = sqlite3.connect(path, timeout=10)
    try:
        schema_conn.executescript(SCHEMA)
    finally:
        schema_conn.close()
    with connect(immediate=True) as conn:
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count == 0 and os.getenv("SEED_DEMO_DATA", "true").lower() == "true":
            created = stamp()
            conn.executemany(
                "INSERT INTO products(name,category,price,stock,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                [(n, c, p, s, created, created) for n, c, p, s in SEED_PRODUCTS],
            )


def list_products(keyword="", category="", include_inactive=False):
    clauses, params = ["1=1"], []
    if keyword:
        clauses.append("name LIKE ?")
        params.append(f"%{keyword}%")
    if category:
        clauses.append("category = ?")
        params.append(category)
    if not include_inactive:
        clauses.append("active = 1")
    with connect() as conn:
        return [dict(r) for r in conn.execute(
            f"SELECT id,name,category,price,stock,active,updated_at FROM products WHERE {' AND '.join(clauses)} ORDER BY name",
            params,
        ).fetchall()]


def list_orders(status=""):
    with connect() as conn:
        if status:
            rows = conn.execute("SELECT * FROM orders WHERE status=? ORDER BY id DESC", (status,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
    return [_decode_order(row) for row in rows]


def update_order_status(order_id, status):
    if status not in ORDER_STATUSES:
        raise ValueError("Invalid order status")
    with connect() as conn:
        cur = conn.execute("UPDATE orders SET status=?,updated_at=? WHERE id=?", (status, stamp(), order_id))
        if cur.rowcount == 0:
            raise ValueError("Order not found")


def delivery_fee(wilaya, subtotal):
    if subtotal >= FREE_DELIVERY_FROM:
        return 0
    return DELIVERY_FEE_ALGER if wilaya.strip().lower() in ALGER_NAMES else DELIVERY_FEE_OTHER


def normalize_phone(phone):
    return "".join(str(phone).split())


def propose_order(customer, phone, wilaya, items):
    """Validate an order and store it as a proposal. Stock is not touched.

    Returns the summary the customer must confirm. Raises OrderError with a
    message the assistant can relay to the customer.
    """
    customer, wilaya = str(customer).strip(), str(wilaya).strip()
    normalized_phone = normalize_phone(phone)
    if not ALGERIAN_MOBILE.fullmatch(normalized_phone):
        raise OrderError("Invalid Algerian mobile number (expected 05, 06 or 07 followed by 8 digits).")
    if not customer or not wilaya:
        raise OrderError("Customer name and wilaya are required.")
    if not isinstance(items, list) or not items or len(items) > 20:
        raise OrderError("Between 1 and 20 order lines are required.")

    with connect() as conn:
        lines, subtotal = [], 0
        for item in items:
            try:
                product_id, quantity = int(item["product_id"]), int(item["quantity"])
            except (KeyError, TypeError, ValueError):
                raise OrderError("Each line needs a numeric product_id and quantity.") from None
            product = conn.execute("SELECT * FROM products WHERE id=? AND active=1", (product_id,)).fetchone()
            if not product:
                raise OrderError(f"Product {product_id} does not exist.")
            if quantity < 1 or quantity > product["stock"]:
                raise OrderError(f"Only {product['stock']} of {product['name']} available.")
            subtotal += product["price"] * quantity
            lines.append({"product_id": product["id"], "name": product["name"],
                          "quantity": quantity, "unit_price": product["price"]})
        fee = delivery_fee(wilaya, subtotal)
        proposal_id = secrets.token_urlsafe(16)
        created = now()
        conn.execute(
            "INSERT INTO order_proposals(id,customer,phone,wilaya,items,subtotal,delivery_fee,total,created_at,expires_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (proposal_id, customer, normalized_phone, wilaya, json.dumps(lines, ensure_ascii=False),
             subtotal, fee, subtotal + fee, stamp(created),
             stamp(created + timedelta(minutes=PROPOSAL_TTL_MINUTES))),
        )
    return {"proposal_id": proposal_id, "customer": customer, "phone": normalized_phone, "wilaya": wilaya,
            "items": lines, "subtotal": subtotal, "delivery_fee": fee, "total": subtotal + fee,
            "payment": "cash on delivery", "expires_in_minutes": PROPOSAL_TTL_MINUTES}


def confirm_order(proposal_id):
    """Turn a proposal into an order, reserving stock atomically.

    BEGIN IMMEDIATE serialises concurrent confirmations, and each stock update
    only succeeds while enough units remain, so the last item cannot be sold twice.
    """
    with connect(immediate=True) as conn:
        proposal = conn.execute("SELECT * FROM order_proposals WHERE id=?", (str(proposal_id),)).fetchone()
        if not proposal:
            raise OrderError("This order summary was not found.")
        if proposal["order_id"] is not None:
            raise OrderError("This order was already confirmed.")
        if proposal["expires_at"] < stamp():
            raise OrderError("This order summary expired. Please ask the assistant again.")
        lines = json.loads(proposal["items"])
        updated = stamp()
        for line in lines:
            cur = conn.execute(
                "UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND active=1 AND stock>=?",
                (line["quantity"], updated, line["product_id"], line["quantity"]),
            )
            if cur.rowcount == 0:
                raise OrderError(f"Sorry, {line['name']} is no longer available in that quantity.")
        cur = conn.execute(
            "INSERT INTO orders(customer,phone,wilaya,items,subtotal,delivery_fee,total,status,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (proposal["customer"], proposal["phone"], proposal["wilaya"], proposal["items"], proposal["subtotal"],
             proposal["delivery_fee"], proposal["total"], "pending", updated, updated),
        )
        order_id = cur.lastrowid
        conn.execute("UPDATE order_proposals SET order_id=? WHERE id=?", (order_id, proposal["id"]))
    return {"order_id": order_id, "total": proposal["total"], "payment": "cash on delivery"}


def get_order(order_id, phone):
    try:
        order_id = int(order_id)
    except (TypeError, ValueError):
        return None
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id=? AND phone=?", (order_id, normalize_phone(phone))).fetchone()
    return _decode_order(row) if row else None


def _decode_order(row):
    result = dict(row)
    result["items"] = json.loads(result["items"])
    return result
