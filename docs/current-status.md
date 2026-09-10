# Current status

Last verified: see git log for this file's own commit date — this file is
meant to be kept current, unlike everything in `docs/archive/`, which is a
frozen historical record and is never updated after the fact.

## What's verified working right now

- `npm run check` (TypeScript): 0 errors
- `npm run build`: succeeds
- `npm test` (no `DATABASE_URL`): 230 passed, 19 skipped honestly (the
  real-database suites — see README's "Real-database tests" section)
- Deployed and reachable at a real host with a real managed MySQL database
  as of this project's most recent successful deploy — see `DEPLOYMENT.md`
  for the current hosting setup

## What's genuinely still open

These are the items with no code fix available — either a business/legal
decision, an external credential only the project owner can obtain, or
deliberately-scoped-out engineering work:

1. **No live payment gateway.** BaridiMob needs a real merchant agreement
   with Algérie Poste; SlickPay needs a sandbox/production public key from
   a free self-serve signup. Manual WhatsApp payment works today with zero
   setup — see `DEPLOYMENT.md`.
2. **No lawyer review** of the privacy policy / terms of service text.
3. **`server/routers.ts` (2500+ lines) and `client/src/pages/flows/
   StaffFlows.tsx` (4800+ lines)** are large, single files — working and
   fully tested, but not split into per-domain modules. Deliberately
   deferred: real, larger, riskier engineering work than a drive-by change.
4. **Performance**: Lighthouse ~66/100 (accessibility is 100/100). The
   main lever is deeper code-splitting of the shared vendor JS bundle — see
   `docs/archive/PHASE_VISUAL_AUDIT.md` for why this wasn't attempted
   alongside other work.
5. **No real Web Push notifications, no external cron trigger wired up
   yet** — both have real, working code paths (`/api/scheduled/*`
   endpoints, in-app notifications) that need an external scheduler or a
   push subscription flow respectively to run unattended.

## Where to look for more

- `README.md` — setup, commands, project structure, tech stack
- `DEPLOYMENT.md` — hosting, environment variables, payment provider setup
- `PRELAUNCH_CHECKLIST.md` — the checklist actively tracked before any
  "ready for real users" claim
- `docs/archive/` — historical engineering logs (AUDIT.md, PHASE*_STATUS.md,
  etc.) documenting what was done and how it was verified, kept for the
  record but not required reading to work on the code today
