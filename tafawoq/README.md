# تفوّق — أستاذ الرياضيات الذكي (Tafawoq AI Teacher)

أستاذ رياضيات ذكي **ومجاني** لتلاميذ البكالوريا في الجزائر: يحدّد مستواك، يتصل بك
في مكالمة صوتية ويشرح لك بالحوار — بالفصحى أو بالدارجة — ويحضّرك بمواضيع
بكالوريا وبكالوريا تجريبية على 20. لا يحتاج أي اشتراك في الذكاء الاصطناعي.

A free AI maths teacher for the Algerian BAC — Arabic, French and English,
React + Vite + Express + tRPC + MySQL/MariaDB.

## التشغيل على Replit (أسهل طريقة)

1. **Create App → Import from GitHub** (أو ارفع هذا المجلد كما هو، في جذر المشروع).
2. اضغط **Run**: يثبّت الحزم، يشغّل MySQL محلياً، ينشئ قاعدة البيانات `tafawoq`،
   يطبّق الترحيلات، ثم يشغّل الخادم على المنفذ 3000. التفاصيل في `REPLIT.md`.
3. افتح **Webview**: تظهر مباشرة صفحة «أستاذ رياضيات يتصل بك ويشرح لك بالصوت».
4. أنشئ حساباً بالبريد وكلمة السر واختر «متعلم» (أو «ولي» لمتابعة الابن).

يحتاج **Node 22.12** أو أحدث.

## التشغيل على حاسوبك

```bash
npm install
cp .env.example .env      # ثم اضبط DATABASE_URL و JWT_SECRET
node scripts/migrate.mjs
npm run dev               # http://localhost:3000
```

الاختبارات: `npm test` (و`npm run test:db` على MySQL حقيقية).

## الإعدادات (كلها اختيارية ما عدا DATABASE_URL و JWT_SECRET)

| المتغير | الدور |
|---|---|
| `DATABASE_URL` | قاعدة MySQL (يضبطها `scripts/replit-start.sh` تلقائياً على Replit) |
| `JWT_SECRET` | سرّ الجلسات (يولَّد تلقائياً على Replit) |
| `AUTH_PROVIDER` | `email` (البريد وكلمة السر) أو `google` مع `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` |
| `ANTHROPIC_API_KEY` | اختياري — اتركه فارغاً لتبقى المنصة مجانية بالكامل |
| `TAFAWOQ_BAC_DATE` | التاريخ الرسمي للبكالوريا (YYYY-MM-DD) عند إعلانه |
| `GOOGLE_TTS_API_KEY` | اختياري: صوت Google الطبيعي (WaveNet). بدونه يُستعمل صوت Piper المجاني على الخادم |
| `TAFAWOQ_TTS_MONTHLY_CHARS` | سقف الحروف الشهري لـ Google (افتراضياً 3.5 مليون، داخل الحصة المجانية) |

ضع الأسرار في **Replit Secrets** أو في ملف `.env`، ولا تضعها في الكود.

## ما فيه

A personal teacher that treats every student differently, based on their
real level — **free to run: no AI subscription or API key needed.**
Interface in Arabic, French and English; lesson content follows its
curriculum's language (the Algerian curriculum, in Arabic). Lives in
`server/tafawoq/`, `server/routers/tafawoq.ts`, `client/src/pages/tafawoq/`
and migration `drizzle/0025_add_tafawoq_ai_teacher.sql`.

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
| Phone-call lesson | the teacher "calls" the student: greeting by name, dialogue on the weakest skill, three graded oral questions, spoken summary |
| Personal lesson & video | built from the student model with generated examples; the video is rendered in the browser as animated slides narrated by the browser's own speech synthesis |

Curriculum: BAC mathematics — limits & continuity, derivatives,
exponential, logarithm, sequences, complex numbers, antiderivatives &
integrals, probability, space geometry — plus middle-school lessons
(equations, fractions) and Ohm's law. Each lesson is a skill graph,
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


## الأصل

هذا المشروع مفصول عن منصة Nourix Academy (يشترك معها في البنية التقنية: تسجيل
الدخول، حسابات الأولياء، قاعدة البيانات). صفحات Nourix (الدورات، الدفع، لوحات
الأساتذة) حُذفت من الواجهة؛ بقيت بعض جداولها في الترحيلات وبعض مساراتها في
الخادم دون أن تُستعمل.

## منصة البكالوريا (BAC platform)

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
  it is shown as "قريباً". Today only mathematics has BAC content, so it's available to sciences
  (core) and to lettres/langues (as second subject). Generated bank topics carry no year; real
  dated topics can be published by an admin.
- Placement test across subjects (5 levels), daily plan + streak, mistake diagnosis stored per
  answer (`tafawoqAttempts.errorType`), weekly test /20, mock BAC with autosave and time
  analysis, topic bank, offline quick revision, teacher quick requests in the fixed format
  (title / explanation / law / example / question, read aloud on request), points & badges (no
  public ranking), parent follow-up (chats only with the student's consent), admin panel and an
  event log (`tafawoqEvents`, never passwords).
- Tests: `server/tafawoq/platform/platform.test.ts` and the real-DB
  `server/tafawoq/platform/bacPlatform.realDb.e2e.test.ts` (in `npm run test:db`).

Payment instructions shown to students are set by an admin (Admin → Settings).
