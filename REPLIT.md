# Running this on Replit

Replit hosts the Node app itself (server + client) and gives it a real
public URL — that part just works out of the box via the `.replit` file in
this repo. What Replit does **not** provide is a real MySQL server, and this
app needs one (it uses MySQL-specific SQL via Drizzle ORM — not SQLite,
not Replit's own key-value DB).

So the setup is: **app runs on Replit, database runs elsewhere**, connected
by one connection string.

## 1. Get a MySQL database reachable from the internet

Any MySQL 8+ (or MariaDB 10.6+) host works, as long as it accepts remote
connections and gives you a connection string in this form:

```
mysql://user:password@host:3306/database_name
```

A few options that currently offer a free or cheap tier for a small
database (check current pricing yourself — this changes over time):
Aiven, Railway, Clever Cloud, TiDB Cloud (MySQL-compatible). Pick one, sign
up, create a MySQL database, and copy its connection string.

## 2. Import this repo into Replit

- Replit → Create Repl → **Import from GitHub** → point it at this
  repository/branch.
- Replit will detect `.replit` in the repo root and use it automatically
  (install + run command, port mapping).

## 3. Set Secrets (Replit's Secrets panel, not a committed `.env`)

At minimum:

| Key | Value |
|---|---|
| `DATABASE_URL` | the connection string from step 1 |
| `JWT_SECRET` | a long random string — generate one with `openssl rand -hex 32` |

Optional (see `.env.example` for the full list and what each one does):
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Google sign-in and the
auto-Meet-link feature), `AUTH_PROVIDER=email` if you don't want Google
sign-in at all, `STORAGE_PROVIDER=local` (default — fine for Replit).

## 4. Run the database migrations once

Open the Replit **Shell** tab and run:

```
node scripts/migrate.mjs
```

This creates every table against the database from step 1. Safe to
re-run — it skips migrations already applied.

## 5. Click Run

The app boots in development mode (hot reload) on the port Replit assigns,
and Replit gives you the public URL in the webview panel at the top.

## Notes specific to Replit

- Redis is optional — the app works fine without it (rate limiting just
  runs in-memory instead of shared across instances), so nothing to set up
  there for a single-Repl deployment.
- `STORAGE_PROVIDER=local` writes uploaded files to this Repl's own disk.
  That's fine for trying things out, but Repl disk isn't guaranteed
  durable/persistent-forever storage for a real production deployment —
  for that, set `STORAGE_PROVIDER=s3` and point it at any S3-compatible
  bucket (see `.env.example`).
- First boot works even before `DATABASE_URL` is set (the app deliberately
  degrades gracefully instead of crashing), but almost nothing will
  function correctly until a real database is connected.
