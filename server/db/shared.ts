import { drizzle } from "drizzle-orm/mysql2";

// Shared MySQL connection state and accessor — every domain file under
// server/db/ imports getDb() from here, so there is exactly one connection
// pool for the whole app regardless of how many domain modules use it.

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
