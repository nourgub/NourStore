#!/usr/bin/env bash
# Fully self-contained Replit startup: runs a real local MySQL server
# (via the mariadb package added to replit.nix) inside this same Repl,
# generates the secrets the app requires if they don't exist yet, applies
# every migration, then starts the app itself. No external database, no
# manual setup — this is what `.replit`'s `run` command calls.
#
# State (the MySQL data directory and generated secrets) is written under
# ./.replit-data so it survives across Repl restarts, the same way any
# file in the repo does.
set -euo pipefail

DATA_DIR="$(pwd)/.replit-data"
MYSQL_DATA_DIR="$DATA_DIR/mysql"
MYSQL_SOCKET="$DATA_DIR/mysqld.sock"
SECRETS_FILE="$DATA_DIR/generated.env"
MYSQL_PORT=3306

mkdir -p "$DATA_DIR"

# mysqld refuses to run as root at all unless explicitly told it's OK —
# harmless here since this MySQL only ever listens on 127.0.0.1, never
# reachable from outside the Repl. Most Repl containers run as a
# non-root user already, in which case this is simply never added.
MYSQL_USER_FLAG=()
if [ "$(id -u)" -eq 0 ]; then
  MYSQL_USER_FLAG=(--user=root)
fi

# --- 1. Generate stable secrets on first run only ---------------------
if [ ! -f "$SECRETS_FILE" ]; then
  echo "[replit-start] First run — generating JWT_SECRET and DATABASE_URL..."
  JWT_SECRET_VALUE="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  {
    echo "JWT_SECRET=$JWT_SECRET_VALUE"
    echo "DATABASE_URL=mysql://root@127.0.0.1:$MYSQL_PORT/nourix_academy"
  } > "$SECRETS_FILE"
fi
set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a
# A real Secret set in Replit's Secrets panel always wins over the
# generated one — e.g. if you later point DATABASE_URL at a real external
# MySQL instead of this local one.
if [ -n "${REPLIT_DB_URL_OVERRIDE:-}" ]; then
  export DATABASE_URL="$REPLIT_DB_URL_OVERRIDE"
fi

# --- 2. Initialize the MySQL data directory on first run only ----------
if [ ! -d "$MYSQL_DATA_DIR" ]; then
  echo "[replit-start] Initializing local MySQL data directory..."
  mkdir -p "$MYSQL_DATA_DIR"
  mariadb-install-db \
    --datadir="$MYSQL_DATA_DIR" \
    --auth-root-authentication-method=normal \
    --skip-test-db \
    "${MYSQL_USER_FLAG[@]}" > /dev/null
fi

# --- 3. Start mysqld in the background, wait until it accepts connections
echo "[replit-start] Starting local MySQL server..."
mysqld \
  --datadir="$MYSQL_DATA_DIR" \
  --socket="$MYSQL_SOCKET" \
  --port="$MYSQL_PORT" \
  --bind-address=127.0.0.1 \
  --pid-file="$DATA_DIR/mysqld.pid" \
  "${MYSQL_USER_FLAG[@]}" \
  > "$DATA_DIR/mysqld.log" 2>&1 &
MYSQLD_PID=$!

cleanup() {
  echo "[replit-start] Stopping MySQL..."
  kill "$MYSQLD_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for i in $(seq 1 30); do
  if mysqladmin --socket="$MYSQL_SOCKET" ping --silent 2>/dev/null; then
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "[replit-start] MySQL did not start in time — see $DATA_DIR/mysqld.log"
    cat "$DATA_DIR/mysqld.log"
    exit 1
  fi
done

# --- 4. Create the database if it doesn't exist yet --------------------
mysql --socket="$MYSQL_SOCKET" -u root -e "CREATE DATABASE IF NOT EXISTS nourix_academy;"

# --- 5. Apply migrations (safe to re-run — skips already-applied ones) -
echo "[replit-start] Applying database migrations..."
node scripts/migrate.mjs

# --- 6. Finally, start the actual app -----------------------------------
if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "[replit-start] Building and starting the app (production)..."
  pnpm build
  exec pnpm start
else
  echo "[replit-start] Starting the app (development)..."
  exec pnpm dev
fi
