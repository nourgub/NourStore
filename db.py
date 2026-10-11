"""Storage layer. Every SQL statement of the app lives here (and in migrations.py),
so moving from SQLite to PostgreSQL later means changing these two files only.
"""
import functools
import json
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import config
import migrations
import wilayas as wilaya_data

PROPOSAL_TTL_MINUTES = 30
ORDER_STATUSES = ("pending", "confirmed", "shipped", "delivered", "cancelled")
CLOSED_STATUSES = ("delivered", "cancelled")
ALGERIAN_MOBILE = re.compile(r"0[567]\d{8}")
FREE_DELIVERY_FROM = 100000
MAX_ORDER_LINES = 20
MAX_TEXT = {"customer": 100, "wilaya": 60, "keyword": 100, "category": 40, "product_name": 120}
LOCK_RETRIES = 3

SEED_PRODUCTS = [
    ("Laptop HP 15", "laptop", 85000, 4),
    ("Laptop Lenovo IdeaPad", "laptop", 72000, 0),
    ("Samsung A55", "phone", 62000, 10),
    ("Redmi Note 13", "phone", 38000, 7),
    ("Wireless Mouse", "accessory", 2500, 30),
    ("Headphones", "accessory", 4000, 15),
]


class OrderError(ValueError):
    """A customer-facing problem with an order. `code` selects the translated message."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class NotFound(LookupError):
    pass


def db_path():
    return Path(config.db_path())


def now():
    return datetime.now(timezone.utc)


def stamp(moment=None):
    return (moment or now()).isoformat(timespec="seconds")


def _is_locked(exc):
    return isinstance(exc, sqlite3.OperationalError) and "locked" in str(exc).lower()


def retry_on_lock(fn):
    """Retry a whole transaction a few times when SQLite reports 'database is locked'.

    Safe because each wrapped function runs in one transaction that is rolled back
    on failure, so a retry never applies a change twice.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        for attempt in range(LOCK_RETRIES):
            try:
                return fn(*args, **kwargs)
            except sqlite3.OperationalError as exc:
                if not _is_locked(exc) or attempt == LOCK_RETRIES - 1:
                    raise
                time.sleep(0.05 * (2 ** attempt))
    return wrapper


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


def init_db(seed=None):
    """Apply pending migrations, then add demo products to an empty catalogue if enabled."""
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    migrations.migrate(path)
    if seed is None:
        seed = config.env_bool("SEED_DEMO_DATA", True)
    if seed:
        with connect(immediate=True) as conn:
            if conn.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
                created = stamp()
                conn.executemany(
                    "INSERT INTO products(name,category,price,stock,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                    [(n, c, p, s, created, created) for n, c, p, s in SEED_PRODUCTS],
                )


def ping():
    with connect() as conn:
        conn.execute("SELECT 1").fetchone()


def _audit(conn, actor, action, entity, entity_id, before=None, after=None):
    conn.execute(
        "INSERT INTO audit_log(actor,action,entity,entity_id,before,after,created_at) VALUES (?,?,?,?,?,?,?)",
        (str(actor), action, entity, str(entity_id),
         json.dumps(before, ensure_ascii=False) if before is not None else None,
         json.dumps(after, ensure_ascii=False) if after is not None else None, stamp()),
    )


def _page(page, per_page):
    page = max(1, int(page or 1))
    per_page = min(100, max(1, int(per_page or 20)))
    return page, per_page, (page - 1) * per_page


# ---- wilayas ------------------------------------------------------------------------------

def list_wilayas(include_inactive=False):
    with connect() as conn:
        sql = "SELECT code,name_fr,name_ar,delivery_fee,active FROM wilayas"
        sql += "" if include_inactive else " WHERE active = 1"
        return [dict(r) for r in conn.execute(sql + " ORDER BY code").fetchall()]


def resolve_wilaya(text):
    """Return the active wilaya row matching a name, alias or code, or None."""
    wanted = wilaya_data.normalize(str(text)[:MAX_TEXT["wilaya"]])
    if not wanted:
        return None
    with connect() as conn:
        rows = conn.execute("SELECT * FROM wilayas WHERE active = 1").fetchall()
    for row in rows:
        if wanted in wilaya_data.names_for(row["code"], row["name_fr"], row["name_ar"], json.loads(row["aliases"])):
            return dict(row)
    return None


def delivery_fee(wilaya, subtotal):
    """Server-side delivery fee for a wilaya (name, alias or code). Free above FREE_DELIVERY_FROM."""
    row = resolve_wilaya(wilaya)
    if row is None:
        raise OrderError("unknown_wilaya", f"Unknown wilaya: {str(wilaya)[:40]!r}.")
    return 0 if subtotal >= FREE_DELIVERY_FROM else row["delivery_fee"]


# ---- products -----------------------------------------------------------------------------

def list_products(keyword="", category="", include_inactive=False):
    clauses, params = ["archived_at IS NULL"], []
    if keyword:
        clauses.append("name LIKE ?")
        params.append(f"%{str(keyword)[:MAX_TEXT['keyword']]}%")
    if category:
        clauses.append("category = ?")
        params.append(str(category)[:MAX_TEXT["category"]])
    if not include_inactive:
        clauses.append("active = 1")
    with connect() as conn:
        return [dict(r) for r in conn.execute(
            f"SELECT id,name,category,price,stock,active,updated_at FROM products WHERE {' AND '.join(clauses)} ORDER BY name",
            params,
        ).fetchall()]


def search_products_admin(query="", page=1, per_page=20, include_archived=False):
    page, per_page, offset = _page(page, per_page)
    clauses, params = ["1=1"], []
    if not include_archived:
        clauses.append("archived_at IS NULL")
    if query:
        clauses.append("(name LIKE ? OR category LIKE ?)")
        params += [f"%{str(query)[:100]}%"] * 2
    where = " AND ".join(clauses)
    with connect() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM products WHERE {where}", params).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM products WHERE {where} ORDER BY name LIMIT ? OFFSET ?",
                            params + [per_page, offset]).fetchall()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "per_page": per_page}


def _validate_product_fields(fields, partial):
    clean = {}
    if "name" in fields or not partial:
        name = str(fields.get("name", "")).strip()
        if not name or len(name) > MAX_TEXT["product_name"]:
            raise ValueError(f"name is required (max {MAX_TEXT['product_name']} characters)")
        clean["name"] = name
    if "category" in fields or not partial:
        category = str(fields.get("category", "")).strip()
        if len(category) > MAX_TEXT["category"]:
            raise ValueError(f"category is too long (max {MAX_TEXT['category']} characters)")
        clean["category"] = category
    if "price" in fields or not partial:
        price = fields.get("price")
        if isinstance(price, bool) or not isinstance(price, int) or not 0 <= price <= 100_000_000:
            raise ValueError("price must be a whole number of DA, 0 or more")
        clean["price"] = price
    if "active" in fields:
        if not isinstance(fields["active"], bool):
            raise ValueError("active must be true or false")
        clean["active"] = int(fields["active"])
    return clean


@retry_on_lock
def create_product(actor, fields):
    clean = _validate_product_fields(fields, partial=False)
    stock = fields.get("stock", 0)
    if isinstance(stock, bool) or not isinstance(stock, int) or not 0 <= stock <= 1_000_000:
        raise ValueError("stock must be a whole number, 0 or more")
    created = stamp()
    with connect(immediate=True) as conn:
        cur = conn.execute(
            "INSERT INTO products(name,category,price,stock,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
            (clean["name"], clean["category"], clean["price"], stock, clean.get("active", 1), created, created),
        )
        product = dict(conn.execute("SELECT * FROM products WHERE id=?", (cur.lastrowid,)).fetchone())
        _audit(conn, actor, "create", "product", product["id"], None, product)
    return product


@retry_on_lock
def update_product(actor, product_id, fields):
    """Change name, category, price and/or active. Stock has its own atomic endpoint."""
    unknown = set(fields) - {"name", "category", "price", "active"}
    if unknown:
        raise ValueError(f"unsupported fields: {sorted(unknown)}")
    clean = _validate_product_fields(fields, partial=True)
    if not clean:
        raise ValueError("nothing to update")
    with connect(immediate=True) as conn:
        before = conn.execute("SELECT * FROM products WHERE id=? AND archived_at IS NULL", (int(product_id),)).fetchone()
        if not before:
            raise NotFound("product not found")
        clean["updated_at"] = stamp()
        conn.execute(f"UPDATE products SET {', '.join(f'{k}=?' for k in clean)} WHERE id=?",
                     list(clean.values()) + [int(product_id)])
        after = dict(conn.execute("SELECT * FROM products WHERE id=?", (int(product_id),)).fetchone())
        changed = {k: [before[k], after[k]] for k in ("name", "category", "price", "active") if before[k] != after[k]}
        _audit(conn, actor, "update", "product", product_id, {k: v[0] for k, v in changed.items()},
               {k: v[1] for k, v in changed.items()})
    return after


@retry_on_lock
def adjust_stock(actor, product_id, delta=None, set_to=None):
    """Add/remove units (delta) or set an exact count, atomically and never below zero."""
    if (delta is None) == (set_to is None):
        raise ValueError("send exactly one of delta or set_to")
    value = delta if delta is not None else set_to
    if isinstance(value, bool) or not isinstance(value, int) or abs(value) > 1_000_000:
        raise ValueError("stock values must be whole numbers")
    with connect(immediate=True) as conn:
        before = conn.execute("SELECT stock FROM products WHERE id=? AND archived_at IS NULL", (int(product_id),)).fetchone()
        if not before:
            raise NotFound("product not found")
        if delta is not None:
            cur = conn.execute("UPDATE products SET stock=stock+?, updated_at=? WHERE id=? AND stock+? >= 0",
                               (delta, stamp(), int(product_id), delta))
        else:
            if set_to < 0:
                raise ValueError("stock cannot be negative")
            cur = conn.execute("UPDATE products SET stock=?, updated_at=? WHERE id=?", (set_to, stamp(), int(product_id)))
        if cur.rowcount == 0:
            raise ValueError("stock cannot go below zero")
        stock = conn.execute("SELECT stock FROM products WHERE id=?", (int(product_id),)).fetchone()[0]
        _audit(conn, actor, "stock", "product", product_id, {"stock": before["stock"]}, {"stock": stock})
    return {"id": int(product_id), "stock": stock}


@retry_on_lock
def archive_product(actor, product_id):
    """Soft delete: the product disappears from the shop and admin lists but old orders keep their lines."""
    with connect(immediate=True) as conn:
        cur = conn.execute("UPDATE products SET active=0, archived_at=?, updated_at=? WHERE id=? AND archived_at IS NULL",
                           (stamp(), stamp(), int(product_id)))
        if cur.rowcount == 0:
            raise NotFound("product not found")
        _audit(conn, actor, "archive", "product", product_id, {"archived": False}, {"archived": True})


def audit_entries(entity, entity_id, limit=50):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM audit_log WHERE entity=? AND entity_id=? ORDER BY id DESC LIMIT ?",
                            (entity, str(entity_id), min(200, int(limit)))).fetchall()
    return [dict(r) for r in rows]


# ---- orders -------------------------------------------------------------------------------

def search_orders(status="", query="", page=1, per_page=20):
    page, per_page, offset = _page(page, per_page)
    clauses, params = ["1=1"], []
    if status:
        clauses.append("status = ?")
        params.append(str(status))
    if query:
        query = str(query).strip()[:100]
        if query.isdigit():
            clauses.append("(id = ? OR phone LIKE ?)")
            params += [int(query), f"%{query}"]
        else:
            clauses.append("(customer LIKE ? OR wilaya LIKE ?)")
            params += [f"%{query}%"] * 2
    where = " AND ".join(clauses)
    with connect() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM orders WHERE {where}", params).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM orders WHERE {where} ORDER BY id DESC LIMIT ? OFFSET ?",
                            params + [per_page, offset]).fetchall()
    return {"items": [_decode_order(r) for r in rows], "total": total, "page": page, "per_page": per_page}


def list_orders(status=""):
    return search_orders(status=status, per_page=100)["items"]


@retry_on_lock
def update_order_status(order_id, status, actor="system"):
    if status not in ORDER_STATUSES:
        raise ValueError("Invalid order status")
    with connect(immediate=True) as conn:
        before = conn.execute("SELECT status FROM orders WHERE id=?", (int(order_id),)).fetchone()
        if not before:
            raise ValueError("Order not found")
        conn.execute("UPDATE orders SET status=?,updated_at=? WHERE id=?", (status, stamp(), int(order_id)))
        _audit(conn, actor, "status", "order", order_id, {"status": before["status"]}, {"status": status})


def normalize_phone(phone):
    return "".join(str(phone).split())[:20]


def _merge_lines(items):
    """Validate order lines and merge repeated products into one line each."""
    if not isinstance(items, list) or not items or len(items) > MAX_ORDER_LINES:
        raise OrderError("invalid_items", f"Between 1 and {MAX_ORDER_LINES} order lines are required.")
    merged = {}
    for item in items:
        if not isinstance(item, dict):
            raise OrderError("invalid_items", "Each line needs a numeric product_id and quantity.")
        product_id, quantity = item.get("product_id"), item.get("quantity")
        if isinstance(product_id, bool) or isinstance(quantity, bool):
            raise OrderError("invalid_items", "Each line needs a numeric product_id and quantity.")
        try:
            product_id, quantity = int(product_id), int(quantity)
        except (TypeError, ValueError):
            raise OrderError("invalid_items", "Each line needs a numeric product_id and quantity.") from None
        if quantity < 1:
            raise OrderError("invalid_quantity", "Quantities must be at least 1.")
        merged[product_id] = merged.get(product_id, 0) + quantity
    limit = config.max_quantity_per_line()
    for product_id, quantity in merged.items():
        if quantity > limit:
            raise OrderError("too_many_units", f"At most {limit} units per product in one order.")
    return merged


@retry_on_lock
def propose_order(customer, phone, wilaya, items):
    """Validate an order and store it as a proposal. Stock is not touched.

    Prices, totals and the delivery fee are computed here from the database; any
    such values sent by the browser or the model are ignored.
    """
    customer = str(customer).strip()
    normalized_phone = normalize_phone(phone)
    if not ALGERIAN_MOBILE.fullmatch(normalized_phone):
        raise OrderError("invalid_phone", "Invalid Algerian mobile number (expected 05, 06 or 07 followed by 8 digits).")
    if not customer or len(customer) > MAX_TEXT["customer"]:
        raise OrderError("missing_name", "Customer name is required (max 100 characters).")
    if not str(wilaya).strip():
        raise OrderError("missing_wilaya", "The wilaya is required.")
    region = resolve_wilaya(wilaya)
    if region is None:
        raise OrderError("unknown_wilaya", f"Unknown wilaya: {str(wilaya)[:40]!r}. Ask the customer for a valid wilaya name or number.")
    lines_wanted = _merge_lines(items)

    with connect(immediate=True) as conn:
        lines, subtotal = [], 0
        for product_id, quantity in lines_wanted.items():
            product = conn.execute("SELECT * FROM products WHERE id=? AND active=1 AND archived_at IS NULL",
                                   (product_id,)).fetchone()
            if not product:
                raise OrderError("unknown_product", f"Product {product_id} does not exist.")
            if quantity > product["stock"]:
                raise OrderError("out_of_stock", f"Only {product['stock']} of {product['name']} available.")
            subtotal += product["price"] * quantity
            lines.append({"product_id": product["id"], "name": product["name"],
                          "quantity": quantity, "unit_price": product["price"]})
        fee = 0 if subtotal >= FREE_DELIVERY_FROM else region["delivery_fee"]
        proposal_id = secrets.token_urlsafe(16)
        created = now()
        wilaya_label = f"{region['name_fr']} ({region['code']:02d})"
        conn.execute(
            "INSERT INTO order_proposals(id,customer,phone,wilaya,wilaya_code,items,subtotal,delivery_fee,total,created_at,expires_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (proposal_id, customer, normalized_phone, wilaya_label, region["code"], json.dumps(lines, ensure_ascii=False),
             subtotal, fee, subtotal + fee, stamp(created), stamp(created + timedelta(minutes=PROPOSAL_TTL_MINUTES))),
        )
    return {"proposal_id": proposal_id, "customer": customer, "phone": normalized_phone,
            "wilaya": wilaya_label, "wilaya_code": region["code"], "wilaya_ar": region["name_ar"],
            "items": lines, "subtotal": subtotal, "delivery_fee": fee, "total": subtotal + fee,
            "payment": "cash on delivery", "expires_in_minutes": PROPOSAL_TTL_MINUTES}


@retry_on_lock
def confirm_order(proposal_id):
    """Turn a proposal into an order, reserving stock atomically.

    BEGIN IMMEDIATE serialises concurrent confirmations, and each stock update
    only succeeds while enough units remain, so the last item cannot be sold twice.
    """
    with connect(immediate=True) as conn:
        proposal = conn.execute("SELECT * FROM order_proposals WHERE id=?", (str(proposal_id)[:64],)).fetchone()
        if not proposal:
            raise OrderError("proposal_not_found", "This order summary was not found.")
        if proposal["order_id"] is not None:
            raise OrderError("already_confirmed", "This order was already confirmed.")
        if proposal["expires_at"] < stamp():
            raise OrderError("proposal_expired", "This order summary expired. Please ask the assistant again.")
        lines = json.loads(proposal["items"])
        updated = stamp()
        for line in lines:
            cur = conn.execute(
                "UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND active=1 AND archived_at IS NULL AND stock>=?",
                (line["quantity"], updated, line["product_id"], line["quantity"]),
            )
            if cur.rowcount == 0:
                raise OrderError("stock_changed", f"Sorry, {line['name']} is no longer available in that quantity.")
        cur = conn.execute(
            "INSERT INTO orders(customer,phone,wilaya,wilaya_code,items,subtotal,delivery_fee,total,status,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (proposal["customer"], proposal["phone"], proposal["wilaya"], proposal["wilaya_code"], proposal["items"],
             proposal["subtotal"], proposal["delivery_fee"], proposal["total"], "pending", updated, updated),
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
        row = conn.execute("SELECT * FROM orders WHERE id=? AND phone=? AND anonymized_at IS NULL",
                           (order_id, normalize_phone(phone))).fetchone()
    return _decode_order(row) if row else None


def order_status_for_customer(order_id, phone):
    """What a customer may see about their order: no name, phone or address echoed back."""
    order = get_order(order_id, phone)
    if not order:
        return None
    return {"order_id": order["id"], "status": order["status"], "total": order["total"],
            "items": [{"name": i["name"], "quantity": i["quantity"]} for i in order["items"]],
            "updated_at": order["updated_at"]}


def _decode_order(row):
    result = dict(row)
    result["items"] = json.loads(result["items"])
    return result


# ---- retention ----------------------------------------------------------------------------

@retry_on_lock
def anonymize_old_orders(days):
    """Replace name and phone of closed orders older than `days` days. Returns the count."""
    if days <= 0:
        return 0
    cutoff = stamp(now() - timedelta(days=days))
    with connect(immediate=True) as conn:
        cur = conn.execute(
            f"UPDATE orders SET customer='[anonymized]', phone='anonymized', anonymized_at=? "
            f"WHERE anonymized_at IS NULL AND status IN ({','.join('?' * len(CLOSED_STATUSES))}) AND updated_at < ?",
            (stamp(), *CLOSED_STATUSES, cutoff),
        )
        return cur.rowcount


@retry_on_lock
def delete_old_proposals(hours):
    """Delete order proposals (and their personal data) older than `hours` hours."""
    cutoff = stamp(now() - timedelta(hours=hours))
    with connect(immediate=True) as conn:
        return conn.execute("DELETE FROM order_proposals WHERE created_at < ?", (cutoff,)).rowcount
