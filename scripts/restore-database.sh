#!/usr/bin/env bash
# Real, working database restore for the self-hosted docker-compose MySQL
# setup — the matching half of scripts/backup-database.sh.
#
# Usage:
#   ./scripts/restore-database.sh path/to/tafawoq-backup-TIMESTAMP.sql.gz
#
# DESTRUCTIVE: this replaces the current database's contents with the
# backup's contents. Requires typing the database name to confirm, exactly
# like a real production restore should — no --force flag exists on
# purpose, and there is no non-interactive mode: restoring the wrong
# backup onto the wrong database is exactly the kind of mistake this
# confirmation step exists to catch.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_FILE="${1:?Usage: ./scripts/restore-database.sh path/to/backup.sql.gz}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file not found: $BACKUP_FILE"
  exit 1
fi

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

echo "This will REPLACE all data in database '$MYSQL_DATABASE' with the contents of:"
echo "  $BACKUP_FILE"
echo ""
read -r -p "Type the database name ($MYSQL_DATABASE) to confirm: " CONFIRM
if [ "$CONFIRM" != "$MYSQL_DATABASE" ]; then
  echo "Confirmation did not match. Aborted — nothing was changed."
  exit 1
fi

echo "Restoring..."
if [[ "$BACKUP_FILE" == *.enc ]]; then
  # Encrypted by backup-database.sh: the same key file is needed.
  BACKUP_KEY_FILE="${BACKUP_KEY_FILE:?ERROR: this backup is encrypted: set BACKUP_KEY_FILE to its key file.}"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$BACKUP_FILE" -pass "file:$BACKUP_KEY_FILE" | gunzip -c | docker compose exec -T mysql \
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
else
  gunzip -c "$BACKUP_FILE" | docker compose exec -T mysql \
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
fi

echo "Restore complete."
echo "Run 'node scripts/migrate.mjs' next if this backup predates a migration that's since been added."
