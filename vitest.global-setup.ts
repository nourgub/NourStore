import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const TEST_DB_PATH = path.join(process.cwd(), "prisma", ".test.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/**
 * Provisions a throwaway SQLite database for API integration tests by
 * replaying the real migration SQL files (kept in sync automatically,
 * unlike a hand-maintained schema copy), then points DATABASE_URL at it
 * for the whole test run. Runs once before any test file is imported, so
 * src/lib/db.ts — which reads DATABASE_URL at module load — picks it up.
 */
export default function setup() {
  rmSync(TEST_DB_PATH, { force: true });
  mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });

  const db = new Database(TEST_DB_PATH);
  const migrationFolders = readdirSync(MIGRATIONS_DIR)
    .filter((name) => existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
    .sort();

  for (const folder of migrationFolders) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, folder, "migration.sql"), "utf8");
    db.exec(sql);
  }
  db.close();

  // Force these rather than falling back to whatever the ambient environment
  // has, so the integration tests' assertions (e.g. the known admin
  // password) stay deterministic regardless of how vitest was invoked.
  process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
  process.env.SESSION_SECRET = "test-only-secret-not-for-production-0123456789";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "test-admin-password";

  return function teardown() {
    rmSync(TEST_DB_PATH, { force: true });
  };
}
