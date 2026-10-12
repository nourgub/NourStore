"""Staff accounts, password hashing and server-side login sessions.

Sessions are random tokens kept in an HttpOnly cookie; only their SHA-256 hash is
stored, so a database leak does not expose live sessions. Logging out deletes
the row, which revokes the session immediately.
"""
import hashlib
import re
import secrets
from datetime import timedelta

from werkzeug.security import check_password_hash, generate_password_hash

import config
import db

ROLES = ("admin", "staff")
USERNAME = re.compile(r"[a-z0-9._-]{3,40}")
MIN_PASSWORD_LENGTH = 12
# Compared against when the username does not exist, so a failed login takes the
# same time whether or not the account exists.
_DUMMY_HASH = generate_password_hash("not-a-real-password-" + secrets.token_hex(8))


class AuthError(ValueError):
    pass


def _token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def validate_password(password):
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH or len(password) > 200:
        raise AuthError(f"Password must be {MIN_PASSWORD_LENGTH} to 200 characters.")


def create_user(username, password, role):
    username = str(username).strip().lower()
    if not USERNAME.fullmatch(username):
        raise AuthError("Username must be 3-40 characters: letters, digits, dot, dash or underscore.")
    if role not in ROLES:
        raise AuthError("Role must be admin or staff.")
    validate_password(password)
    created = db.stamp()
    try:
        with db.connect(immediate=True) as conn:
            cur = conn.execute(
                "INSERT INTO users(username,password_hash,role,active,created_at,updated_at) VALUES (?,?,?,1,?,?)",
                (username, generate_password_hash(password), role, created, created),
            )
            db._audit(conn, "system", "create", "user", cur.lastrowid, None, {"username": username, "role": role})
            return {"id": cur.lastrowid, "username": username, "role": role, "active": 1}
    except db.sqlite3.IntegrityError:
        raise AuthError("That username is already taken.") from None


def authenticate(username, password):
    """Return the active user for these credentials, or None."""
    username = str(username or "").strip().lower()[:40]
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    stored = row["password_hash"] if row else _DUMMY_HASH
    valid = check_password_hash(stored, str(password or "")[:200])
    if not row or not valid or not row["active"]:
        return None
    return {"id": row["id"], "username": row["username"], "role": row["role"]}


def create_session(user_id):
    """Start a session; returns (cookie token, CSRF token). Expired sessions are pruned here."""
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(24)
    created = db.now()
    with db.connect(immediate=True) as conn:
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (db.stamp(created),))
        conn.execute("INSERT INTO sessions(token_hash,user_id,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?)",
                     (_token_hash(token), user_id, csrf, db.stamp(created),
                      db.stamp(created + timedelta(hours=config.session_hours()))))
    return token, csrf


def session_user(token):
    """The user and CSRF token behind a session cookie, or None if absent/expired/disabled."""
    if not token or len(token) > 100:
        return None
    with db.connect() as conn:
        row = conn.execute(
            "SELECT u.id, u.username, u.role, s.csrf_token FROM sessions s JOIN users u ON u.id = s.user_id "
            "WHERE s.token_hash=? AND s.expires_at > ? AND u.active = 1",
            (_token_hash(token), db.stamp()),
        ).fetchone()
    return dict(row) if row else None


def end_session(token):
    with db.connect(immediate=True) as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash=?", (_token_hash(token or ""),))


def list_users():
    with db.connect() as conn:
        rows = conn.execute("SELECT id,username,role,active,created_at,updated_at FROM users ORDER BY username").fetchall()
    return [dict(r) for r in rows]


def update_user(actor, user_id, fields):
    """Admin changes to another account: role, active flag, or a new password."""
    unknown = set(fields) - {"role", "active", "password"}
    if unknown or not fields:
        raise AuthError("Only role, active and password can be changed.")
    changes = {}
    if "role" in fields:
        if fields["role"] not in ROLES:
            raise AuthError("Role must be admin or staff.")
        changes["role"] = fields["role"]
    if "active" in fields:
        if not isinstance(fields["active"], bool):
            raise AuthError("active must be true or false.")
        changes["active"] = int(fields["active"])
    if "password" in fields:
        validate_password(fields["password"])
        changes["password_hash"] = generate_password_hash(fields["password"])
    with db.connect(immediate=True) as conn:
        row = conn.execute("SELECT * FROM users WHERE id=?", (int(user_id),)).fetchone()
        if not row:
            raise db.NotFound("user not found")
        if row["username"] == actor and (changes.get("active") == 0 or changes.get("role") == "staff"):
            raise AuthError("You cannot deactivate or demote your own account.")
        changes["updated_at"] = db.stamp()
        conn.execute(f"UPDATE users SET {', '.join(f'{k}=?' for k in changes)} WHERE id=?",
                     list(changes.values()) + [int(user_id)])
        # Any security-relevant change logs the user out everywhere.
        conn.execute("DELETE FROM sessions WHERE user_id=?", (int(user_id),))
        logged = {k: v for k, v in changes.items() if k in ("role", "active")}
        if "password_hash" in changes:
            logged["password"] = "changed"
        db._audit(conn, actor, "update", "user", user_id, {k: row[k] for k in ("role", "active") if k in logged}, logged)
        updated = conn.execute("SELECT id,username,role,active FROM users WHERE id=?", (int(user_id),)).fetchone()
    return dict(updated)


def delete_expired_sessions():
    with db.connect(immediate=True) as conn:
        return conn.execute("DELETE FROM sessions WHERE expires_at < ?", (db.stamp(),)).rowcount
