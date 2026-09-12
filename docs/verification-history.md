# Verification history

A running, append-only log of what was actually run, when, and against what
environment — distinct from `docs/current-status.md` (a current snapshot)
and `docs/archive/` (frozen historical narrative). Every row here reflects a
command that was actually executed, not a claim taken on faith. New rows go
at the top of each table.

## Core checks

| Check | Command | Environment | Result | Last verified |
|---|---|---|---|---|
| TypeScript | `pnpm run check` | sandbox, no DATABASE_URL | 0 errors | 2026-09-12 |
| Production build | `pnpm run build` | sandbox, no DATABASE_URL | succeeds; `index-*.js` 451.23 kB raw / 139.42 kB gzip (unchanged) | 2026-09-12 |
| Unit tests | `pnpm run test:unit` | sandbox, no DATABASE_URL | 230/230 passed, 32/32 files | 2026-09-12 |
| TypeScript | `pnpm run check` | sandbox, no DATABASE_URL | 0 errors | 2026-09-10 |
| Production build | `pnpm run build` | sandbox, no DATABASE_URL | succeeds; `index-*.js` 451.23 kB raw / 139.42 kB gzip | 2026-09-10 |
| Unit tests | `pnpm run test:unit` | sandbox, no DATABASE_URL | 230/230 passed, 32/32 files | 2026-09-10 |

## Real-database tests

| Check | Command | Environment | Result | Last verified |
|---|---|---|---|---|
| `test:db` (single run) | `pnpm run test:db` | local MariaDB 10.11 (fresh datadir after a container restart, all 25 migrations re-applied) | 19/19 passed | 2026-09-12 |
| `test:db`, repeated | `pnpm run test:db:repeat 5` | local MariaDB 10.11, all 25 migrations applied | 5/5 runs passed, 19/19 tests each run | 2026-09-10 |
| Full suite with `DATABASE_URL` set | `vitest run` | same local MariaDB | 8 consecutive runs, all 246 passed / 3 self-skipped, 0 failures | 2026-09-10 |
| `feature.contracts.test.ts` + `realDb.e2e.test.ts` run together | `vitest run server/feature.contracts.test.ts server/realDb.e2e.test.ts` | same local MariaDB | 6 consecutive runs, all 22/22 passed | 2026-09-10 |

**Context for the two targeted rows above**: `PRELAUNCH_CHECKLIST.md`
(dated 2026-09-01) documents an earlier, *intermittent* failure in
`feature.contracts.test.ts` when the full suite ran in parallel against a
real `DATABASE_URL` — sometimes 3 tests failed, sometimes none, attributed
at the time to a cross-file race condition. That file fully mocks the `./db`
module via `vi.mock(...)`, and Vitest isolates each test file's module
registry by default (`test.isolate: true`, the default, untouched in
`vitest.config.ts`), so the mock should never observe real database state
either way. 14 consecutive runs today (8 full-suite + 6 targeted) reproduced
nothing. This does not prove the original report was wrong — a timing-
dependent race that needed a different Vitest version, worker count, or
machine load to manifest can't be ruled out from a clean run today — but it
is the honest result of a real, repeated, deliberate attempt to reproduce
it, not an assumption that it's fixed. No config change was made, since
none of the runs here gave a reason to. If it resurfaces, the two prime
suspects to check first: (1) whether `test.isolate` is ever disabled later,
and (2) whether `feature.contracts.test.ts`'s `vi.mock("./db", ...)` spread
of `...actual` lets an unmocked `./db` export reach a real connection.

## Security / permissions audit

| Check | Method | Environment | Result | Last verified |
|---|---|---|---|---|
| Ownership/isolation audit across 12 categories (admin procedures, course/unit/lesson ownership, student/parent isolation, support/notification/certificate isolation, file access, sensitive-field leakage, Zod coverage, SQL injection, webhook signature verification, rate limiting) | Manual code review (see `docs/archive/` for the full report) | static analysis, no live DB needed | No critical/high findings; one functional (non-security) bug found and fixed (`getManagedLearnerCount` returning null for teacher/institution) | 2026-09-10 |

## Mobile / RTL browser review

| Check | Method | Environment | Result | Last verified |
|---|---|---|---|---|
| Full rerunnable smoke test (`scripts/browser-smoke-test.ts`) — ~14 page kinds × 4 viewports (390/412/768/1280px) × 3 languages (AR/FR/EN) × anonymous/learner/teacher/admin; checks horizontal overflow, console errors, failed/5xx requests, and that gated pages never leak content to an anonymous visitor | Playwright + local Chromium, against an actual **production build** (`node dist/index.js`), real login for each role, against local MariaDB | run against production build, not dev server | **204/204 checks passed, 0 failures** — run as two separate invocations (`SMOKE_TEST_ROLES=learner,teacher` then `SMOKE_TEST_ROLES=admin`) because this sandbox's Node process reproducibly freezes outright after ~40 minutes of sustained Chromium work in one process (confirmed with a 10s heartbeat log that itself stops ticking during the freeze — not one stuck operation, the whole event loop). Along the way this run found and fixed 3 real bugs: an anonymous-visitor login-gate button overflowing horizontally in French on `/dashboard` at 390×844, and a curriculum-builder action row (Move up/down/Edit/Delete) overflowing at 768×1024 in French and English on `/teacher` — both were `whitespace-nowrap` shadcn buttons inside a non-wrapping flex row, fixed with a targeted `flex-wrap`. It also caught 5 false-positive "anonymous content leak" reports caused by the test's own keyword-matching regex not recognizing this app's actual French/English gate copy — fixed in the script, not the app, after confirming via direct DOM inspection that the app's own auth gating was correct all along. | 2026-09-12 |
| Horizontal overflow + visual check across pages/viewports/languages (earlier, ad-hoc session — not the rerunnable script above) | Playwright + local Chromium, real login (admin/teacher/learner) against local MariaDB | 390/600/768/1280px × AR/FR/EN | 0px overflow on every combination checked, after fixing 4 real bugs (catalog filter row, unlocalized 404 page, 3 compounding causes of admin/teacher dashboard overflow) | 2026-09-10 |
