// Applies every drizzle/*.sql migration file, in order, to whatever
// DATABASE_URL points at. Pure Node.js + the mysql2 driver already used by
// the app — no external CLI tool, no separate service, nothing to sign up
// for.
//
// Tracks applied migrations in a real `_migrations` table instead of
// guessing from SQL error message text. The previous approach re-ran
// every file's SQL on every invocation and used a fragile heuristic
// ("does this error message contain 'already exists' or 'Duplicate
// column'?") to decide whether a failure meant "already applied, skip
// it" versus "a real problem". That heuristic broke for migration 0017's
// `DROP INDEX` statement — dropping an index that's already gone raises a
// different error message ("check that it exists"), which the heuristic
// didn't recognize, so re-running on a partially-migrated database failed
// outright instead of skipping cleanly. A real tracking table sidesteps
// the whole class of problem: a migration file is either recorded as
// applied (and skipped entirely, its SQL never re-executed) or it isn't
// (and runs for the first time) — no guessing from error text at all.
//
// Usage:
//   DATABASE_URL="mysql://user:pass@host:3306/dbname" node scripts/migrate.mjs
//
// Or, with docker-compose.yml's .env already set:
//   node scripts/migrate.mjs

import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "..", "drizzle");

async function migrationsTableExists(connection) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_migrations'"
  );
  return rows[0].count > 0;
}

async function hasPreExistingSchema(connection) {
  // A real signal that migrations were already applied by the *old*
  // version of this script (before the _migrations table existed) — the
  // `users` table is created by the very first migration (0000), so its
  // presence means this database is not actually fresh.
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
  );
  return rows[0].count > 0;
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    "SELECT filename FROM _migrations"
  );
  return new Set(rows.map((row) => row.filename));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: set DATABASE_URL before running this script.");
    process.exit(1);
  }

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort(); // filenames are zero-padded (0000_, 0001_, ...) so lexical sort == correct order

  if (!files.length) {
    console.log("No migration files found in", migrationsDir);
    return;
  }

  console.log(`Found ${files.length} migration file(s):`);
  for (const file of files) console.log(`  - ${file}`);
  console.log("");

  const connection = await mysql.createConnection({ uri: databaseUrl, multipleStatements: true });

  try {
    const trackingTableAlreadyExisted = await migrationsTableExists(connection);
    await ensureMigrationsTable(connection);

    if (!trackingTableAlreadyExisted) {
      // First run of this version of the script. Distinguish "genuinely
      // fresh database" from "already migrated by the old, untracked
      // version of this script" — backfilling the latter case is what
      // makes this change safe to deploy onto a database that's already
      // running in production, not just onto brand-new ones.
      const preExisting = await hasPreExistingSchema(connection);
      if (preExisting) {
        console.log(
          "Existing schema detected with no migration-tracking table yet " +
            "— this database was migrated by an earlier version of this " +
            "script. Recording all current migration files as already " +
            "applied (not re-running their SQL) before continuing.\n"
        );
        for (const file of files) {
          await connection.query(
            "INSERT IGNORE INTO _migrations (filename) VALUES (?)",
            [file]
          );
        }
      }
    }

    const applied = await getAppliedMigrations(connection);
    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping ${file} (already recorded as applied).`);
        skippedCount++;
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      let sql = await fs.readFile(fullPath, "utf-8");
      // drizzle-kit's own breakpoint marker — harmless to strip, mysql2 doesn't understand it.
      // Each statement already ends with its own ";" on the previous line, so replace with
      // nothing rather than another ";" (which would leave a stray empty statement that some
      // MySQL multi-statement parsers reject).
      sql = sql.replace(/-->\s*statement-breakpoint/g, "");
      console.log(`Applying ${file} ...`);
      await connection.query(sql);
      await connection.query(
        "INSERT INTO _migrations (filename) VALUES (?)",
        [file]
      );
      console.log(`  OK`);
      appliedCount++;
    }

    console.log(
      `\n✅ Done. ${appliedCount} migration(s) applied, ${skippedCount} already up to date.`
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error.message);
  process.exit(1);
});
