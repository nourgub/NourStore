# Verification history

A running, append-only log of what was actually run, when, and against what
environment — distinct from `docs/current-status.md` (a current snapshot)
and `docs/archive/` (frozen historical narrative). Every row here reflects a
command that was actually executed, not a claim taken on faith. New rows go
at the top of each table.

## Performance (Phase 4)

Measured with `npx lighthouse` (desktop preset, `--only-categories=performance`)
against an actual production build (`npm run build && npm start`), Chromium
pinned via `PLAYWRIGHT_CHROMIUM_PATH`/`CHROME_PATH`. Home page (`/`), no auth.

| Metric | Before | After | What changed |
|---|---|---|---|
| Performance score | 0.55 | 0.98 | Google Fonts `<link rel="stylesheet">` made non-render-blocking (`media="print"` + `onload` swap, `client/index.html`) |
| First Contentful Paint | 12.9 s | 0.8 s | same |
| Largest Contentful Paint | 12.9 s | 1.0 s | same |
| Speed Index | 12.9 s | 0.8 s | same |
| Total Blocking Time | 0 ms | 0 ms | unchanged |
| Cumulative Layout Shift | 0 | 0 | unchanged |
| Main JS chunk (`index-*.js`) | 451.23 kB raw / 139.42 kB gzip | same | not touched — see note below |
| Main CSS (`index-*.css`) | 206.2 kB raw / 33.8 kB gzip | same | not touched |
| Largest lazy chunk (`StaffFlows-*.js`) | 105.74 kB raw / 25.89 kB gzip | same | not touched |

**Honest caveats**: the "before" 12.9 s figures are inflated by this sandbox's
own unreliable egress to `fonts.googleapis.com` (confirmed earlier this
session — see `scripts/browser-smoke-test.ts`'s header comment) — a real
user's connection to Google Fonts is normally far faster. But the *fix*
itself is not a sandbox-specific workaround: a render-blocking cross-origin
stylesheet delays first paint by at least one extra round trip in any
environment, and the after-numbers were confirmed without blocking that
request at all (i.e. under the same flaky conditions), which is why the
score still improved this much even here. Verified after the change: the
fonts still visually apply (`getComputedStyle(document.body).fontFamily`
checked directly), zero console errors, `pnpm run check` clean, `npm run
build` succeeds with identical chunk sizes, 230/230 unit tests pass.
Bundle sizes were not reduced — on inspection the existing route-level
`React.lazy()` splitting (see `client/src/App.tsx`) already keeps every
non-Home page out of the initial chunk, and the one library the original
prompt specifically warned about (`recharts`) turned out to already be
absent from every built chunk, because its only consumer
(`client/src/components/ui/chart.tsx`) isn't imported by any page — a
dead-code finding, not a bundling one (see the dependency-audit phase).
No further code-splitting was attempted without a concrete finding to
justify it, per "don't change what isn't measurably wrong."

## Large-file splits (Phase 5)

All 8 files named for this pass, split or explicitly justified. Every
split was verified with `pnpm run check` + `npm run build` (identical
chunk sizes/hashes where applicable) + `pnpm run test:unit` after each
file, plus `test:db` and the 3 payment-provider test files for the two
files touching payment-adjacent code.

| File | Before | After | Approach |
|---|---|---|---|
| `server/db/courses.ts` | 1578 lines | 10-line barrel + `courses/{catalog,authoring,progress}.ts` | independent functions, split by domain |
| `server/db/quizzes.ts` | 723 lines | 7-line barrel + `quizzes/{reads,authoring,grading}.ts` | same |
| `server/db/subscriptions.ts` | 643 lines | 9-line barrel + `subscriptions/{plans,user,invoices}.ts` | same; payment-adjacent — verified against the 3 payment-provider test files too, zero logic changed |
| `client/src/pages/flows/staff/CourseManagement.tsx` | 778 lines | 7-line barrel + `courseManagement/{ContentStructureForm,PlacementAdminPanel}.tsx` | already 2 independent named-export components, moved directly |
| `client/src/pages/flows/staff/BillingManagement.tsx` | 709 lines | 9-line barrel + 5 files under `billingManagement/` | already 5 independent named-export components, moved directly |
| `client/src/pages/Dashboard.tsx` | 1152 lines | 1021 lines + `Dashboard.i18n.ts` (132 lines) | pure static data (translations, status-label helpers) extracted; the rest is one component's JSX tree — see note below |
| `client/src/pages/Home.tsx` | 1013 lines | 800 lines + `Home.i18n.ts` (215 lines) | same pattern |
| `client/src/pages/CourseDetail.tsx` | 677 lines | 583 lines + `CourseDetail.i18n.ts` (94 lines) | same pattern |

**Why the last three weren't split further**: each is a single component
function whose body is ~800-1000 lines of JSX driven by 8-15
`useQuery`/`useMutation` calls and dozens of derived local variables used
throughout that render tree. Splitting the JSX itself into sub-components
would mean threading many of those variables as props across each new
boundary in one large edit — real effort for a real but modest
readability gain, and much higher regression risk than the courses.ts-
style split (independent functions with a handful of shared imports,
verified mechanically). Consistent with the task's own instruction to
document rather than force a split that isn't clearly worth it.

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
| Phase 8 final re-run of the full smoke test, after all of Phases 5-7's file splits and dependency removal | Same script/method as the row below, against the final rebuilt production bundle | run against production build, not dev server | **202/204 checks passed.** The 2 failures are the same one root cause on both: `net::ERR_CONNECTION_RESET` fetching `fonts.googleapis.com` — this sandbox's own unreliable egress to that specific external host (already documented as a known limitation of this environment, and the exact issue Phase 4's font-loading fix targeted; the page itself still renders correctly either way, since that fix made the stylesheet non-render-blocking — this check just also flags the failed network request itself). Not an app defect, and not something Phases 5-7's code changes could have caused (none of them touch anything network- or font-related). No new failures of any other kind appeared after the large-file splits or the 3 dependency removals. | 2026-09-12 |
| Full rerunnable smoke test (`scripts/browser-smoke-test.ts`) — ~14 page kinds × 4 viewports (390/412/768/1280px) × 3 languages (AR/FR/EN) × anonymous/learner/teacher/admin; checks horizontal overflow, console errors, failed/5xx requests, and that gated pages never leak content to an anonymous visitor | Playwright + local Chromium, against an actual **production build** (`node dist/index.js`), real login for each role, against local MariaDB | run against production build, not dev server | **204/204 checks passed, 0 failures** — run as two separate invocations (`SMOKE_TEST_ROLES=learner,teacher` then `SMOKE_TEST_ROLES=admin`) because this sandbox's Node process reproducibly freezes outright after ~40 minutes of sustained Chromium work in one process (confirmed with a 10s heartbeat log that itself stops ticking during the freeze — not one stuck operation, the whole event loop). Along the way this run found and fixed 3 real bugs: an anonymous-visitor login-gate button overflowing horizontally in French on `/dashboard` at 390×844, and a curriculum-builder action row (Move up/down/Edit/Delete) overflowing at 768×1024 in French and English on `/teacher` — both were `whitespace-nowrap` shadcn buttons inside a non-wrapping flex row, fixed with a targeted `flex-wrap`. It also caught 5 false-positive "anonymous content leak" reports caused by the test's own keyword-matching regex not recognizing this app's actual French/English gate copy — fixed in the script, not the app, after confirming via direct DOM inspection that the app's own auth gating was correct all along. | 2026-09-12 |
| Horizontal overflow + visual check across pages/viewports/languages (earlier, ad-hoc session — not the rerunnable script above) | Playwright + local Chromium, real login (admin/teacher/learner) against local MariaDB | 390/600/768/1280px × AR/FR/EN | 0px overflow on every combination checked, after fixing 4 real bugs (catalog filter row, unlocalized 404 page, 3 compounding causes of admin/teacher dashboard overflow) | 2026-09-10 |
