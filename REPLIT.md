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
   - Tries **Layer 1**, then, only if that didn't work, **Layer 2** (both
     described below) to get a real, persistent local MySQL running.
   - Starts the app (`npm run dev` in development, `npm run build && npm
     run start` when `NODE_ENV=production`) — regardless of whether either
     layer succeeded.

Every later **Run** reuses the same data directory and secret — accounts,
courses, everything survives restarts, exactly like any other file in the
Repl. Verified directly for both layers below: registered an account,
killed every process, reran the script from scratch, and the same account
still logged in afterward.

## Two independent ways to get MySQL running

This Repl doesn't rely on a single mechanism for the database — it tries
two, independently, because it's not guaranteed in advance which one a
given Repl environment will actually support.

### Layer 1: Nix-declared `mariadb` (`replit.nix`)

```nix
{ pkgs }: {
  deps = [ pkgs.nodejs_20 pkgs.mariadb pkgs.libaio ];
}
```

If this Repl's environment applies Nix package declarations, this is what
makes `mariadb-install-db` / `mysqld` / `mysqladmin` / `mysql` available on
`PATH`. `scripts/replit-start.sh` resolves each of those four binaries
*independently* with `command -v` rather than assuming they share one
`bin/` directory — real packaging layouts differ (Debian/Ubuntu's `apt`
splits `mysqld` into `/usr/sbin` while `mysqladmin`/`mysql` stay in
`/usr/bin`; Nix keeps everything together) — verified directly against
both layouts.

### Layer 2: a directly-downloaded MySQL binary

If Layer 1 doesn't work (the tools aren't found on `PATH` at all — e.g.
`replit.nix` wasn't picked up by this Repl's environment), the script
falls back to `scripts/replit-fetch-mysql-binary.mjs`. That script uses
the `mysql-memory-server` npm package purely as a way to trigger a real
MySQL binary download straight from MySQL's own CDN over plain HTTPS — no
Nix, no `apt`, no system package manager involved. The downloaded binary
is then copied into this project's own persistent location
(`.replit-data/mysql-binary/`), and driven by the *same*
`scripts/replit-start.sh` logic as Layer 1, with its own persistent
`--datadir` — never an in-memory-only database.

**One honest limitation of Layer 2**: the downloaded MySQL binary itself
still needs the system shared library `libaio` (`libaio1`/`libaio1t64`) to
actually run. This script cannot install that library — it isn't an npm
package, it needs the system's own package manager. `libaio` is declared
in `replit.nix` for Layer 1's benefit, but if Nix isn't applying at all
(the reason Layer 2 is being tried in the first place), that declaration
doesn't help Layer 2 either. If `libaio` is genuinely absent, Layer 2
fails too — honestly, with a clear message in
`.replit-data/mysql-fetch.log`, rather than silently pretending to
succeed.

## If both layers fail for any reason

The script does **not** abort — it prints a clear warning and starts the
app anyway, without `DATABASE_URL`. The app itself (`server/_core/env.ts`)
already treats a missing database as a non-fatal, degraded mode outside
production: the homepage and static UI still load; only the features that
read/write real data won't work until a database is connected. Verified
directly: with every MySQL-providing mechanism unavailable, the app still
started and `GET /` returned `200`.

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

## One more honest limitation (Deployments, not Run)

The local MySQL's data directory is durable for the normal **Run** button
/ Workspace flow. If you later use Replit's separate **Deployments**
feature (a different, often stateless container), that data directory may
not carry over between deploys — a Replit platform detail, not something
this app controls. For that specific case, set `REPLIT_DB_URL_OVERRIDE` to
a real external MySQL host (any MySQL 8+/MariaDB 10.6+ works).
