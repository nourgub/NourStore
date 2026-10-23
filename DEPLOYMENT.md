# Deploying Tafawoq

Node **22.22.2** everywhere (`.nvmrc`, `package.json` "engines", the
Dockerfile's `node:22.22.2-slim`).

Three ways to run it, from simplest to most controlled. Whatever the host,
keep secrets (database URL, `JWT_SECRET`, API keys) in the host's secrets
panel — never in a committed file.

## 1. Replit

Click **Run**: the app and a local MySQL start inside the Repl — see
`REPLIT.md`. For **Deployments** (a separate, stateless container), point
the app at an external MySQL with a Secret named `REPLIT_DB_URL_OVERRIDE`,
otherwise data may not survive a redeploy.

## 2. Docker (any VPS)

```bash
cp .env.example .env      # replace EVERY change_me value
docker compose up -d      # MySQL + Redis + the app
```

- **Required secrets**: compose refuses to start without `JWT_SECRET`,
  `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` and `REDIS_PASSWORD`, and the
  server refuses the `.env.example` placeholders when `NODE_ENV=production`.
- **Network**: only the app (`APP_PORT`, default 3000) is reachable from
  outside. MySQL and Redis are published on `127.0.0.1` only (Docker's
  published ports bypass firewalls like ufw); Redis requires its password.
  Put a reverse proxy with HTTPS (Caddy, nginx) in front of port 3000.
- **Migrations** run on every start (`node scripts/migrate.mjs`, tracked in a
  `_migrations` table), so `docker compose up` is always safe.
- **Data** lives in Docker volumes that survive restarts and
  `docker compose down` (only `down -v` erases them). The volume names
  (`nourix_*`) predate the rename to Tafawoq and are kept on purpose:
  renaming them would start an existing deployment on an empty database. A
  deployment created before the rename must keep `MYSQL_DATABASE=nourix_academy`
  and `MYSQL_USER=nourix` in its `.env`. See `docs/LEGACY.md`.
- **Teacher voices**: on first start the container downloads the free Piper
  voices in the background into `TAFAWOQ_PIPER_DIR` (`/app/uploads/piper`,
  in the uploads volume; log in `/tmp/piper-fetch.log`). Until they are
  there, the browser's own voice is used. Generated speech is cached in
  `/app/uploads/tts-cache`.

## 3. Railway (or any host that builds a Dockerfile)

1. **New Project → Deploy from GitHub repo**; the `Dockerfile` is used as is.
2. **+ New → Database → MySQL**, then set on the app service
   `DATABASE_URL=mysql://${{MySQL.MYSQLUSER}}:${{MySQL.MYSQLPASSWORD}}@${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}`.
3. Set at least `JWT_SECRET` (`openssl rand -hex 32`), `NODE_ENV=production`,
   `AUTH_PROVIDER=email` (or the Google variables below) and `OWNER_OPEN_ID`.
4. Railway sets `PORT`; generate a public domain under **Settings → Networking**.
5. The disk is not persistent between deploys unless you attach a volume on
   `/app/uploads`, or use `STORAGE_PROVIDER=s3` (students' exercise photos
   and the recorded voices are stored there).

## The first admin

1. Register normally at `/register`.
2. Set `OWNER_OPEN_ID` to that account's `openId` — for an email account it
   is `email_<lowercased address>` (e.g. `email_owner@example.com`) — and
   restart.
3. Sign in again: the account becomes `admin`. Every other role (teachers,
   more admins) is then granted from **Tafawoq → Admin → الحسابات**.

Without this step no account can open the admin panel.

## Environment variables

`.env.example` documents every variable. The essentials:

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | everything (MySQL 8+ / MariaDB 10.6+) |
| `TAFAWOQ_DATABASE_URL` | the same, and wins over `DATABASE_URL`: use it where `DATABASE_URL` belongs to another service (e.g. Replit's managed PostgreSQL). A non-`mysql://` address stops the server at start-up and is refused by `npm run migrate` |
| `JWT_SECRET` | signing session cookies — at least 16 random characters |
| `OWNER_OPEN_ID` | the first admin (above) |
| `APP_BASE_URL` | **required in production**: the public address used in password-reset links |
| `SMTP_URL`, `MAIL_FROM` | sending password-reset links (any SMTP provider); without them admins reset passwords by hand |
| `TAFAWOQ_MEETING_BASE_URL` | video room host for live sessions (default `https://meet.jit.si`) |
| `TAFAWOQ_AI_DAILY_CALLS` | daily ceiling on AI calls (default 500), only with `ANTHROPIC_API_KEY` |
| `AUTH_PROVIDER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional Google sign-in; email/password always works |
| `STORAGE_PROVIDER=s3` + `S3_*` | files on S3/R2/B2 instead of local disk |
| `REDIS_URL` | rate limits shared across several app instances |
| `ANTHROPIC_API_KEY` | optional Claude-written content for the AI teacher |
| `TAFAWOQ_TASSILI_URL`, `TAFAWOQ_TASSILI_TOKEN` | optional Algerian Dardja voice from the TassiliTTS service (`services/tassili-tts`, licence to check first) |
| `AZURE_SPEECH_*`, `GOOGLE_TTS_API_KEY`, `TAFAWOQ_*` | optional voices and teacher settings |
| `DATABASE_CA_CERT` | a managed MySQL that requires TLS with its own CA |

### Google sign-in (optional)

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials)
create an OAuth 2.0 client ("Web application"), add
`https://your-domain/api/auth/google/callback` as an authorised redirect URI,
and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Until both are set,
`/api/auth/google/login` answers `501` and the email/password forms are used.

### S3-compatible storage (optional)

Works with AWS S3, Cloudflare R2, Backblaze B2, MinIO: set
`STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION` (`auto` for R2),
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (empty for AWS) and,
for a public bucket, `S3_PUBLIC_BASE_URL`. A missing value fails at startup
with a clear message.

## Health check

`GET /api/health` runs `SELECT 1` against the database: `200` when connected,
`503` otherwise — use it for uptime monitoring.

## Backups

```bash
./scripts/backup-database.sh                          # compressed, timestamped dump in ./backups/
./scripts/restore-database.sh backups/tafawoq-backup-20261011-030000.sql.gz   # destructive, asks to confirm
```

Both read `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` from `.env`.
Automate the backup with cron, e.g. nightly at 3am:

```
0 3 * * * cd /path/to/tafawoq && ./scripts/backup-database.sh >> backups/backup.log 2>&1
```

Test a restore against a separate database from time to time — a backup
nobody has restored is not yet a backup.

## Mobile app

The site is an installable PWA (`client/public/manifest.webmanifest`,
`sw.js`): Android/Chrome offers "Add to Home Screen"; on iOS, Safari's
"Add to Home Screen" uses the `apple-touch-icon`. `capacitor.config.json`
(app id `com.tafawoq.app`) is ready for a native wrapper, but no native
project is generated in this repository.
