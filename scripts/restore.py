"""Restore the SQLite database from a backup file. Stop the app first.

    python scripts/restore.py backups/store-20261011-220000.db

The current database is kept next to it as <name>.before-restore-<time> so the
restore itself can be undone.
"""
import argparse
import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path


def restore(backup_file, db_path):
    backup_path, target = Path(backup_file), Path(db_path)
    if not backup_path.exists():
        raise SystemExit(f"Backup not found: {backup_path}")
    check = sqlite3.connect(backup_path)
    try:
        if check.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("The backup file is damaged; nothing was changed.")
        tables = {row[0] for row in check.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    finally:
        check.close()
    if not {"products", "orders"} <= tables:
        raise SystemExit("This file is not a store database; nothing was changed.")
    target.parent.mkdir(parents=True, exist_ok=True)
    previous = None
    if target.exists():
        previous = target.with_name(f"{target.name}.before-restore-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.move(target, previous)
    for suffix in ("-wal", "-shm"):  # stale WAL files would be replayed onto the restored copy
        stale = Path(str(target) + suffix)
        if stale.exists():
            stale.unlink()
    shutil.copy2(backup_path, target)
    return previous


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("backup")
    parser.add_argument("--db", default=os.getenv("DB_PATH", "data/store.db"))
    args = parser.parse_args(argv)
    previous = restore(args.backup, args.db)
    print(f"Restored {args.db}" + (f"; previous database kept at {previous}" if previous else ""))


if __name__ == "__main__":
    sys.exit(main())
