#!/usr/bin/env bash
# Self-contained Replit startup — tries two independent ways to get a real,
# persistent local MySQL running inside this same Repl, and if BOTH fail,
# starts the app anyway without one (degraded mode) rather than aborting.
#
#   Layer 1: mariadb declared as a Nix package (replit.nix and .replit's
#            [nix].packages) — works if this Repl's environment actually
#            applies Nix package declarations.
#   Layer 2: a real MySQL binary downloaded directly from MySQL's CDN over
#            plain HTTPS (scripts/replit-fetch-mysql-binary.mjs, via the
#            `mysql-memory-server` npm package used purely as a binary
#            fetcher) — works if Nix isn't available AND the system
#            already has libaio, which the downloaded binary itself
#            requires and this script cannot install on its own.
#
# Either layer, once a binary is found, is driven the same way: a real,
# persistent --datadir under .replit-data/mysql so accounts/courses/etc.
# survive across Repl restarts — never an in-memory-only database.
set -uo pipefail

DATA_DIR="$(pwd)/.replit-data"
MYSQL_DATA_DIR="$DATA_DIR/mysql"
MYSQL_SOCKET="$DATA_DIR/mysqld.sock"
SECRETS_FILE="$DATA_DIR/generated.env"
MYSQL_PORT=3306
DB_READY=0
MYSQLD_PID=""

mkdir -p "$DATA_DIR"

# --- Generate a stable JWT_SECRET on first run only ---------------------
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

# mysqld refuses to run as root at all unless explicitly told it's OK —
# harmless here since this MySQL only ever listens on 127.0.0.1, never
# reachable from outside the Repl. Most Repl containers already run as a
# non-root user, in which case this is simply never added.
MYSQL_USER_FLAG=()
if [ "$(id -u)" -eq 0 ]; then
  MYSQL_USER_FLAG=(--user=root)
fi

# Starts mysqld (path in $1), waits for it to accept connections via
# mysqladmin (path in $2), creates the app database via the mysql client
# (path in $3), and applies migrations. $1/$2/$3 are resolved independently
# by the caller rather than assumed to share one bin/ directory — real
# packaging layouts differ (Debian/Ubuntu's apt mariadb-server splits
# mysqld into /usr/sbin while mysqladmin/mysql stay in /usr/bin; Nix and
# the downloaded-tarball layout both keep everything together in one
# bin/ — this works correctly either way). Sets DB_READY=1 and exports
# DATABASE_URL on success. Never exits the script on failure — just leaves
# DB_READY=0 for the caller to notice.
start_mysqld_from() {
  local mysqld_bin="$1"
  local mysqladmin_bin="$2"
  local mysql_bin="$3"
  shift 3
  # Remaining args ($@), if any, are extra mysqld flags — used by the
  # downloaded-binary layer to pass --no-defaults (never read a stray
  # system-wide my.cnf that might belong to an unrelated MySQL/MariaDB
  # install) and --basedir (so it finds its own bundled share/ files
  # instead of assuming a system-wide install path).
  echo "[replit-start] Starting local MySQL server ($mysqld_bin)..."
  # --no-defaults (when passed in "$@") MUST come before every other flag —
  # mysqld only honors it as the very first argument; anywhere else, the
  # default config file has already been parsed by the time it's seen.
  "$mysqld_bin" \
    "$@" \
    --datadir="$MYSQL_DATA_DIR" \
    --socket="$MYSQL_SOCKET" \
    --port="$MYSQL_PORT" \
    --bind-address=127.0.0.1 \
    --pid-file="$DATA_DIR/mysqld.pid" \
    "${MYSQL_USER_FLAG[@]+"${MYSQL_USER_FLAG[@]}"}" \
    > "$DATA_DIR/mysqld.log" 2>&1 &
  MYSQLD_PID=$!

  for i in $(seq 1 30); do
    if "$mysqladmin_bin" --socket="$MYSQL_SOCKET" ping --silent 2>/dev/null; then
      DB_READY=1
      break
    fi
    sleep 1
  done

  if [ "$DB_READY" -eq 1 ]; then
    "$mysql_bin" --socket="$MYSQL_SOCKET" -u root -e "CREATE DATABASE IF NOT EXISTS nourix_academy;"
    export DATABASE_URL="mysql://root@127.0.0.1:$MYSQL_PORT/nourix_academy"
    echo "[replit-start] Applying database migrations..."
    if ! node scripts/migrate.mjs; then
      echo "[replit-start] WARNING: migrations failed — continuing without a guaranteed schema. See output above."
    fi
  else
    echo "[replit-start] WARNING: MySQL did not become ready in time — see $DATA_DIR/mysqld.log"
    cat "$DATA_DIR/mysqld.log" 2>/dev/null || true
    kill "$MYSQLD_PID" 2>/dev/null || true
  fi
}

cleanup() {
  if [ "$DB_READY" -eq 1 ] && [ -n "$MYSQLD_PID" ]; then
    echo "[replit-start] Stopping MySQL..."
    kill "$MYSQLD_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# --- Layer 1: Nix-declared mariadb ---------------------------------------
if command -v mariadb-install-db >/dev/null 2>&1 && command -v mysqld >/dev/null 2>&1 \
  && command -v mysqladmin >/dev/null 2>&1 && command -v mysql >/dev/null 2>&1; then
  if [ ! -d "$MYSQL_DATA_DIR" ]; then
    echo "[replit-start] Initializing local MySQL data directory (mariadb)..."
    mkdir -p "$MYSQL_DATA_DIR"
    if ! mariadb-install-db \
      --datadir="$MYSQL_DATA_DIR" \
      --auth-root-authentication-method=normal \
      --skip-test-db \
      "${MYSQL_USER_FLAG[@]+"${MYSQL_USER_FLAG[@]}"}" > "$DATA_DIR/mysql-install.log" 2>&1
    then
      echo "[replit-start] WARNING: could not initialize MySQL (mariadb) — see $DATA_DIR/mysql-install.log"
      rm -rf "$MYSQL_DATA_DIR"
    fi
  fi
  if [ -d "$MYSQL_DATA_DIR" ]; then
    start_mysqld_from "$(command -v mysqld)" "$(command -v mysqladmin)" "$(command -v mysql)"
  fi
else
  echo "[replit-start] mariadb tools not found on PATH (replit.nix may not have applied)."
fi

# --- Layer 2: downloaded MySQL binary, only if layer 1 didn't work -------
if [ "$DB_READY" -ne 1 ]; then
  echo "[replit-start] Trying a directly-downloaded MySQL binary instead (no Nix/apt involved)..."
  DOWNLOADED_BINDIR="$(node scripts/replit-fetch-mysql-binary.mjs 2>>"$DATA_DIR/mysql-fetch.log")"
  if [ -n "$DOWNLOADED_BINDIR" ] && [ -x "$DOWNLOADED_BINDIR/mysqld" ]; then
    DOWNLOADED_BASEDIR="$(dirname "$DOWNLOADED_BINDIR")"
    if [ ! -d "$MYSQL_DATA_DIR" ]; then
      echo "[replit-start] Initializing local MySQL data directory (downloaded binary)..."
      mkdir -p "$MYSQL_DATA_DIR"
      if ! "$DOWNLOADED_BINDIR/mysqld" --no-defaults --initialize-insecure \
        --basedir="$DOWNLOADED_BASEDIR" --datadir="$MYSQL_DATA_DIR" \
        "${MYSQL_USER_FLAG[@]+"${MYSQL_USER_FLAG[@]}"}" > "$DATA_DIR/mysql-install.log" 2>&1
      then
        echo "[replit-start] WARNING: could not initialize MySQL (downloaded binary) — see $DATA_DIR/mysql-install.log"
        rm -rf "$MYSQL_DATA_DIR"
      fi
    fi
    if [ -d "$MYSQL_DATA_DIR" ]; then
      start_mysqld_from "$DOWNLOADED_BINDIR/mysqld" "$DOWNLOADED_BINDIR/mysqladmin" "$DOWNLOADED_BINDIR/mysql" \
        --no-defaults --basedir="$DOWNLOADED_BASEDIR"
    fi
  else
    echo "[replit-start] WARNING: could not obtain a working MySQL binary this way either."
    echo "[replit-start] See $DATA_DIR/mysql-fetch.log — this commonly means the system is"
    echo "[replit-start] missing the libaio shared library, which this script cannot install."
    cat "$DATA_DIR/mysql-fetch.log" 2>/dev/null || true
  fi
fi

if [ "$DB_READY" -ne 1 ]; then
  echo "[replit-start] Starting the app WITHOUT a database (degraded mode) — the homepage and static UI still work."
  echo "[replit-start] To fix: rebuild this Repl so replit.nix takes effect, or set DATABASE_URL to an external MySQL host in Secrets."
fi

# A real Secret set in Replit's Secrets panel always wins over the local
# database this script may have just started — e.g. if you'd rather point
# DATABASE_URL at a real external MySQL instead.
if [ -n "${REPLIT_DB_URL_OVERRIDE:-}" ]; then
  export DATABASE_URL="$REPLIT_DB_URL_OVERRIDE"
fi

# --- Finally, start the app -----------------------------------------------
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
