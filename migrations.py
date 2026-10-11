"""Numbered, forward-only schema migrations, recorded in `schema_migrations`.

Each migration runs once, inside a transaction, and must work both on an empty
database and on a database created by an earlier version of the app (the first
version only had `products` and `orders`). Run them with `flask --app app migrate`;
the app also applies pending migrations at start-up.

Postgres note: the SQL below sticks to portable statements except
`INTEGER PRIMARY KEY AUTOINCREMENT` and `?` placeholders; a Postgres port would
switch those to `SERIAL`/`IDENTITY` and `%s` in this file and in db.py.
"""
import json
import sqlite3
import time
from datetime import datetime, timezone

import wilayas


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _columns(conn, table):
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def _add_column(conn, table, column, definition):
    if column not in _columns(conn, table):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _run(conn, script):
    """Run several statements without executescript(), which would COMMIT the open transaction."""
    for statement in script.split(";"):
        if statement.strip():
            conn.execute(statement)


def m001_initial(conn):
    """Products, orders and order proposals (adopts databases from earlier versions)."""
    _run(conn, """
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
    """)


def m002_wilayas(conn):
    """Reference table of wilayas with aliases and per-wilaya delivery fees."""
    conn.execute("""
    CREATE TABLE IF NOT EXISTS wilayas (
        code INTEGER PRIMARY KEY,
        name_fr TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        aliases TEXT NOT NULL DEFAULT '[]',
        delivery_fee INTEGER NOT NULL CHECK(delivery_fee >= 0),
        active INTEGER NOT NULL DEFAULT 1
    )""")
    for code, name_fr, name_ar, aliases in wilayas.WILAYAS:
        conn.execute(
            "INSERT OR IGNORE INTO wilayas(code,name_fr,name_ar,aliases,delivery_fee,active) VALUES (?,?,?,?,?,1)",
            (code, name_fr, name_ar, json.dumps(aliases, ensure_ascii=False), wilayas.default_fee(code)),
        )


def m003_staff(conn):
    """Staff accounts and server-side login sessions."""
    _run(conn, """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    """)


def m004_audit_log(conn):
    """Who changed which price, stock level, product status or order status, and when."""
    _run(conn, """
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before TEXT,
        after TEXT,
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
    """)


def m005_wilaya_codes_and_retention(conn):
    """Wilaya codes on orders, soft delete for products, anonymisation marker, search indexes."""
    _add_column(conn, "orders", "wilaya_code", "INTEGER")
    _add_column(conn, "orders", "anonymized_at", "TEXT")
    _add_column(conn, "order_proposals", "wilaya_code", "INTEGER")
    _add_column(conn, "products", "archived_at", "TEXT")
    _run(conn, """
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_proposals_created ON order_proposals(created_at);
    """)


MIGRATIONS = [
    (1, "initial schema", m001_initial),
    (2, "wilayas reference table", m002_wilayas),
    (3, "staff accounts and sessions", m003_staff),
    (4, "audit log", m004_audit_log),
    (5, "wilaya codes, soft delete, retention, indexes", m005_wilaya_codes_and_retention),
]


def applied_versions(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)""")
    return {row[0] for row in conn.execute("SELECT version FROM schema_migrations")}


def _retry_locked(action, attempts=50):
    """Switching to WAL and creating the bookkeeping table can fail with 'database is locked'
    immediately (without waiting) when several workers start at once; retry briefly."""
    for attempt in range(attempts):
        try:
            return action()
        except sqlite3.OperationalError as exc:
            if "locked" not in str(exc).lower() or attempt == attempts - 1:
                raise
            time.sleep(0.02 * (1 + attempt % 5))


def migrate(path):
    """Apply every pending migration in order. Returns the versions applied now.

    Safe to run from several workers at the same time: each migration re-checks,
    under the write lock, whether another worker already applied it.
    """
    conn = sqlite3.connect(path, timeout=10, isolation_level=None)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        _retry_locked(lambda: conn.execute("PRAGMA journal_mode = WAL"))
        applied_now = []
        done = _retry_locked(lambda: applied_versions(conn))
        for version, name, step in MIGRATIONS:
            if version in done:
                continue
            conn.execute("BEGIN IMMEDIATE")
            try:
                # Another worker may have applied it while we waited for the write lock.
                if conn.execute("SELECT 1 FROM schema_migrations WHERE version=?", (version,)).fetchone():
                    conn.execute("COMMIT")
                    continue
                step(conn)
                conn.execute("INSERT INTO schema_migrations(version,name,applied_at) VALUES (?,?,?)",
                             (version, name, _now()))
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise
            applied_now.append(version)
        return applied_now
    finally:
        conn.close()
