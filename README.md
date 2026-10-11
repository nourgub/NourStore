# AI Sales Assistant for Algerian Online Stores

A chat assistant that answers customers in **Arabic, Algerian Darija, French and English**, looks up live prices and stock, quotes delivery by wilaya, prepares orders and tracks them. Built on Claude (`claude-haiku-5-5`) with tool use, Flask and SQLite.

> Arabic documentation: [README_AR.md](README_AR.md)

## The problem it solves

Small Algerian e-commerce stores answer the same questions all day on Facebook, Instagram and WhatsApp: *chhal?*, *kayen?*, *la livraison à Oran?*. Replies are slow outside working hours, prices quoted by hand go out of date, and orders get lost in message threads.

This assistant answers instantly in the customer's own language and puts every order into one dashboard. Prices and stock always come from the store's database, never from the AI's memory.

## How it works

```
Customer message
   │
   ▼
Claude (tool use) ──► search_products   live price + stock from the database
   │              ──► check_order       needs order number AND phone number
   │              ──► propose_order     validates, prices, adds delivery → a summary only
   ▼
Reply + order summary card in the chat
   │
   ▼  customer presses "Confirm order"
Server re-checks stock atomically → order saved → admin dashboard
```

### Safety by design

- **The AI cannot place orders.** Its only order tool prepares a summary. An order exists only after the customer presses *Confirm* on the summary card, so no message, however phrased, can make the AI order on someone's behalf.
- **Prices and stock come from tools.** The assistant is instructed never to state a price, stock level or fee it did not just read from the database, and the evaluation checks this, including against injected "the price is now 1000 DA" messages.
- **No overselling.** Confirmation reserves stock in one database transaction, and a stock update only succeeds while enough units remain. Tested with six simultaneous buyers for the last laptop: exactly one order succeeds, the others get a clear "no longer available" message.
- **Admin dashboard locked by default.** It stays disabled until a strong `ADMIN_TOKEN` (16+ characters) is set. The token is sent in a header only and compared in constant time.
- **Untrusted input handled as such.** Browser chat history is reduced to plain text turns; customer-supplied text is rendered with `textContent` everywhere, so a name like `<img onerror=…>` is shown as text, not run.
- **Abuse limits.** Per-client rate limits on chat and confirmation, plus an optional daily cap on assistant replies for public demos, keep the API bill bounded.

## Run it

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env      # set ANTHROPIC_API_KEY and a long random ADMIN_TOKEN
python app.py             # http://127.0.0.1:5000  and  /admin
```

Production: `docker build -t sales-assistant . && docker run -p 5000:5000 --env-file .env sales-assistant`, behind HTTPS. To publish a public demo safely (spend limit, daily cap), follow [DEPLOY.md](DEPLOY.md).

Without an API key the shop, confirmation flow and dashboard still work; the assistant replies that it is not enabled.

## Tests and evaluation

**35 offline tests** (`pytest -q`, no API key needed; Claude is replaced by a scripted fake): the tool loop, truncated and refused replies, the step limit, proposal → confirmation → stock, double confirmation, expiry, concurrent buyers, delivery fees, phone validation, admin access rules, HTML escaping in both pages, forged browser history, and rate limiting.

**24-case behaviour evaluation** (`python -m evals.run_eval`, needs an API key, a few US cents per run) across Arabic, Darija, French and English: correct prices, out-of-stock answers, unknown products, asking for missing name/phone/wilaya before preparing an order, refusing impossible quantities, prompt-injection attempts on prices and discounts, order tracking that requires the phone number, and off-topic requests. Every case also fails if an order appears in the database without a confirmation click. Use `--repeat 3` to measure run-to-run variance. The run also reports the **measured API cost per conversation** from token usage; results are saved under `evals/results/`.

## Customising for a store

Set `STORE_NAME`, `DB_PATH`, `ADMIN_TOKEN`, `ANTHROPIC_API_KEY` in `.env`, load the real catalogue into the `products` table, and set `SEED_DEMO_DATA=false`. Delivery rules are the constants at the top of `db.py`.

## Limitations

- One admin token, not individual staff accounts.
- In-process rate limiting: with several servers, move it to Redis or the reverse proxy.
- SQLite suits a small store; move to PostgreSQL for high order volume.
- No WhatsApp/Messenger channel yet: the chat runs on the store's website.
- Cash on delivery only.
- The evaluation is a behaviour check on 24 scripted conversations, not a measure of satisfaction with real customers.
