#!/usr/bin/env bash
# Self-contained Replit startup. Tries to run a real local MySQL server
# (via the mariadb package declared in replit.nix) inside this same Repl,
# generates the secrets the app requires if they don't exist yet, applies
# every migration, then starts the app itself — all from a single click
# of Run, no corepack, no external database account required.
#
# Degrades gracefully: if the mariadb tools aren't available for any
# reason (a Repl environment that didn't pick up replit.nix, a transient
# failure, etc.), this script does NOT abort — it logs a clear warning and
# starts the app anyway without DATABASE_URL. The app itself already
# handles that (server/_core/env.ts): the homepage and static UI still
# work, only the features that touch real data won't.
#
# State (the MySQL data directory and generated secrets) is written under
# ./.replit-data so it survives across Repl restarts, the same way any
# file in the repo does.
set -uo pipefail

DATA_DIR="$(pwd)/.replit-data"
MYSQL_DATA_DIR="$DATA_DIR/mysql"
MYSQL_SOCKET="$DATA_DIR/mysqld.sock"
SECRETS_FILE="$DATA_DIR/generated.env"
MYSQL_PORT=3306
DB_READY=0

mkdir -p "$DATA_DIR"

# --- 1. Generate a stable JWT_SECRET on first run only ------------------
# Required unconditionally (server/_core/env.ts treats a missing/weak one
# as fatal) — independent of whether MySQL ends up available.
if [ ! -f "$SECRETS_FILE" ]; then
  echo "[replit-start] First run — generating JWT_SECRET..."
  JWT_SECRET_VALUE="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  echo "JWT_SECRET=$JWT_SECRET_VALUE" > "$SECRETS_FILE"
fi
set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

# --- 2. Try to bring up a local MySQL — never fatal if this fails ------
if command -v mariadb-install-db >/dev/null 2>&1 && command -v mysqld >/dev/null 2>&1; then
  # mysqld refuses to run as root at all unless explicitly told it's OK —
  # harmless here since this MySQL only ever listens on 127.0.0.1, never
  # reachable from outside the Repl. Most Repl containers already run as
  # a non-root user, in which case this is simply never added.
  MYSQL_USER_FLAG=()
  if [ "$(id -u)" -eq 0 ]; then
    MYSQL_USER_FLAG=(--user=root)
  fi

  if [ ! -d "$MYSQL_DATA_DIR" ]; then
    echo "[replit-start] Initializing local MySQL data directory..."
    mkdir -p "$MYSQL_DATA_DIR"
    if ! mariadb-install-db \
      --datadir="$MYSQL_DATA_DIR" \
      --auth-root-authentication-method=normal \
      --skip-test-db \
      "${MYSQL_USER_FLAG[@]+"${MYSQL_USER_FLAG[@]}"}" > "$DATA_DIR/mysql-install.log" 2>&1
    then
      echo "[replit-start] WARNING: could not initialize MySQL — see $DATA_DIR/mysql-install.log"
      rm -rf "$MYSQL_DATA_DIR"
    fi
  fi

  if [ -d "$MYSQL_DATA_DIR" ]; then
    echo "[replit-start] Starting local MySQL server..."
    mysqld \
      --datadir="$MYSQL_DATA_DIR" \
      --socket="$MYSQL_SOCKET" \
      --port="$MYSQL_PORT" \
      --bind-address=127.0.0.1 \
      --pid-file="$DATA_DIR/mysqld.pid" \
      "${MYSQL_USER_FLAG[@]+"${MYSQL_USER_FLAG[@]}"}" \
      > "$DATA_DIR/mysqld.log" 2>&1 &
    MYSQLD_PID=$!

    cleanup() {
      if [ "$DB_READY" -eq 1 ]; then
        echo "[replit-start] Stopping MySQL..."
        kill "$MYSQLD_PID" 2>/dev/null || true
      fi
    }
    trap cleanup EXIT INT TERM

    for i in $(seq 1 30); do
      if mysqladmin --socket="$MYSQL_SOCKET" ping --silent 2>/dev/null; then
        DB_READY=1
        break
      fi
      sleep 1
    done

    if [ "$DB_READY" -eq 1 ]; then
      mysql --socket="$MYSQL_SOCKET" -u root -e "CREATE DATABASE IF NOT EXISTS nourix_academy;"
      export DATABASE_URL="mysql://root@127.0.0.1:$MYSQL_PORT/nourix_academy"
      echo "[replit-start] Applying database migrations..."
      if ! node scripts/migrate.mjs; then
        echo "[replit-start] WARNING: migrations failed — continuing without a guaranteed schema. See output above."
      fi
    else
      echo "[replit-start] WARNING: MySQL did not become ready in time — see $DATA_DIR/mysqld.log"
      echo "[replit-start] Starting the app WITHOUT a database (degraded mode)."
      cat "$DATA_DIR/mysqld.log" 2>/dev/null || true
    fi
  fi
else
  echo "[replit-start] WARNING: mariadb tools not found in this environment (replit.nix may not have applied)."
  echo "[replit-start] Starting the app WITHOUT a database (degraded mode) — the homepage and static UI still work."
  echo "[replit-start] To fix: rebuild this Repl so replit.nix takes effect, or set DATABASE_URL to an external MySQL host in Secrets."
fi

# A real Secret set in Replit's Secrets panel always wins over the local
# database this script may have just started — e.g. if you'd rather point
# DATABASE_URL at a real external MySQL instead.
if [ -n "${REPLIT_DB_URL_OVERRIDE:-}" ]; then
  export DATABASE_URL="$REPLIT_DB_URL_OVERRIDE"
fi

# --- 3. Finally, start the app -------------------------------------------
# process.env.PORT (Replit sets this) takes priority over APP_PORT, and
# the app itself falls back to 3000 if neither is set (server/_core/index.ts).
if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "[replit-start] Building and starting the app (production)..."
  npm run build
  exec npm start
else
  echo "[replit-start] Starting the app (development)..."
  exec npm run dev
fi
