# Running this on Replit — fully self-contained

Everything runs inside the Repl itself: the app **and** a real MySQL
server. No external database account, no separate signups, no
`DATABASE_URL` to hunt down and paste in yourself.

## How to run it

1. Replit → Create Repl → **Import from GitHub** → point it at this
   repository/branch.
2. Click **Run**.

That's it. On the very first run, `scripts/replit-start.sh` (wired up as
the Repl's `run` command in `.replit`) automatically:

1. Generates a random `JWT_SECRET` and a local `DATABASE_URL`, saved to
   `.replit-data/generated.env` so they stay the same on every future run.
2. Initializes a real MySQL data directory under `.replit-data/mysql/`.
3. Starts that MySQL server in the background, inside this same Repl.
4. Creates the `nourix_academy` database and applies every migration.
5. Starts the app itself.

Every later click of **Run** reuses the same data directory and secrets —
your accounts, courses, everything, survive across restarts, exactly like
any other file in the Repl.

## What you get out of the box

- A working public URL immediately (Replit's webview panel).
- Real accounts, real course data, real everything — backed by a real
  MySQL server, not a mock.
- No manual database setup, no connection strings, no external accounts.

## What still needs a manual step (optional, not required to run it)

Some features are opt-in and need their own credentials if you want them —
the app runs fine without any of these, just without that one feature:

| Feature | What to add, in Replit's **Secrets** panel |
|---|---|
| Sign in with Google / auto Google Meet links | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| File storage on S3 instead of local disk | `STORAGE_PROVIDER=s3` + the `S3_*` variables (see `.env.example`) |

## One honest limitation

This self-contained MySQL lives on the Repl's own disk, which is durable
for the normal **Run** button / Workspace flow (data survives restarts).
If you later use Replit's separate **Deployments** feature (a different,
often stateless container), that data directory may not carry over between
deploys — that's a Replit platform detail, not something this app controls.
For that specific case, point `DATABASE_URL` at a real external MySQL
host instead (any MySQL 8+/MariaDB 10.6+ works) — the app supports both
the same way, nothing to change in the code.
