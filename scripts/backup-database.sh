#!/usr/bin/env bash
# Real, working database backup for the self-hosted docker-compose MySQL
# setup (see docker-compose.yml). Writes a timestamped, gzip-compressed
# SQL dump — the standard, restorable mysqldump format — not a placeholder.
#
# Usage:
#   ./scripts/backup-database.sh [output-directory]
#
# Defaults to ./backups if no directory is given. Reads MYSQL_DATABASE,
# MYSQL_USER, MYSQL_PASSWORD from .env (same file docker-compose.yml uses),
# so this stays correct if those are ever changed — never hardcodes them.
#
# Automate this with cron for real, unattended backups, e.g. nightly at 3am:
#   0 3 * * * cd /path/to/tafawoq && ./scripts/backup-database.sh >> backups/backup.log 2>&1
#
# Test a restore end to end on an isolated database: scripts/backup-drill.sh.
# See scripts/restore-database.sh for the matching restore procedure —
# a backup that has never been test-restored is not a verified backup.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${1:-$PROJECT_ROOT/backups}"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Named explicitly in .env (never guessed: a wrong guess here would dump
# or overwrite the wrong database).
MYSQL_DATABASE="${MYSQL_DATABASE:?ERROR: MYSQL_DATABASE is not set. Fill in .env first (see .env.example).}"
MYSQL_USER="${MYSQL_USER:?ERROR: MYSQL_USER is not set. Fill in .env first (see .env.example).}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?ERROR: MYSQL_PASSWORD is not set. Fill in .env first (see .env.example).}"

mkdir -p "$OUTPUT_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUTPUT_DIR/tafawoq-backup-${TIMESTAMP}.sql.gz"

echo "Backing up database '$MYSQL_DATABASE' to $OUT_FILE ..."

docker compose exec -T mysql \
  mysqldump \
    -u"$MYSQL_USER" \
    -p"$MYSQL_PASSWORD" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "$MYSQL_DATABASE" \
  | gzip > "$OUT_FILE"

# Encrypted when BACKUP_KEY_FILE is set (AES-256): keep that key file away
# from the backups (another machine or a password manager) — a backup
# stored next to its key protects nothing.
if [ -n "${BACKUP_KEY_FILE:-}" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in "$OUT_FILE" -out "$OUT_FILE.enc" -pass "file:$BACKUP_KEY_FILE"
  rm "$OUT_FILE"
  OUT_FILE="$OUT_FILE.enc"
else
  echo "WARNING: not encrypted (set BACKUP_KEY_FILE). Do not copy this file to shared or cloud storage as is."
fi
chmod 600 "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Backup complete: $OUT_FILE ($SIZE)"
echo ""
echo "Verify it restores correctly with:"
echo "  ./scripts/restore-database.sh $OUT_FILE"
