import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(os.getenv("DB_PATH", "data/store.db"))

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


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count == 0 and os.getenv("SEED_DEMO_DATA", "true").lower() == "true":
            stamp = now()
            conn.executemany(
                "INSERT INTO products(name,category,price,stock,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                [(n, c, p, s, stamp, stamp) for n, c, p, s in SEED_PRODUCTS],
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
        result = []
        for row in rows:
            item = dict(row)
            item["items"] = json.loads(item["items"])
            result.append(item)
        return result


def update_order_status(order_id, status):
    allowed = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
    if status not in allowed:
        raise ValueError("Invalid order status")
    with connect() as conn:
        cur = conn.execute("UPDATE orders SET status=?,updated_at=? WHERE id=?", (status, now(), order_id))
        if cur.rowcount == 0:
            raise ValueError("Order not found")


def create_order(customer, phone, wilaya, items, confirmed=False):
    if not confirmed:
        return {"error": "Customer confirmation is required before creating the order."}
    normalized_phone = "".join(phone.split())
    if not __import__("re").fullmatch(r"0[567]\d{8}", normalized_phone):
        return {"error": "Invalid Algerian phone number."}
    if not customer.strip() or not wilaya.strip() or not items:
        return {"error": "Customer, wilaya and items are required."}

    with connect() as conn:
        lines, subtotal = [], 0
        for item in items:
            product = conn.execute("SELECT * FROM products WHERE id=? AND active=1", (int(item["product_id"]),)).fetchone()
            qty = int(item["quantity"])
            if not product:
                return {"error": f"Product {item['product_id']} does not exist."}
            if qty < 1 or qty > product["stock"]:
                return {"error": f"Only {product['stock']} of {product['name']} available."}
            subtotal += product["price"] * qty
            lines.append({"product_id": product["id"], "name": product["name"], "quantity": qty, "unit_price": product["price"]})

        normalized_wilaya = wilaya.strip().lower()
        is_alger = normalized_wilaya in {"alger", "algiers", "الجزائر", "العاصمة"}
        delivery_fee = 0 if subtotal >= 100000 else (600 if is_alger else 900)
        stamp = now()
        cur = conn.execute(
            "INSERT INTO orders(customer,phone,wilaya,items,subtotal,delivery_fee,total,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (customer.strip(), normalized_phone, wilaya.strip(), json.dumps(lines, ensure_ascii=False), subtotal, delivery_fee, subtotal + delivery_fee, "pending", stamp, stamp),
        )
        for line in lines:
            conn.execute("UPDATE products SET stock=stock-?,updated_at=? WHERE id=?", (line["quantity"], stamp, line["product_id"]))
        return {"order_id": cur.lastrowid, "items": lines, "subtotal": subtotal, "delivery_fee": delivery_fee, "total": subtotal + delivery_fee, "payment": "cash on delivery"}


def get_order(order_id, phone):
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id=? AND phone=?", (int(order_id), "".join(phone.split()))).fetchone()
        if not row:
            return None
        result = dict(row)
        result["items"] = json.loads(result["items"])
        return result
