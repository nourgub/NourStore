# Running this on Replit — fully self-contained

Everything runs inside the Repl itself: the app **and** a real MySQL
server. No external database account, no `corepack`, no separate
sign-ups. Import the repo, click **Run**.

## How it boots (`.replit` → `scripts/replit-start.sh`)

1. `npm install` — plain npm, no corepack. `pnpm` remains the documented
   package manager for local development (see the root `README`/
   `DEPLOYMENT.md`), but the automated Replit path uses npm specifically
   because it needs zero activation step and avoids the two pnpm-specific
   failures Replit's sandbox has been seen to hit: corepack's shim-write
   `EACCES`, and pnpm's stricter per-package registry fetch (which failed
   with a 403 on a since-re-resolved `fast-xml-parser` version — fixed by
   regenerating `pnpm-lock.yaml` too, for anyone still using pnpm locally).
2. `scripts/replit-start.sh` then, in order:
   - Generates a random `JWT_SECRET` on first run, saved to
     `.replit-data/generated.env` so it's stable across restarts.
   - If the `mariadb` tools are available (declared in `replit.nix` — see
     below), initializes a local MySQL data directory under
     `.replit-data/mysql/`, starts it, creates the `nourix_academy`
     database, and applies every migration.
   - Starts the app (`npm run dev` in development, `npm run build && npm
     run start` when `NODE_ENV=production`).

Every later **Run** reuses the same data directory and secret — accounts,
courses, everything survives restarts, exactly like any other file in the
Repl. Verified directly: registered an account, killed every process,
reran the script from scratch, and the same account still logged in
afterward.

## Nix packages (`replit.nix`)

```nix
{ pkgs }: {
  deps = [ pkgs.nodejs_20 pkgs.mariadb ];
}
```

This is what actually makes `mariadb-install-db` / `mysqld` / `mysql` /
`mysqladmin` available in the Repl's shell — declaring a Nix `channel` in
`.replit` alone does not install extra packages on its own.

## If MySQL still isn't available for any reason

`scripts/replit-start.sh` checks for the mariadb binaries with `command -v`
before touching them. If they're missing (e.g. this Repl's environment
didn't pick up `replit.nix` for some reason), the script does **not**
abort — it prints a clear warning and starts the app anyway, without
`DATABASE_URL`. The app itself (`server/_core/env.ts`) already treats a
missing database as a non-fatal, degraded mode outside production: the
homepage and static UI still load; only the features that read/write real
data won't work until a database is connected. Verified directly: with the
mariadb binaries hidden from `PATH`, the app still started and `GET /`
returned `200`.

The same graceful-degradation applies if MySQL fails to *start* (not just
"missing") or if migrations fail for any reason — the script logs a clear
warning and continues to start the app rather than exiting.

## Optional features (not required to run it)

| Feature | What to add, in Replit's **Secrets** panel |
|---|---|
| Sign in with Google / auto Google Meet links | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| File storage on S3 instead of local disk | `STORAGE_PROVIDER=s3` + the `S3_*` variables (see `.env.example`) |
| Point at a real external MySQL instead of the local one | Set a Secret named `REPLIT_DB_URL_OVERRIDE` to that connection string — it always wins over the local database the script starts |

## Ports

The server listens on `process.env.PORT` (which Replit sets and injects
automatically) and falls back to `3000` if it's unset — already correct in
`server/_core/index.ts`, nothing to configure. `.replit`'s `[[ports]]`
maps that internal port to the public URL.

## Tests

`vitest` and the `@testing-library/*` packages are intentionally listed
under `optionalDependencies` in `package.json`, not `dependencies` or
`devDependencies` — some sandboxed environments' security policies block
specific test-tooling packages outright, and `optionalDependencies`
failures don't fail the surrounding `npm install`/`npm ci`. Nothing needed
to *run* the app depends on them. Wherever they *do* install successfully
(a normal dev machine, this sandbox, etc.), `npm test` / `npx vitest run`
works exactly as before.

## One honest limitation

The local MySQL's data directory is durable for the normal **Run** button
/ Workspace flow. If you later use Replit's separate **Deployments**
feature (a different, often stateless container), that data directory may
not carry over between deploys — a Replit platform detail, not something
this app controls. For that specific case, set `REPLIT_DB_URL_OVERRIDE` to
a real external MySQL host (any MySQL 8+/MariaDB 10.6+ works).
