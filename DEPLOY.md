# Put the demo online

The app ships as a Docker image, so it runs on any host that runs containers (Render, Railway, Fly.io, a VPS…).

## 1. Protect your API budget first

1. In the Anthropic Console, set a **monthly spend limit** on the API key you will use (for example $5).
2. Set `DAILY_CHAT_LIMIT` (for example `300`): after that many assistant replies in a day, the demo politely stops until the next day.

## 2. Environment variables

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your key |
| `ADMIN_TOKEN` | 16+ random characters, e.g. from `python -c "import secrets; print(secrets.token_urlsafe(24))"` |
| `STORE_NAME` | the demo store's name |
| `DAILY_CHAT_LIMIT` | e.g. `300` |
| `CHAT_LIMIT_PER_10_MIN` | e.g. `20` per visitor |
| `DB_PATH` | `/data/store.db` (already the image default) |

Mount a persistent disk at `/data` if you want orders to survive restarts. For a public demo, starting from fresh demo data on each restart is fine.

## 3. Run

Locally:

```bash
docker build -t sales-assistant .
docker run -p 5000:5000 --env-file .env sales-assistant
```

On a host: create a web service from this repository using the Dockerfile, add the variables above, and deploy. The service listens on `$PORT` when the host provides it.

## 4. Before sharing the link

- Open `/` and try a full conversation in Darija ending with "Confirm order".
- Open `/admin`, enter your `ADMIN_TOKEN`, and check that the order arrived.
- Run `python -m evals.run_eval` locally and put the pass rate and measured cost in your portfolio.
