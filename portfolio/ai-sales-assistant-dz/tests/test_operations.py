"""Backups, restores, concurrent start-up migrations and production safety switches."""
import sqlite3
import sys
import threading
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import backup  # noqa: E402
import restore  # noqa: E402


def test_backup_and_restore_round_trip(make_app, tmp_path):
    make_app()
    import db
    proposal = db.propose_order("Amina", "0555123456", "Oran", [{"product_id": 5, "quantity": 1}])
    db.confirm_order(proposal["proposal_id"])
    saved = backup.backup(db.db_path(), tmp_path / "backups")
    proposal = db.propose_order("Later", "0666123456", "Alger", [{"product_id": 5, "quantity": 1}])
    db.confirm_order(proposal["proposal_id"])
    assert len(db.list_orders()) == 2
    previous = restore.restore(saved, db.db_path())
    assert [o["customer"] for o in db.list_orders()] == ["Amina"]
    assert previous.exists()  # the replaced database is kept


def test_backup_keeps_only_the_newest(make_app, tmp_path, monkeypatch):
    make_app()
    import db
    names = iter([f"2026010{i}-000000" for i in range(1, 6)])
    monkeypatch.setattr(backup.time, "strftime", lambda fmt: next(names))
    for _ in range(5):
        backup.backup(db.db_path(), tmp_path / "b", keep=3)
    assert sorted(p.name for p in (tmp_path / "b").glob("*.db")) == [
        "store-20260103-000000.db", "store-20260104-000000.db", "store-20260105-000000.db"]


def test_restore_refuses_damaged_or_foreign_files(tmp_path):
    junk = tmp_path / "junk.db"
    junk.write_bytes(b"not a database at all" * 100)
    with pytest.raises((SystemExit, sqlite3.DatabaseError)):
        restore.restore(junk, tmp_path / "store.db")
    other = tmp_path / "other.db"
    sqlite3.connect(other).execute("CREATE TABLE notes(x)").connection.close()
    with pytest.raises(SystemExit):
        restore.restore(other, tmp_path / "store.db")
    assert not (tmp_path / "store.db").exists()


def test_concurrent_workers_migrate_once(tmp_path):
    import migrations
    path = tmp_path / "race.db"
    errors, applied = [], []

    def start_worker():
        try:
            applied.append(migrations.migrate(path))
        except Exception as exc:  # pragma: no cover - reported below
            errors.append(exc)

    workers = [threading.Thread(target=start_worker) for _ in range(6)]
    [w.start() for w in workers]
    [w.join() for w in workers]
    assert errors == []
    assert sorted(v for versions in applied for v in versions) == [1, 2, 3, 4, 5]


def test_debug_mode_is_refused_unless_explicitly_allowed(make_app):
    assert make_app(FLASK_DEBUG="1").app.debug is False
    assert make_app(FLASK_DEBUG="1", ALLOW_DEBUG="true").app.debug is True


def test_requirements_are_pinned():
    for line in (ROOT / "requirements.txt").read_text().splitlines():
        if line.strip() and not line.startswith("#"):
            assert "==" in line, line
