# AI Sales Assistant for Algerian Online Stores

A chat assistant that answers customers in **Arabic, Algerian Darija, French and English**, looks up live prices and stock, quotes delivery by wilaya, prepares orders and tracks them, plus a staff dashboard for orders, products and accounts. Built on Claude (`claude-haiku-5-5`) with tool use, Flask and SQLite.

> Arabic documentation: [README_AR.md](README_AR.md) · Deployment: [DEPLOY.md](DEPLOY.md)

## How an order happens

```
Customer message ─► Claude (tool use) ─► search_products   live price + stock
                                       ├► check_order       order number AND phone; no personal data returned
                                       └► propose_order     server validates, prices, adds the wilaya's fee → summary only
Summary card ─► customer presses "Confirm" ─► "Are you sure?" ─► server re-checks stock in one transaction ─► order
```

The AI has **no tool that creates or confirms orders**. Tool names and inputs are validated on the server; prices, totals and fees sent by the model or the browser are ignored and recomputed from the database.

## Security and data protection

| Area | What the app does |
|---|---|
| Orders | Created only by the customer's confirmation click; stock reserved atomically (6 simultaneous buyers of the last unit → 1 order). |
| Staff access | Individual accounts, Werkzeug password hashing, server-side sessions (hashed tokens, HttpOnly + SameSite=Strict + Secure cookie, 8 h), logout revokes, CSRF token on every change, login limited per IP and per account. |
| Roles | `admin`: users, products, stock, orders. `staff`: view orders and change status. Enforced on the server. |
| Legacy token | `ADMIN_TOKEN` header only with `DEMO_MODE=true`; never for production. |
| Browser | CSP without inline scripts, `nosniff`, `X-Frame-Options: DENY`, referrer and permissions policies, HSTS when `ENABLE_HSTS=true`, `no-store` on API responses. All user data rendered with `textContent`. |
| CORS | Closed unless `CORS_ORIGINS` lists an origin; never on admin endpoints. |
| Abuse | Separate limits for chat, confirmation, order lookup, login and admin; Redis-backed with `REDIS_URL`, per-process fallback with a logged warning; trusted-proxy setting; 32 KB body cap; strict JSON validation; optional daily cap for demos. |
| Logs | JSON with request ID, endpoint, status, duration, tool-call counts, tokens and estimated cost. Phone numbers masked (`05******56`), API keys and tokens removed, no chat text. Stack traces only in server logs. |

## Personal data collected

| Data | Why | Kept |
|---|---|---|
| Chat messages | Sent to Anthropic to generate the reply | Not stored by the app |
| Name, phone, wilaya | Prepare, deliver and follow up an order | Unconfirmed summaries: `PROPOSAL_RETENTION_HOURS` (24 h). Delivered/cancelled orders: name and phone erased after `ORDER_RETENTION_DAYS` (365) by `flask --app app purge-data` |
| Products, quantities, totals | The order record and accounting | Kept (no personal data after anonymisation) |
| IP address | Rate limiting | In memory/Redis counters only, minutes to a day |

Customers see this at `/privacy` (Arabic and French).

## Run locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env               # set ANTHROPIC_API_KEY; SESSION_COOKIE_SECURE=false for http://127.0.0.1
flask --app app migrate            # create/upgrade the database (also runs at start-up)
flask --app app create-user --username you --role admin   # asks for a 12+ character password
python app.py                      # http://127.0.0.1:5000 , staff dashboard at /admin
```

Without an API key the shop, confirmation flow, order lookup and dashboard still work; the assistant replies that it is not enabled.

### Management commands

| Command | Purpose |
|---|---|
| `flask --app app migrate` | Apply pending migrations (`schema_migrations` table). Safe on old databases and when several workers start at once. |
| `flask --app app create-user --username NAME --role admin\|staff` | Create an account (`STAFF_PASSWORD` env var or interactive prompt). |
| `flask --app app purge-data` | Apply the retention policy (run daily, e.g. from cron). |
| `python scripts/backup.py --keep 14` | Consistent online backup with integrity check and rotation. |
| `python scripts/restore.py backups/store-….db` | Restore (stop the app first); the replaced database is kept. |

## Tests and evaluation

```bash
python -m pytest -q        # 212 offline tests, no API key needed (Claude is replaced by a scripted fake)
python -m compileall -q .
python -m evals.run_eval   # needs ANTHROPIC_API_KEY; a few US cents per run
```

The offline suite covers the tool loop and stop reasons, prompt-injection attempts (made-up order tools, fake prices, discounts and free delivery), tool-input validation, proposal → confirmation → stock including concurrency, wilayas/aliases/fees, duplicate lines, login/logout/expiry/brute force, roles and CSRF, product admin with audit log, security headers, CORS, body limits, Redis fallback, migrations on empty and original-version databases, retention, backups, log redaction, health/readiness/metrics and XSS-safe rendering.

The behaviour evaluation runs the **24 conversations** in `evals/cases.json` (Arabic, Darija, French, English) against the real model, checks which tools were called and what was answered, fails any case where an order appears without a confirmation click, and prints the measured cost per conversation.

## Project layout

| File | Role |
|---|---|
| `app.py` | Flask app, public endpoints, pages, CLI commands |
| `admin_api.py` | Staff login and admin API with role checks |
| `agent.py` | Claude tool loop and server-side tool validation |
| `db.py`, `migrations.py` | Storage layer (all SQL) and migrations |
| `wilayas.py` | 58 wilayas, aliases, demo delivery fees |
| `auth.py` | Accounts, password hashing, sessions |
| `ratelimit.py`, `web.py`, `security.py`, `observability.py`, `config.py` | Limits, request helpers, headers/CORS, logging/metrics, settings |

## Demo vs production

| | Demo | Production |
|---|---|---|
| Admin access | `DEMO_MODE=true` + strong `ADMIN_TOKEN` allowed | Staff accounts only, `DEMO_MODE=false` |
| Cookies | `SESSION_COOKIE_SECURE=false` on plain http locally | `true`, behind HTTPS, `ENABLE_HSTS=true` |
| Budget | `DAILY_CHAT_LIMIT` (e.g. 300) + Console spend limit | Console spend limit, alerts on `/metrics` |
| Workers | 1 | 1, or more with `REDIS_URL` |
| Data | `SEED_DEMO_DATA=true` | Real catalogue, `SEED_DEMO_DATA=false`, daily `purge-data` and backups |

## Limitations

- SQLite suits a single-server store. The SQL is confined to `db.py` and `migrations.py` to ease a PostgreSQL move, but that port is not done.
- Delivery fees seeded per wilaya are demo values (600 Algiers, 1200 far south, 900 elsewhere); set real carrier prices in the `wilayas` table.
- Website chat only (no WhatsApp/Messenger yet); cash on delivery only.
- The 24-case evaluation checks behaviour on scripted conversations; it is not a measure of real customer satisfaction, and it has not been run yet because it needs an API key.
