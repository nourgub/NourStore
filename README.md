# Tafawoq — تفوّق

A BAC preparation platform for Algerian secondary-school students: lessons,
unlimited exercises with automatic correction, placement and weekly tests,
mock BAC papers, an AI teacher that explains out loud (in Arabic, Algerian
Darja and the taught languages) and live sessions with human teachers.
Interface in Arabic, French and English, with a real right-to-left layout.
**Free to run**: no AI subscription or API key is needed, and nothing
requires an account with a third-party company.

The app lives at `/tafawoq` (`/` redirects there).

## Tech stack

- **Client**: React 19, TypeScript, Vite, TailwindCSS, wouter (routing),
  TanStack Query, tRPC client
- **Server**: Node.js, Express, tRPC, Drizzle ORM
- **Database**: MySQL 8 (self-hostable via `docker-compose.yml`, any managed
  MySQL, or the local MySQL `scripts/replit-start.sh` runs on Replit)
- **Auth**: email/password (built-in, no external service) or Google OAuth
  2.0 (optional)
- **Tests**: Vitest (unit + real-database integration tests)

## Roles

Enforced by the server (`server/_core/procedures.ts`), whatever a page shows:

- **learner** (student) and **parent** — the only roles a visitor can pick
  for themselves at first sign-in (a parent sees nothing until a student
  gives them a one-time code).
- **teacher** — granted by an admin only (Admin → الحسابات): a teacher sees
  students' submitted exercises and answers them, and runs live sessions.
- **admin** — the first one comes from `OWNER_OPEN_ID` (see `.env.example`),
  later ones from an existing admin.

## Local development

Requirements: Node.js 22.12+, and either Docker (for the self-hosted MySQL
below) or your own MySQL 8 instance. On Replit, just click **Run** — see
`REPLIT.md`.

```bash
npm install
cp .env.example .env
# fill in .env — see the comments in that file; nothing there requires a
# third-party account except AUTH_PROVIDER=google, and even that's optional
docker compose up -d          # self-hosted MySQL + Redis, zero external service
node scripts/migrate.mjs      # applies every drizzle/*.sql migration, in order
npm run dev                   # http://localhost:3000
node scripts/fetch-piper.mjs  # optional: the free natural teacher voices
```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build (client + server bundle) |
| `npm start` | Run the production build (`npm run build` first) |
| `npm run check` | TypeScript typecheck, no build output |
| `npm test` | The whole test suite (real-database tests skip themselves if `DATABASE_URL` isn't set) |
| `npm run test:unit` | Only the fast, database-free tests — always safe, no infra needed |
| `npm run test:db` | The real-database tests (`server/tafawoq/**/*.realDb.e2e.test.ts`) against `DATABASE_URL` |
| `npm run test:db:repeat [count]` | Run `test:db` `count` times (default 5), stopping at the first failure |
| `npm run migrate` | Apply every not-yet-applied migration in `drizzle/*.sql` |
| `npm run format` | Prettier, writes in place |

**Migrations**: the real migration path is `node scripts/migrate.mjs` (also
what runs on every Docker deploy and in `replit-start.sh`). It reads every
`drizzle/*.sql` file in filename order and records each applied file in its
own `_migrations` table. Migrations are hand-written, so `drizzle-kit`'s
journal (`drizzle/meta/_journal.json`) is out of date — don't use `db:push`.

### Real-database tests

`npm run test:db` runs the full student loop, the BAC platform (stream lock,
subscriptions, plans, papers, parents, admin) and sessions with teachers
against a real MySQL schema, and cleans up after itself. Never point
`DATABASE_URL` at a production database:

```bash
DATABASE_URL="mysql://user:pass@localhost:3306/tafawoq_test" JWT_SECRET=a-test-secret-of-16-chars npm run test:db
```

## The AI teacher

A personal teacher that treats every student differently, based on their
real level. Lives in `server/tafawoq/`, `server/routers/tafawoq.ts` and
`client/src/pages/tafawoq/`.

| Step | How (all deterministic, no model call) |
|---|---|
| Student profile | name, age, school level, goals |
| Level assessment | 10-question placement covering every skill of the lesson, easy → hard |
| Unlimited exercises | **parametric generators** (`generators/`, `lessons/*.ts`): each draws fresh numbers, *computes* the answer and a worked solution, and builds every wrong option by applying one named wrong rule — so a chosen distractor reveals the misconception |
| Automatic correction | MCQ by key; typed answers by **mathematical equivalence** (`mathExpr.ts`): `2(3x²−2)`, `6x^2-4` and `−4 + 6·x²` are all accepted for `6x² − 4` |
| Student model / knowledge tracing | Bayesian Knowledge Tracing per skill (`studentModel.ts`) |
| Learning analytics | tier, strengths, weaknesses, recurring errors, learning speed (timing + accuracy), completion |
| Recommendation / plan | next skills to teach, respecting each lesson's prerequisite graph |
| Tutor | understands "explain / example / why do I make this mistake / simpler / challenge me" (ar/fr/en) and answers from the student model, the lesson's remedies and freshly generated worked examples |
| Teaching by dialogue | "علّمني بالحوار": instead of handing over the rule, the teacher asks a chain of small questions the student can answer (`Skill.dialogue`, `dialogue.ts`), hints after a miss without giving the answer, reveals after a second miss, and lets the student reach the rule. Works in the chat, the live voice session and the phone call |
| BAC-style problems | "موضوع بكالوريا": one statement and 4–6 chained questions like a real BAC exercise, ending with the discriminating question (`Lesson.problems`, `problems.ts`); numbers drawn and every answer computed, each part graded on its own skill |
| Mock BAC & road to the mark | a full paper out of 20 per stream (`bac.ts`), marked once and kept; a predicted maths mark from mastery and mock exams with its range, the student's target, the BAC countdown (`TAFAWOQ_BAC_DATE`, else estimated), the weekly pace and today's most valuable task |
| Teacher in Darja | "الأستاذ يتكلم: الدارجة": the teacher's sentences (greetings, praise, hints, dialogue, oral quiz, call) said in Algerian Darja, maths untouched (`darja.ts`); Darja requests ("سقسيني", "ما فهمتش", "معلاباليش"), Darja numbers ("طناش") and French maths terms ("la dérivée") are understood |
| Natural teacher voice | the student picks a male or a female teacher ("الصوت: أستاذ / أستاذة"); synthesised on the server — first from a prepared voice pack when `TAFAWOQ_VOICE_PACK_MALE/FEMALE` are set (everything the teacher says, recorded once with an open model on a free GPU and imported: free and unlimited, `voice-dataset/pack/`), then (`tts.ts`, `POST /api/tafawoq/tts`, signed-in, rate limited, cached per sentence and voice for good, the fixed sentences prepared ahead in the background (`ttsWarmup.ts`); the free monthly allowance is spread over the month and, beyond its pro-rata line, sentences with maths are assembled from cached pieces in the same voice, so it never runs out; what is generated and spoken is drawn from `TAFAWOQ_SPOKEN_VARIANTS` fixed variants so it is voiced once for every student; with `STORAGE_PROVIDER=s3` the recordings survive redeploys): Azure Speech's Algerian voices (Ismael ♂, Amina ♀) when `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` are set (cap `TAFAWOQ_AZURE_MONTHLY_CHARS`, inside the free F0 tier), then Google Cloud TTS WaveNet when `GOOGLE_TTS_API_KEY` is set (monthly cap `TAFAWOQ_TTS_MONTHLY_CHARS`, default inside the free quota), otherwise Piper (MIT, local, free — `scripts/fetch-piper.mjs`, fetched by `replit-start.sh`); the browser's best voice only as a last resort |
| Language lessons' voices | in German, Spanish, Italian, French and English lessons the language itself is read by a voice of that language and the student can choose to be taught in it (style «Deutsch / Español / Italiano / Français / English»). Free Piper voices fetched by `scripts/fetch-piper.mjs`, each recorded by a consenting speaker: Thorsten (de, CC0), davefx (es, CC0), Paola (it, CC0), Joe (en, CC0), Cori (en, public domain) and **SIWIS (fr) — CC-BY 4.0, credit: "SIWIS French Speech Synthesis Database", University of Edinburgh / Idiap (https://datashare.is.ed.ac.uk/handle/10283/2353)**; Azure/Google voices of the language when their keys are set |
| Phone-call lesson | the teacher "calls" the student: greeting by name, dialogue on the weakest skill, three graded oral questions, spoken summary |
| Personal lesson & video | built from the student model with generated examples; the video is rendered in the browser as animated slides narrated by the browser's own speech synthesis |

Curriculum (`server/tafawoq/lessons/`): BAC mathematics — limits &
continuity, derivatives, exponential, logarithm, sequences, complex numbers,
antiderivatives & integrals, probability, space geometry — physics,
natural sciences, philosophy, Arabic, history-geography, Islamic education,
French, English, German, Spanish and Italian, plus a few middle-school
lessons (equations, fractions). Each lesson is a skill graph,
misconceptions + remedies, and generators; `server/tafawoq/generators.test.ts`
runs 300 random draws of every generator and fails on a wrong key, a
distractor equal to the answer, an untagged distractor, or broken
formatting. Adding a country means adding a curriculum (`CURRICULA` in
`curriculum.ts`) and its lessons; the engine is curriculum-agnostic.

**Optional Claude.** If `ANTHROPIC_API_KEY` is set, lessons, exercises,
tutor replies and video scripts are generated by Claude on top of the same
student model (`ai.ts`); anything that fails or doesn't validate falls back
to the free path. Leave it unset and nothing is ever sent to any AI service.

Tests: `server/tafawoq/tafawoq.test.ts`, `server/tafawoq/generators.test.ts`,
`server/tafawoq/dialogue.test.ts` (every skill has a dialogue whose answers
are accepted and whose hints don't give them away; full dialogues replayed),
`server/tafawoq/problems.test.ts` (200 draws of every BAC problem),
and `server/tafawoq/tafawoq.realDb.e2e.test.ts` (the full loop against real
MySQL, part of `npm run test:db`).

## The BAC platform

Streams: **العلوم التجريبية**, **الآداب والفلسفة**, **اللغات الأجنبية**. Server code in
`server/tafawoq/platform/` (rules: `catalog.ts`, `plan.ts`, `papers.ts`, `diagnosis.ts`,
`teacher.ts`; orchestration: `service.ts`; guard: `access.ts`), routers in
`server/routers/bac.ts` (`bac.*` students/parents, `bacAdmin.*` admins), migration
`drizzle/0032_add_tafawoq_bac_platform.sql`, screens in `client/src/pages/tafawoq/`.

- **Stream lock**: chosen once (`bac.chooseStream`), locked in the database; profile edits can't
  change it; another stream's lessons are refused by the server (`STREAM_LOCKED`) and logged.
  Changes only via a request an admin approves; every change is kept in `tafawoqStreamChanges`.
- **Second subject**: one at a time, from the stream's options, only if it has content; one own
  change per subscription cycle (admin can turn changes off in Settings).
- **Subscription 3000 DA/month** (3/6/12-month offers, coupons, referral free days). No payment
  is simulated: a request stays `pending_payment` until an admin confirms it. Everything except
  the placement test needs an active subscription (checked server-side).
- **Content honesty**: a subject is offered only if the curriculum has lessons for it; otherwise
  it is shown as "قريباً". Every subject of the three streams now has BAC lessons. Generated bank
  topics carry no year; real dated topics can be published by an admin.
- Placement test across subjects (5 levels), daily plan + streak, mistake diagnosis stored per
  answer (`tafawoqAttempts.errorType`), weekly test /20, mock BAC with autosave and time
  analysis, topic bank, offline quick revision, teacher quick requests in the fixed format
  (title / explanation / law / example / question, read aloud on request), points & badges (no
  public ranking), parent follow-up (chats only with the student's consent), admin panel and an
  event log (`tafawoqEvents`, never passwords).
- **Sessions with a human teacher** (`/tafawoq/sessions`, migration
  `drizzle/0034_add_tafawoq_tutoring.sql`, rules in `server/tafawoq/platform/tutoring.ts`):
  an admin links a teacher profile to a *teacher* account (Admin → الأساتذة والحصص); the teacher
  opens slots (Algiers time, up to 30 days ahead, never overlapping); a subscribed student books
  one in a subject of their stream (≥ 2 h ahead, at most 3 to come); the teacher confirms or
  declines. On confirmation a free Jitsi Meet room (unguessable link, nothing to install) appears
  for both, joinable 15 minutes before. Students cancel free up to 12 h before. One slot can never
  be booked twice (conditional update), and every step sends an in-app notification. Sessions
  are included in the subscription by default; a per-teacher price can be shown, but no payment
  is collected for it.
- Tests: `server/tafawoq/platform/platform.test.ts` and the real-DB
  `server/tafawoq/platform/bacPlatform.realDb.e2e.test.ts` and
  `server/tafawoq/platform/tutoring.realDb.e2e.test.ts` (in `npm run test:db`).

Payment instructions shown to students are set by an admin (Admin → Settings).

## Project structure

```
client/src/
  pages/tafawoq/     every Tafawoq screen (student, parent, teacher, admin)
  pages/             Auth (sign in / register), Legal (privacy / terms), NotFound
  components/        shared UI components (role picker, update banner, ui/ kit)
  _core/, lib/       auth hook, tRPC client, language, document meta
server/
  routers.ts         composes appRouter: auth, parent, admin (accounts & logs),
                     diagnostics, tafawoq, bac, bacAdmin, bacTutor
  routers/           one file per router
  tafawoq/           the AI teacher, lessons, generators, voices
  tafawoq/platform/  the BAC platform rules (streams, plans, papers, sessions)
  db/                persistence, one file per domain
  _core/             env config, session/cookies, Google OAuth, Express wiring
shared/              types and rules used by both client and server
drizzle/
  schema.ts          the full database schema (including legacy tables, see docs/LEGACY.md)
  *.sql              migrations, applied in filename order by scripts/migrate.mjs
scripts/             migrate, Replit start, voices, backups, endpoint audit
```

## Known limitations

- **No outbound email.** Password recovery goes through an admin (Admin →
  الحسابات → set a new password); notifications are in-app.
- **Payment is manual**: a subscription request stays pending until an admin
  confirms the payment (CCP, BaridiMob…). No payment gateway is integrated.
- **The privacy policy and terms are a draft** (`client/src/pages/Legal.tsx`)
  written for Tafawoq but never reviewed by a lawyer — have them checked
  against Law 18-07 before charging.
- The repository once contained the code of an earlier product on the same
  base; what remains of it (database tables, migration names, Docker volume
  names) and why is listed in `docs/LEGACY.md`.

## Further reading

- `REPLIT.md` — running on Replit, fully self-contained
- `DEPLOYMENT.md` — Docker, other hosts, environment variables, backups
- `docs/LEGACY.md` — what remains from before the platform was Tafawoq-only
- `voice-dataset/pack/README.md` — preparing a recorded voice pack
