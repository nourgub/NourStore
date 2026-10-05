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
// without TLS at all.
//
// Every field (host/port/user/password/database) is extracted explicitly
// here — via the same URL API, decoded the same way mysql2's own internal
// parser would — rather than handing mysql2 the raw `uri` string to parse
// itself. Functionally equivalent, but it means there is exactly one place
// responsible for interpreting percent-encoding in the password, which
// makes that step directly inspectable/loggable when a provider's
// generated credentials don't behave as expected, instead of it happening
// implicitly inside the driver.
//
// Some of these providers (Aiven included) sign their MySQL server
// certificate with their own private CA rather than a publicly-trusted
// one, so verifying against Node's default trust store fails with
// "self-signed certificate in certificate chain" even though the
// connection is genuinely TLS-encrypted. DATABASE_CA_CERT (that CA's own
// certificate, PEM-encoded — never a secret, safe to store as a plain
// config value) lets that verification actually succeed instead of
// falling back to rejectUnauthorized: false, which would accept ANY
// certificate and defeat the point of using TLS at all.
function buildConnectionConfig(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }
  const sslMode = parsed.searchParams.get("ssl-mode");
  if (!sslMode) return databaseUrl;
  const caCert = process.env.DATABASE_CA_CERT;
  const config = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ssl: caCert ? { rejectUnauthorized: true, ca: caCert } : { rejectUnauthorized: true },
  };
  // Non-secret connection metadata only — never the password itself —
  // logged once so a credential/host/port mismatch from a managed
  // provider is visible in deploy logs instead of only surfacing as an
  // opaque "Access denied".
  console.log(
    `[Database] Connecting to managed MySQL: host=${config.host} port=${config.port} user=${config.user} database=${config.database} passwordLength=${config.password.length}`
  );
  return config;
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

