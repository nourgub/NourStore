# Running, deploying, backing up

Nothing in this repository deploys itself, buys a service, or touches a
production database. Every step below is run by the owner.

## Run locally

```bash
nvm use                      # Node 22.22.2 (.nvmrc)
npm ci
cp .env.example .env         # fill in; secrets go in the host's secret store, never in git
docker compose up -d mysql redis
node scripts/migrate.mjs     # applies drizzle/*.sql in order (0000 … 0041)
npm run dev                  # http://localhost:3000 (Vite dev server: development only)
```

Production never runs the Vite dev server: `npm run build` then
`NODE_ENV=production node dist/index.js` (what the Docker image does).

## Deploy (one server, Docker)

1. On the server: `cp .env.example .env`, set `JWT_SECRET` (32+ random
   characters), `MYSQL_*`, `REDIS_PASSWORD`, `APP_BASE_URL=https://your-domain`.
2. `docker compose up -d --build` — the app container migrates the database,
   then starts.
3. HTTPS in front (the app speaks HTTP on port 3000). With Caddy, which gets
   and renews the certificate itself:

   ```
   your-domain {
       reverse_proxy 127.0.0.1:3000
   }
   ```

   With nginx, terminate TLS (e.g. certbot) and pass
   `X-Forwarded-Proto` and `X-Forwarded-Host`; the session cookie becomes
   `Secure` only when the request arrived over HTTPS.
4. Check `https://your-domain/api/health` → `{"status":"ok","database":"connected"}`.

Replit: see `REPLIT.md`; secrets go in **Secrets**, never in a file.

## Several instances

- **Redis** (`REDIS_URL`): rate limits shared by all instances; without it
  each instance counts on its own.
- **Files** (`STORAGE_PROVIDER=s3` and its keys): receipts, exercise photos and
  the voice cache must live in shared storage; the local `uploads/` folder is
  fine for one server only.
- **Reminders** run hourly on every instance; a unique key per reminder
  (migration 0038) lets one copy in, and a deadlock between instances is
  retried. `TAFAWOQ_REMINDERS=0` turns them off on an instance.
- **Database**: one MySQL for all instances.

## Backups

```bash
openssl rand -base64 48 > /secure/elsewhere/tafawoq-backup.key   # once; keep it OFF this server too
chmod 600 /secure/elsewhere/tafawoq-backup.key
BACKUP_KEY_FILE=/secure/elsewhere/tafawoq-backup.key ./scripts/backup-database.sh /var/backups/tafawoq
```

Nightly with cron:
`0 3 * * * cd /srv/tafawoq && BACKUP_KEY_FILE=/secure/tafawoq-backup.key ./scripts/backup-database.sh /var/backups/tafawoq >> /var/backups/tafawoq/backup.log 2>&1`

- Files are AES-256 encrypted (`.sql.gz.enc`) and `chmod 600`. Without
  `BACKUP_KEY_FILE` they are plain and the script says so.
- A key stored next to its backups protects nothing. Lose the key and the
  backups cannot be read.
- Retention (how many days, how many copies, where off-site) is the owner's
  decision; write it on the legal pages (Admin → Settings → data retention).
- Uploaded files (`uploads/` or the S3 bucket) are not in the database
  dump: back them up too.

## Restore drill (do it before launch, then regularly)

On an isolated database — never production:

```bash
SOURCE_URL=mysql://user:pass@host:3306/tafawoq_copy \
DRILL_URL=mysql://user:pass@host:3306/tafawoq_restore_drill \
BACKUP_KEY_FILE=/secure/elsewhere/tafawoq-backup.key ./scripts/backup-drill.sh
```

It dumps, encrypts, decrypts, restores into the drill database (its name
must contain `drill`) and compares the row count of every table. Run in
development on 2026-10-23: 74 tables, 15,106 rows restored identically. That
proves the procedure, not that production backups exist.

A real restore: `./scripts/restore-database.sh backup.sql.gz.enc` (asks
you to type the database name), then `node scripts/migrate.mjs`.

## Monitoring

- `/api/health` for the uptime monitor (checks the database).
- Admin → Overview → "before launch": what is still missing.
- Admin → usage: AI calls, emails, bookings per day (numbers only).
- Server logs carry no passwords, tokens or message contents; keep them
  private anyway (they hold user ids and IP addresses).

## Rollback of a release

Every migration adds and never drops; each file states its rollback SQL in
its header. To roll back code: deploy the previous image; the newer columns
and tables are ignored by older code. Undo a migration only after a backup,
with the SQL in its header.
