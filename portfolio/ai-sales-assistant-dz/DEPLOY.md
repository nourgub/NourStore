# Deployment

The app ships as a Docker image and runs on any container host (Render, Railway, Fly.io, a VPS with Docker).

## 1. Protect the API budget

1. In the Anthropic Console, set a **monthly spend limit** on the key used here (e.g. $5 for a demo).
2. For a public demo, set `DAILY_CHAT_LIMIT` (e.g. `300`): after that many assistant replies in a day the demo pauses until the next UTC day.

## 2. Environment variables

All variables are listed with comments in [`.env.example`](.env.example). The essential ones:

| Variable | Production value |
|---|---|
| `ANTHROPIC_API_KEY` | your key (host secret, never in Git) |
| `DB_PATH` | `/data/store.db` (image default) on a **persistent volume** |
| `SESSION_COOKIE_SECURE` | `true` |
| `ENABLE_HSTS` | `true` once HTTPS works |
| `DEMO_MODE` | `false` (leave `ADMIN_TOKEN` empty) |
| `TRUSTED_PROXY_COUNT` | `1` behind one reverse proxy/load balancer, `0` if clients connect directly |
| `REDIS_URL` | required as soon as `WEB_CONCURRENCY` > 1 or more than one container runs |
| `SEED_DEMO_DATA` | `false` with a real catalogue |
| `METRICS_TOKEN` | a random value if you scrape `/metrics`, otherwise empty |

## 3. Persistent storage

SQLite keeps `store.db` plus `store.db-wal` and `store.db-shm` in `/data`. Mount a persistent volume there; without it, orders disappear on every redeploy. Use one container per volume: SQLite is not shared across machines.

## 4. Build, migrate, create the first admin

```bash
docker build -t sales-assistant .
docker volume create store-data
docker run --rm --env-file .env -v store-data:/data sales-assistant flask --app app migrate
docker run --rm -it --env-file .env -v store-data:/data sales-assistant \
  flask --app app create-user --username owner --role admin      # prompts for a 12+ character password
docker run -d --name store --env-file .env -v store-data:/data -p 127.0.0.1:5000:5000 sales-assistant
```

Migrations also run automatically at start-up and are safe when several workers start together.

## 5. HTTPS and reverse proxy

Publish the container on `127.0.0.1` only and put a TLS proxy in front. Nginx example:

```nginx
server {
    listen 443 ssl http2;
    server_name shop.example.dz;
    # ssl_certificate / ssl_certificate_key (e.g. from Let's Encrypt)
    client_max_body_size 64k;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;   # overwrite, don't append client-supplied values
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }
}
```

Then set `TRUSTED_PROXY_COUNT=1` and `ENABLE_HSTS=true`. Managed hosts (Render, Railway, Fly) terminate TLS for you and add one proxy hop.

## 6. Workers and Redis

- `WEB_CONCURRENCY=1` (default) with 8 threads handles a small store; rate limits and the daily cap are exact.
- Raise `WEB_CONCURRENCY` or run several containers **only with `REDIS_URL`** set, so all workers share the same counters. Without Redis the app logs a warning and each worker counts separately.
- Example: `docker run -d --name redis redis:7-alpine` and `REDIS_URL=redis://redis:6379/0` on the same Docker network.

## 7. Health checks and monitoring

- `GET /health`: liveness (used by the Docker `HEALTHCHECK`).
- `GET /ready`: readiness, checks the database; point the load balancer here.
- `GET /metrics` with `Authorization: Bearer $METRICS_TOKEN`: request, error, tool-call and token counters (JSON).
- Logs are JSON lines on stdout with a `request_id` matching the `X-Request-ID` response header.

## 8. Backups, restore and retention

```bash
# Daily backup, keep 14 (safe while running)
docker exec store python scripts/backup.py --db /data/store.db --out /data/backups --keep 14
# Daily retention policy
docker exec store flask --app app purge-data
# Restore: stop the app first
docker stop store
docker run --rm -v store-data:/data sales-assistant python scripts/restore.py /data/backups/store-YYYYmmdd-HHMMSS.db --db /data/store.db
docker start store
```

Copy backups off the server regularly (they contain customer names and phone numbers until anonymised).

## 9. Graceful shutdown

The container stops on `SIGTERM`; gunicorn finishes in-flight requests for up to 30 seconds. Give the platform at least that stop timeout.

## 10. Checklist before sharing the link

- `DEMO_MODE=false`, `SESSION_COOKIE_SECURE=true`, HTTPS working, `ENABLE_HSTS=true`.
- First admin created; log in at `/admin`, create staff accounts there.
- Try a full Darija conversation ending with "Confirm order" and see it in the dashboard.
- `python -m evals.run_eval` locally; note the pass rate and measured cost.
- Backups and `purge-data` scheduled.
