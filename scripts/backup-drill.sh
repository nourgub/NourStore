#!/usr/bin/env bash
# Backup → restore drill on an ISOLATED database: dump the source, compress,
# encrypt (when BACKUP_KEY_FILE is set), decrypt, restore into a separate
# drill database, then compare the row count of every table. A backup that
# was never restored is not a verified backup; a drill that passes says the
# dump restores, not that the backups of production are kept safely.
#
#   SOURCE_URL=mysql://user:pass@host:3306/tafawoq_test \
#   DRILL_URL=mysql://user:pass@host:3306/tafawoq_restore_drill \
#   [BACKUP_KEY_FILE=/secure/elsewhere/backup.key] ./scripts/backup-drill.sh
#
# The drill database's name must contain "drill" (it is dropped and
# recreated), and it can never be the source. Never point it at production.
# MYSQL / MYSQLDUMP choose the client binaries (default: from PATH).
set -euo pipefail

SOURCE_URL="${SOURCE_URL:?SOURCE_URL=mysql://… is required}"
DRILL_URL="${DRILL_URL:?DRILL_URL=mysql://…/…drill… is required}"
MYSQL="${MYSQL:-mysql}"
MYSQLDUMP="${MYSQLDUMP:-mysqldump}"

parse() { # url → "user pass host port db"
  node -e 'const u=new URL(process.argv[1]); if(u.protocol!=="mysql:") throw new Error("mysql:// only"); console.log([decodeURIComponent(u.username)||"root", decodeURIComponent(u.password)||"", u.hostname, u.port||"3306", u.pathname.slice(1)].map(v=>v||"-").join(" "))' "$1"
}
read -r S_USER S_PASS S_HOST S_PORT S_DB <<<"$(parse "$SOURCE_URL")"
read -r D_USER D_PASS D_HOST D_PORT D_DB <<<"$(parse "$DRILL_URL")"
[ "$S_PASS" = "-" ] && S_PASS=""
[ "$D_PASS" = "-" ] && D_PASS=""

case "$D_DB" in *drill*) ;; *) echo "REFUSED: the drill database name must contain 'drill' (got '$D_DB')."; exit 1 ;; esac
if [ "$D_DB" = "$S_DB" ] && [ "$D_HOST" = "$S_HOST" ] && [ "$D_PORT" = "$S_PORT" ]; then echo "REFUSED: drill database = source."; exit 1; fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
src() { MYSQL_PWD="$S_PASS" "$@" -h"$S_HOST" -P"$S_PORT" -u"$S_USER"; }
dst() { MYSQL_PWD="$D_PASS" "$@" -h"$D_HOST" -P"$D_PORT" -u"$D_USER"; }

echo "1/5 dump $S_DB"
src "$MYSQLDUMP" --single-transaction --quick --routines --triggers --no-tablespaces "$S_DB" | gzip > "$WORK/dump.sql.gz"
FILE="$WORK/dump.sql.gz"
if [ -n "${BACKUP_KEY_FILE:-}" ]; then
  echo "2/5 encrypt (AES-256, key file kept apart from the backups)"
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in "$FILE" -out "$FILE.enc" -pass "file:$BACKUP_KEY_FILE"
  rm "$FILE"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$FILE.enc" -out "$WORK/restored.sql.gz" -pass "file:$BACKUP_KEY_FILE"
  FILE="$WORK/restored.sql.gz"
else
  echo "2/5 not encrypted (set BACKUP_KEY_FILE to encrypt)"
fi

echo "3/5 recreate $D_DB"
dst "$MYSQL" -e "DROP DATABASE IF EXISTS \`$D_DB\`; CREATE DATABASE \`$D_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "4/5 restore"
gunzip -c "$FILE" | dst "$MYSQL" "$D_DB"

echo "5/5 compare row counts"
count_rows() { # side db → "table count" lines
  local side="$1" db="$2"
  for table in $($side "$MYSQL" -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$db' AND table_type='BASE TABLE' ORDER BY table_name"); do
    echo "$table $($side "$MYSQL" -N -B -e "SELECT COUNT(*) FROM \`$db\`.\`$table\`")"
  done
}
count_rows src "$S_DB" > "$WORK/source.txt"
count_rows dst "$D_DB" > "$WORK/drill.txt"
if diff -u "$WORK/source.txt" "$WORK/drill.txt"; then
  echo "DRILL OK: $(wc -l < "$WORK/source.txt") tables, $(awk '{s+=$2} END {print s}' "$WORK/source.txt") rows restored identically."
else
  echo "DRILL FAILED: row counts differ (above)."
  exit 1
fi
