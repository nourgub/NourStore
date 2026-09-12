# Current status

Last verified: see git log for this file's own commit date — this file is
meant to be kept current, unlike everything in `docs/archive/`, which is a
frozen historical record and is never updated after the fact.

## What's verified working right now

- `npm run check` (TypeScript): 0 errors
- `npm run build`: succeeds
- `npm run test:unit` (no `DATABASE_URL` needed): 230 passed, 0 skipped
- `npm run test:db`: 19/19 passed — actually run (not just typechecked)
  against a local MariaDB 10.11 instance with every migration applied; the
  full login → enroll → lesson → quiz → final exam → certificate journey,
  payment-receipt anti-fraud checks, and cross-user isolation all confirmed
  against real SQL, and the suite cleans up every row it creates. See
  README's "Real-database tests" section.
- `server/routers.ts` (was 2500+ lines) and `client/src/pages/flows/
  StaffFlows.tsx` (was 4800+ lines) are now split into per-domain modules
  under `server/routers/` and `client/src/pages/flows/staff/` — both down
  to ~1000 lines or less, verified with a byte-identical production build.
- Security/permissions audit (every `adminProcedure`, ownership isolation
  for courses/units/lessons/quizzes, student/parent/support/notification/
  certificate data isolation, file access, sensitive-field leakage, SQL
  injection, webhook signature verification, rate limiting) found no
  critical or high-severity issues — the codebase already re-derives
  ownership from the session on essentially every access path rather than
  trusting client-supplied IDs.
- Mobile/RTL review: actually ran the app in a real headless browser
  (local Chromium, no external service) at 390/600/768/1280px, in
  Arabic/French/English, logged in as admin/teacher/learner — found and
  fixed real horizontal-overflow bugs (a filter row, and three compounding
  causes across the whole admin/teacher dashboard), plus a completely
  unlocalized 404 page. 0px overflow confirmed on every page/viewport/
  language combination checked afterward.
- Dependency/dead-code cleanup: removed 4 npm packages with zero imports
  anywhere in the repo, an orphaned unrelated-platform debug-collector
  script that was silently served in every build, and 5 of 9 non-test
  `any`-typed casts (replaced with real types, not just deleted).
- The live deployment is currently down: the managed MySQL database (Aiven)
  backing the last deploy was torn down (likely a free-trial expiry) and
  hasn't been replaced. Deliberately deferred by the project owner to a
  later "hosting" stage — see `DEPLOYMENT.md` — while engineering work
  continues on the code itself.

## What's genuinely still open

These are the items with no code fix available — either a business/legal
decision, an external credential only the project owner can obtain, or
deliberately-scoped-out engineering work:

1. **No live payment gateway.** BaridiMob needs a real merchant agreement
   with Algérie Poste; SlickPay needs a sandbox/production public key from
   a free self-serve signup. Manual WhatsApp payment works today with zero
   setup — see `DEPLOYMENT.md`.
2. **No lawyer review** of the privacy policy / terms of service text.
3. **No live database.** The previous managed MySQL (Aiven) instance is
   gone; a replacement (managed provider or the self-hosted
   `docker-compose.yml` stack) needs a real account/server the project
   owner controls.
4. **Performance**: re-measured 2026-09-12 with Lighthouse (desktop preset)
   against an actual production build (`npm run build && npm start`), not
   estimated. Found and fixed one real, measurable issue: the Google Fonts
   `<link rel="stylesheet">` in `client/index.html` was render-blocking —
   `display=swap` only makes the *font files* non-blocking, the stylesheet
   *request itself* still was. Score went from **0.55 → 0.98** (FCP/LCP/SI
   all ~12.9s → ~0.8-1.0s) after switching it to the standard
   `media="print" + onload` async-stylesheet pattern (with a `<noscript>`
   fallback), verified with a before/after Lighthouse run plus a direct
   check that the fonts still actually apply and no console errors appear.
   Route-level code splitting, hashed-filename immutable caching, and React
   Query's staleTime remain solid on inspection. Bundle sizes are unchanged
   by this fix and match what's tracked in `docs/verification-history.md`
   (main JS ~451KB raw / ~139KB gzip — mostly React/ReactDOM/query/trpc/the
   eagerly-loaded landing page, everything else already route-split).
   `recharts` is a listed dependency but not actually present in any built
   chunk — its only consumer, `client/src/components/ui/chart.tsx`, is
   itself unused by any page (see the dependency-audit phase for removal).
   The earlier "~66/100" figure here could not be reconciled to a specific
   documented methodology/date, so it's superseded by today's number rather
   than assumed comparable — see `docs/verification-history.md` for the
   full before/after and how it was measured. Historical context:
   `docs/archive/PHASE_VISUAL_AUDIT.md`.
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
