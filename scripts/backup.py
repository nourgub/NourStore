"""Consistent online backup of the SQLite database, safe while the app is running.

    python scripts/backup.py                 # writes backups/store-YYYYmmdd-HHMMSS.db
    python scripts/backup.py --keep 14       # and keeps only the 14 newest backups
"""
import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path


def backup(db_path, backup_dir, keep=None):
    source_path = Path(db_path)
    if not source_path.exists():
        raise SystemExit(f"Database not found: {source_path}")
    target_dir = Path(backup_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"store-{time.strftime('%Y%m%d-%H%M%S')}.db"
    source = sqlite3.connect(source_path)
    destination = sqlite3.connect(target)
    try:
        source.backup(destination)  # SQLite's online backup API: consistent even during writes
    finally:
        destination.close()
        source.close()
    check = sqlite3.connect(target)
    try:
        if check.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit(f"Backup failed its integrity check: {target}")
    finally:
        check.close()
    if keep:
        for old in sorted(target_dir.glob("store-*.db"))[:-keep]:
            old.unlink()
    return target


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", default=os.getenv("DB_PATH", "data/store.db"))
    parser.add_argument("--out", default=os.getenv("BACKUP_DIR", "backups"))
    parser.add_argument("--keep", type=int, default=None)
    args = parser.parse_args(argv)
    print(backup(args.db, args.out, args.keep))


if __name__ == "__main__":
    sys.exit(main())
