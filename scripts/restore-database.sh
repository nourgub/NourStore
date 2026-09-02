#!/usr/bin/env bash
# Real, working database restore for the self-hosted docker-compose MySQL
# setup — the matching half of scripts/backup-database.sh.
#
# Usage:
#   ./scripts/restore-database.sh path/to/nourix-backup-TIMESTAMP.sql.gz
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

MYSQL_DATABASE="${MYSQL_DATABASE:-nourix_academy}"
MYSQL_USER="${MYSQL_USER:-nourix}"
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
gunzip -c "$BACKUP_FILE" | docker compose exec -T mysql \
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"

echo "Restore complete."
echo "Run 'node scripts/migrate.mjs' next if this backup predates a migration that's since been added."
