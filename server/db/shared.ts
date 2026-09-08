import { drizzle } from "drizzle-orm/mysql2";

// Shared MySQL connection state and accessor — every domain file under
// server/db/ imports getDb() from here, so there is exactly one connection
// pool for the whole app regardless of how many domain modules use it.

let _db: ReturnType<typeof drizzle> | null = null;

// Managed MySQL providers (Aiven, PlanetScale, etc.) commonly encode their
// TLS requirement as a `ssl-mode=REQUIRED` query param — a libmysqlclient/
// PDO convention that mysql2 doesn't recognize as a connection option (it
// only understands a real `ssl` object, passed separately, not as part of
// the URL) and otherwise just warns about and ignores, silently connecting
// without TLS at all. This strips that param and translates it into the
// option mysql2 actually understands, and leaves a plain DATABASE_URL
// (e.g. a local/self-hosted MySQL with no ssl-mode param at all) untouched.
function buildConnectionConfig(databaseUrl: string): string | { uri: string; ssl: { rejectUnauthorized: boolean } } {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }
  const sslMode = parsed.searchParams.get("ssl-mode");
  if (!sslMode) return databaseUrl;
  parsed.searchParams.delete("ssl-mode");
  return { uri: parsed.toString(), ssl: { rejectUnauthorized: true } };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connection = buildConnectionConfig(process.env.DATABASE_URL);
      _db = typeof connection === "string" ? drizzle(connection) : drizzle({ connection });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

