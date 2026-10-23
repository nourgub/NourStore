# Legacy: what remains from before Tafawoq-only

This codebase started as another product, an e-learning academy (courses,
quizzes, certificates, an algorithm lab, payment gateways, a WhatsApp bot,
institution accounts), with Tafawoq added at `/tafawoq`. The academy has
been removed; Tafawoq is now the whole app. The last commit that still
contains the academy's code is `0377e46` — `git show 0377e46:<path>` or
`git checkout 0377e46 -- <path>` brings any of it back.

What could not be removed or renamed without risking existing data stays,
and is listed here.

## Database tables no longer used by any code

They stay in the database and in `drizzle/schema.ts` (so the schema keeps
matching the real database). **Nothing drops them automatically.**

| Former feature | Tables |
|---|---|
| Courses and lessons | `subjects`, `courses`, `units`, `lessons`, `lessonAssets`, `courseEnrollments`, `lessonProgress`, `skills` |
| Quizzes, exams, placement | `unitQuizzes`, `quizQuestions`, `quizAttempts`, `quizAttemptAnswers`, `placementTests`, `placementQuestions`, `placementAttempts` |
| Certificates | `certificates` |
| Algorithm lab | `algorithmExercises`, `algorithmAttempts` |
| Academy subscriptions and payments | `subscriptionPlans`, `planPrices`, `userSubscriptions`, `invoices`, `paymentAttempts`, `refunds`, `paymentReceipts`, `whatsappCheckoutSessions` |
| Gamification | `pointsLedger`, `badges`, `userBadges` |
| Support and reports | `supportTickets`, `supportTicketMessages`, `learnerReports` |
| Google Calendar (live lessons) | `googleCalendarConnections` |

Tafawoq has its own tables for all of this (`tafawoq*`; its subscriptions are
`tafawoqSubscriptions`, its lessons live in code under
`server/tafawoq/lessons/`). Tables shared with Tafawoq and still used:
`users`, `platformSettings`, `notifications`, `parentLinks`,
`parentInviteCodes`, `coupons`, `couponRedemptions`, `referralCodes`,
`referralRedemptions`, `adminAuditLog`, `errorLog`.

To drop the legacy tables later: take a backup (`scripts/backup-database.sh`),
check they hold nothing you need (payment records may have to be kept by
law), then write a new migration `drizzle/00NN_drop_academy_tables.sql` and
remove the tables from `drizzle/schema.ts` in the same commit. Never edit or
rename an existing migration.

Other leftovers in the schema:

- `users.role` still allows `institution` (the academy's school accounts).
  It can no longer be chosen or granted; an existing account with it sees
  "staff only" in Tafawoq. Change such an account's role in Admin → الحسابات.
- `platformSettings` holds the academy's contact links (seeded by
  `drizzle/0007_seed_contact_channels.sql`, e.g. an Instagram URL). No
  screen reads them any more.

## Names kept on purpose

| Where | Name | Why it stays |
|---|---|---|
| `drizzle/0000_nourix_initial.sql`, `drizzle/meta/_journal.json` | `nourix` | `scripts/migrate.mjs` records applied migrations by file name; renaming would re-run it on every existing database. |
| `drizzle/0007_seed_contact_channels.sql` | `nourix_academy` (an Instagram URL) | Historical migration, never edited. |
| `docker-compose.yml` volumes | `nourix_mysql_data`, `nourix_uploads`, `nourix_redis_data` | Renaming a volume starts an existing deployment on a new, empty one. |
| `scripts/replit-start.sh` | database `nourix_academy` | New Repls get a database named `tafawoq`; a Repl that already has `nourix_academy` keeps using it, so no data is left behind. |
| `client/src/lib/language.ts`, `client/index.html` | localStorage key `nourix-language` | Read once and moved to `tafawoq-language`, so returning visitors keep their language. |

Docker defaults are now `tafawoq` / `tafawoq`. MySQL creates the database
and user only when its volume is first initialised, so **a deployment created
before the rename must keep `MYSQL_DATABASE=nourix_academy` and
`MYSQL_USER=nourix` in its `.env`** (the old `.env.example` already put them
there). The backup and restore scripts no longer guess a database name: they
require `MYSQL_DATABASE` and `MYSQL_USER` from `.env`.

To move an existing Docker deployment to new names: back up, create the new
database/user, restore into it, update `.env`, then remove the old volume
only once the new one is verified.

## Removed URLs (redirected)

`/`, `/academy`, `/workspace`, `/dashboard`, `/parent` and `/teacher` now
go to `/tafawoq`, and `/admin` to `/tafawoq/admin`. Course, lesson, quiz,
exam, certificate, lab, pricing, support, search and notification pages no
longer exist and show the 404 page. `sitemap.xml` and the
`/api/scheduled/*`, payment-webhook, WhatsApp-webhook, certificate-download
and Google-Calendar routes were removed with them.

## Environment variables no longer read

Safe to delete from your secrets: `PAYMENT_PROVIDER`,
`PAYMENT_WEBHOOK_SECRET`, `BARIDIMOB_MERCHANT_ID`, `BARIDIMOB_API_KEY`,
`BARIDIMOB_API_BASE_URL`, `SLICKPAY_PUBLIC_KEY`, `SLICKPAY_SANDBOX`,
`CHARGILY_SECRET_KEY`, `CHARGILY_SANDBOX`, `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`,
`CRON_SECRET`.

## Behaviour that changed with the cleanup

- **Teacher accounts are granted by an admin only.** The first-sign-in picker
  offers student or parent; before, anyone could pick "teacher" and then
  read every student's submitted exercises.
- The admin tools the academy panel used to hold (roles, password resets,
  account status, admin audit log, error log) are now in Tafawoq → Admin →
  الحسابات and السجلات.
- The JSON request limit dropped from 170 MB (academy video uploads) to
  12 MB (a 6 MB exercise photo, base64-encoded).

## Security note — secrets to rotate by hand

A hosting-platform file, `.project-config.json`, was committed (first in
`3a723ef`, a copy as `tafawoq/.project-config.json` in `8ef768d`) while the
repository is **public**. It holds a TiDB `DATABASE_URL` with its password,
a `JWT_SECRET`, Manus "forge" API keys, an analytics id and an artifact git
token. It is deleted on this branch and listed in `.gitignore` and
`.dockerignore`, but:

- it is **still present in the current files** of `main` and of the branches
  `claude/ai-book-authoring-prompt-n2cvl0`, `claude/amal-run-t48ma3`,
  `claude/math-lesson-plan-sbf2si`, `claude/organize-writing-pdf-wy7gme`,
  `claude/secondary-schedule-timetable-rdqz6b` and
  `claude/tafawoq-baccalaureate-platform-9vloo1` (twice there);
- it stays in git history on every branch.

To do by hand, in this order:

1. Change the TiDB database password (or delete that cluster if unused).
2. Revoke the Manus forge keys and anything else the file names; never
   reuse that `JWT_SECRET`.
3. Delete the file from `main` and the branches above (GitHub web: open the
   file → delete), or make the repository private.
4. Optional: purge it from history (`git filter-repo` + force-push +
   contacting GitHub support for cached views). Rotating (1–2) is what
   actually protects you; a purge alone does not.

A scan of every file and of the whole history found no other real secret:
the other password-like strings are test fixtures (e.g. `Very-long-password-42`).
