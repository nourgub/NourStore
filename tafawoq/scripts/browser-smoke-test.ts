// Real-browser smoke test across viewports, languages, and pages — Phase 3
// of the remaining-gaps pass. Not screenshots-only: every page load is
// checked programmatically (horizontal overflow, console errors, failed
// network requests, unauthenticated content leakage) and the script exits
// non-zero with a clear failure list if anything is wrong.
//
// Requires: a running dev/prod server (see DEV_SERVER_URL below) and a real
// DATABASE_URL (to seed the fixture course/users this test needs — without
// it, only the pages that need no real data are checked, and that's stated
// explicitly in the report rather than silently skipped).
//
// Usage:
//   DATABASE_URL="mysql://..." JWT_SECRET=... npx tsx scripts/browser-smoke-test.ts
//   (start `npm run dev` or a production server against the same
//   DATABASE_URL first, in another terminal — this script does not start
//   the server itself)
//
// Optional env vars:
//   SMOKE_TEST_BASE_URL          override the server URL (default http://127.0.0.1:3000)
//   SMOKE_TEST_SKIP_ANON=true    skip the anonymous-pages phase (useful when
//                                re-running only to check the learner/
//                                teacher/admin phase after already
//                                confirming the anonymous phase is clean —
//                                the full matrix is ~200 checks and can
//                                take 20-40 minutes on a constrained machine)
//   PLAYWRIGHT_CHROMIUM_PATH     pin a specific Chromium binary instead of
//                                Playwright's own resolution (needed in
//                                sandboxes with a pre-installed browser at
//                                a fixed, version-independent path)
//   SMOKE_TEST_ROLES             comma list to restrict which of
//                                learner,teacher,admin run (default: all
//                                three). Exists because of a confirmed,
//                                reproducible sandbox limit, not a bug in
//                                this script: after ~35-45 minutes of
//                                sustained Chromium-heavy work in one Node
//                                process, the entire process can freeze
//                                outright — proven by adding a 10s
//                                heartbeat log that itself stops printing
//                                during the hang (if only one specific
//                                await were stuck, the heartbeat would
//                                keep ticking; it doesn't). No per-operation
//                                timeout can rescue a frozen event loop.
//                                A full, reliable verification in this kind
//                                of environment is two invocations:
//                                  SMOKE_TEST_ROLES=learner,teacher ...  (+ anon)
//                                  SMOKE_TEST_ROLES=admin SMOKE_TEST_SKIP_ANON=true ...
//                                each comfortably under the wall.

import { chromium } from "playwright";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db/shared";
import { createEmailUser } from "../server/db/usersAuth";
import { hashPassword, emailOpenId } from "../server/_core/emailAuth";
import { createCourse, createUnit, createLesson } from "../server/db/courses";
import {
  createManagedQuiz,
  createManagedFinalExam,
  createManagedQuizQuestion,
} from "../server/db/quizzes";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import {
  users,
  courses,
  units,
  lessons,
  unitQuizzes,
  courseEnrollments,
  certificates,
  type User,
} from "../drizzle/schema";

// 127.0.0.1, not "localhost": in some sandboxed/containerized environments
// Chromium resolves "localhost" to ::1 (IPv6) on some requests and
// 127.0.0.1 (IPv4) on others, and if the dev server only reliably accepts
// one of those, every request that resolves to the other hangs until
// Chromium's own connection timeout — this was diagnosed as the root cause
// of "the first navigation works, then every single one after it times
// out" during development. The explicit IPv4 address sidesteps the
// resolution ambiguity entirely.
const BASE = process.env.SMOKE_TEST_BASE_URL || "http://127.0.0.1:3000";
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x900", width: 1280, height: 900 },
];
const LANGS = ["ar", "fr", "en"] as const;

type Failure = { page: string; viewport: string; lang: string; reason: string };
const failures: Failure[] = [];
let checksRun = 0;

function fail(pageLabel: string, viewport: string, lang: string, reason: string) {
  failures.push({ page: pageLabel, viewport, lang, reason });
}

function ctxFor(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ---------------------------------------------------------------------
// Fixture setup — a real course with a lesson, unit quiz, final exam, a
// certificate, and admin/teacher/learner accounts. Mirrors the pattern in
// server/realDb.e2e.test.ts, but written directly (not as vitest `it`
// blocks) since this needs a live server on the other end, not just a
// router caller.
// ---------------------------------------------------------------------
async function seedFixtures() {
  const db = await getDb();
  if (!db) throw new Error("expected a real database connection");

  const adminOpenId = emailOpenId(`smoke-admin-${RUN}@nourix.test`);
  const teacherOpenId = emailOpenId(`smoke-teacher-${RUN}@nourix.test`);
  const learnerOpenId = emailOpenId(`smoke-learner-${RUN}@nourix.test`);
  const password = "Smoke-Test-Pass-123";
  const passwordHash = await hashPassword(password);

  for (const [openId, email] of [
    [adminOpenId, `smoke-admin-${RUN}@nourix.test`],
    [teacherOpenId, `smoke-teacher-${RUN}@nourix.test`],
    [learnerOpenId, `smoke-learner-${RUN}@nourix.test`],
  ] as const) {
    const result = await createEmailUser({ openId, email, name: "Smoke Fixture", passwordHash });
    if (!result.ok) throw new Error(`Failed to create fixture user ${email}`);
  }
  await db.update(users).set({ role: "admin" }).where(eq(users.openId, adminOpenId));
  await db.update(users).set({ role: "teacher" }).where(eq(users.openId, teacherOpenId));

  const [adminRow] = await db.select().from(users).where(eq(users.openId, adminOpenId));
  const [teacherRow] = await db.select().from(users).where(eq(users.openId, teacherOpenId));
  const [learnerRow] = await db.select().from(users).where(eq(users.openId, learnerOpenId));

  const slug = `smoke-test-course-${RUN}`;
  const courseResult = await createCourse({
    ownerId: teacherRow.id,
    slug,
    subject: "math",
    stage: "middle",
    level: "foundation",
    titleAr: "دورة اختبار بصري",
    titleFr: "Cours de test visuel",
    titleEn: "Visual smoke test course",
    descriptionAr: "دورة لأغراض اختبار المتصفح الآلي فقط.",
    descriptionFr: "Cours à des fins de test navigateur automatisé uniquement.",
    descriptionEn: "Course for automated browser test purposes only.",
  });
  if (!courseResult.ok) throw new Error("Failed to create fixture course");
  const [courseRow] = await db.select().from(courses).where(eq(courses.slug, slug));

  await createUnit({
    courseId: courseRow.id,
    role: "teacher",
    userId: teacherRow.id,
    orderIndex: 0,
    titleAr: "الوحدة الأولى",
    titleFr: "Unité 1",
    titleEn: "Unit 1",
  });
  const [unitRow] = await db.select().from(units).where(eq(units.courseId, courseRow.id));

  const lessonResult = await createLesson({
    unitId: unitRow.id,
    role: "teacher",
    userId: teacherRow.id,
    orderIndex: 0,
    titleAr: "الدرس الأول",
    titleFr: "Leçon 1",
    titleEn: "Lesson 1",
    type: "article",
    content: "محتوى الدرس الأول لأغراض اختبار المتصفح.",
  });
  if (!lessonResult) throw new Error("Failed to create fixture lesson");
  const [lessonRow] = await db.select().from(lessons).where(eq(lessons.unitId, unitRow.id));

  await createManagedQuiz({
    unitId: unitRow.id,
    role: "teacher",
    userId: teacherRow.id,
    passScore: 60,
    maxAttempts: 3,
  });
  const [unitQuizRow] = await db
    .select()
    .from(unitQuizzes)
    .where(eq(unitQuizzes.unitId, unitRow.id));
  await createManagedQuizQuestion({
    quizId: unitQuizRow.id,
    role: "teacher",
    userId: teacherRow.id,
    questionType: "choice",
    promptAr: "كم عدد أضلاع المثلث؟",
    promptFr: "Combien de côtés a un triangle ?",
    promptEn: "How many sides does a triangle have?",
    optionsJson: JSON.stringify(["2", "3", "4"]),
    answerKey: "1",
    orderIndex: 0,
  });

  await createManagedFinalExam({
    courseId: courseRow.id,
    role: "teacher",
    userId: teacherRow.id,
    passScore: 60,
    maxAttempts: 3,
  });

  const adminCaller = appRouter.createCaller(ctxFor(adminRow));
  await adminCaller.admin.publishCourse({ courseId: courseRow.id, published: true });

  // Enrolled directly (not via the subscription-gated checkout flow) — this
  // smoke test checks page rendering, not the payment/enrollment business
  // logic, which is already covered by server/realDb.e2e.test.ts.
  await db.insert(courseEnrollments).values({
    userId: learnerRow.id,
    courseId: courseRow.id,
    status: "active",
    progressPercent: 0,
  });

  const certificateId = `NX-SMOKE-${RUN}`;
  await db.insert(certificates).values({
    certificateId,
    userId: learnerRow.id,
    courseId: courseRow.id,
    status: "active",
  });

  return {
    admin: adminRow,
    teacher: teacherRow,
    learner: learnerRow,
    password,
    courseSlug: slug,
    courseId: courseRow.id,
    unitId: unitRow.id,
    lessonId: lessonRow.id,
    certificateId,
  };
}

async function cleanupFixtures(fx: Awaited<ReturnType<typeof seedFixtures>>) {
  const db = await getDb();
  if (!db) return;
  const { adminAuditLog } = await import("../drizzle/schema");
  await db.delete(certificates).where(eq(certificates.certificateId, fx.certificateId));
  await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, fx.courseId));
  const unitQuizRows = await db
    .select({ id: unitQuizzes.id })
    .from(unitQuizzes)
    .where(eq(unitQuizzes.unitId, fx.unitId));
  const { quizQuestions } = await import("../drizzle/schema");
  for (const q of unitQuizRows) {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, q.id));
  }
  await db.delete(unitQuizzes).where(eq(unitQuizzes.courseId, fx.courseId));
  await db.delete(unitQuizzes).where(eq(unitQuizzes.unitId, fx.unitId));
  await db.delete(lessons).where(eq(lessons.unitId, fx.unitId));
  await db.delete(units).where(eq(units.courseId, fx.courseId));
  await db.delete(courses).where(eq(courses.id, fx.courseId));
  const { referralCodes } = await import("../drizzle/schema");
  for (const u of [fx.admin, fx.teacher, fx.learner]) {
    await db.delete(adminAuditLog).where(eq(adminAuditLog.actorId, u.id));
    // The learner dashboard visits progress.referralCode itself, which
    // get-or-creates a code as a side effect — must be cleaned up before
    // the user row or the foreign key blocks the delete (found for real:
    // a first version of this cleanup crashed here mid-run).
    await db.delete(referralCodes).where(eq(referralCodes.userId, u.id));
  }
  for (const u of [fx.admin, fx.teacher, fx.learner]) {
    await db.delete(users).where(eq(users.id, u.id));
  }
}

// ---------------------------------------------------------------------
// Timeout helper — every awaited operation below is wrapped so a hung
// browser/network call fails loudly within a bounded time instead of
// leaving the whole script stuck forever (this is what happened during
// development: a bare `networkidle` wait with no outer bound hung for
// 50+ minutes with 0% CPU, and had to be killed by hand).
// ---------------------------------------------------------------------
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms: ${label}`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

// A brand-new BrowserContext's very first navigation is reproducibly slower
// than every navigation after it in this sandbox (confirmed against a
// production build, not just the dev server — it hit the anonymous context,
// then the learner context, then the teacher context, each exactly once, at
// the same point: first check after newContext()). This absorbs that
// one-time cold-start cost with a generous, non-fatal warm-up request before
// the real (timed, counted) checks begin, so a real per-check timeout stays
// tight without every context's first check being a false failure.
async function warmUpContext(context: import("playwright").BrowserContext) {
  let page: import("playwright").Page | undefined;
  try {
    page = await withTimeout(context.newPage(), 30000, "newPage (warm-up)");
    await withTimeout(page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 40000 }), 42000, "context warm-up");
  } catch {
    // Best-effort only — if it still fails, the first real check will
    // surface it (and count as a real failure, since it's no longer free).
  } finally {
    if (page) await withTimeout(page.close(), 10000, "close warm-up page").catch(() => {});
  }
}

// ---------------------------------------------------------------------
// Per-page check. Opens a brand-new Page for every single check and closes
// it afterward, rather than repeatedly navigating one long-lived Page.
// This was forced by an empirical finding during development: in this
// sandbox, a Page's *first* navigation always succeeds, but every
// subsequent page.goto() on that SAME Page object then times out
// (reproduced identically against both "localhost" and the explicit
// 127.0.0.1 address, ruling out DNS/IPv6 resolution as the cause — it's
// specific to reusing one Page for many navigations). A fresh Page per
// check costs a little overhead but was the only structure that actually
// worked reliably; cookies/localStorage still persist correctly since
// both live on the BrowserContext, not the Page.
//
// Uses "domcontentloaded" (SPA-safe — nothing here needs every background
// request to finish, just the app to have mounted) plus a short fixed
// settle time, rather than "networkidle", which an app with any
// recurring background request (query refetch, polling) can keep from
// ever firing at all.
// ---------------------------------------------------------------------
async function checkPage(
  context: import("playwright").BrowserContext,
  viewport: { name: string; width: number; height: number },
  pageLabel: string,
  lang: string,
  path: string,
  opts: { expectLoginRedirect?: boolean } = {}
) {
  checksRun++;
  const label = `[${viewport.name} / ${lang} / ${pageLabel}]`;
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  const page = await withTimeout(context.newPage(), 30000, `newPage (${label})`);
  const onConsole = (msg: import("playwright").ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  };
  const onResponse = (res: import("playwright").Response) => {
    // 401/403 are expected on protected routes visited without a session —
    // only flag server errors and other unexpected failure classes.
    if (res.status() >= 500) failedRequests.push(`${res.status()} ${res.url().slice(0, 150)}`);
  };
  const onRequestFailed = (req: import("playwright").Request) => {
    const failure = req.failure();
    if (failure && !failure.errorText.includes("net::ERR_ABORTED"))
      failedRequests.push(`FAILED ${req.url().slice(0, 150)} (${failure.errorText})`);
  };
  page.on("console", onConsole);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  try {
    await withTimeout(page.setViewportSize({ width: viewport.width, height: viewport.height }), 5000, "set viewport");
    await withTimeout(
      page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 }),
      22000,
      `goto ${path}`
    );
    await withTimeout(page.waitForTimeout(400), 2000, "settle wait");

    if (opts.expectLoginRedirect) {
      const url = page.url();
      const bodyText = await withTimeout(
        page.evaluate(() => document.body.innerText).catch(() => ""),
        3000,
        "read body text"
      );
      // Matched against the real per-page copy, not guessed literals — the
      // first pass here used "سجل الدخول" and "Se connecter", which missed
      // real anonymous-gate text ("سجّل الدخول" with a shadda in
      // LessonViewer, "Connectez-vous..." in both Dashboard and
      // LessonViewer's French copy, "Log in..." in Dashboard's English vs
      // "Sign in..." in LessonViewer's) and produced false-positive
      // failures on a gate that was actually working correctly. "الدخول"
      // alone (without the full phrase) is diacritic-insensitive since it's
      // the substring shared by both real Arabic strings.
      const looksBlocked =
        url.includes("/login") ||
        bodyText.length < 30 ||
        /الدخول|غير مصرح|Unauthorized|Forbidden|Log in|Sign in|Connectez-vous|Se connecter/i.test(bodyText);
      if (!looksBlocked) {
        fail(pageLabel, viewport.name, lang, `anonymous visit to ${path} did not appear blocked/redirected`);
      }
    }

    const overflow = await withTimeout(
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      3000,
      "measure overflow"
    );
    const reasons: string[] = [];
    if (overflow > 1) reasons.push(`horizontal overflow: ${overflow}px at ${path}`);
    if (consoleErrors.length) reasons.push(`${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
    if (failedRequests.length)
      reasons.push(`${failedRequests.length} failed/5xx request(s): ${failedRequests[0]}`);
    for (const reason of reasons) fail(pageLabel, viewport.name, lang, reason);
    console.log(
      reasons.length ? `  ${label} FAIL: ${reasons.join(" | ")}` : `  ${label} ok`
    );
  } catch (error) {
    fail(pageLabel, viewport.name, lang, `error: ${(error as Error).message.slice(0, 200)}`);
    console.log(`  ${label} ERROR: ${(error as Error).message.slice(0, 150)}`);
  } finally {
    await withTimeout(page.close(), 10000, `close page (${label})`).catch(() => {});
  }
}

async function loginAs(context: import("playwright").BrowserContext, email: string, password: string) {
  const res = await withTimeout(
    context.request.post(`${BASE}/api/trpc/auth.loginWithEmail`, {
      data: { json: { email, password } },
      headers: { "content-type": "application/json" },
      timeout: 15000,
    }),
    17000,
    `login as ${email}`
  );
  if (!res.ok()) throw new Error(`login failed for ${email}: ${res.status()} ${await res.text()}`);
}

async function setLang(context: import("playwright").BrowserContext, lang: string) {
  // localStorage lives on the BrowserContext (per origin), shared by every
  // Page opened in it — so this only needs to run once per context, via
  // one throwaway page, not once per check.
  const page = await withTimeout(context.newPage(), 30000, "newPage (set language)");
  try {
    await withTimeout(
      page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 }),
      22000,
      "nav to set language"
    );
    // A brief settle before evaluating: right after domcontentloaded, the
    // SPA can still trigger its own client-side redirect (e.g. an
    // authenticated context landing on "/" bouncing to "/dashboard"),
    // which destroys the JS execution context mid-evaluate and surfaces as
    // "Execution context was destroyed" — reproduced for real without this
    // wait.
    await withTimeout(page.waitForTimeout(400), 2000, "settle before set language");
    await withTimeout(
      page.evaluate((l) => localStorage.setItem("nourix-language", l), lang),
      3000,
      "set language"
    );
  } finally {
    await withTimeout(page.close(), 10000, "close page (set language)").catch(() => {});
  }
}

const DB_FREE_PAGES: Array<{ label: string; path: string }> = [
  { label: "home", path: "/" },
  { label: "login", path: "/login" },
  { label: "register", path: "/register" },
  { label: "algorithm-lab", path: "/lab" },
  { label: "support", path: "/support" },
  { label: "404", path: "/this-page-does-not-exist-smoke-test" },
  { label: "course-catalog", path: "/courses" },
];

async function main() {
  // Diagnostic heartbeat, kept intentionally (not just for one investigation):
  // the admin phase hung for the full 45-minute watchdog on multiple runs
  // with none of the per-operation timeouts above ever firing. Adding this
  // heartbeat proved why: it stops printing too, at the exact same moment,
  // every time — meaning the whole Node event loop freezes outright (a
  // sandbox-level pause under sustained load), not one specific await stuck
  // on a promise that never settles. No per-operation timeout can rescue a
  // frozen event loop, which is why SMOKE_TEST_ROLES exists (see the header
  // comment) — splitting the run keeps each process well under whatever
  // wall-clock threshold triggers this. If the heartbeat ever stops
  // printing again, that confirms the same cause; if it keeps ticking while
  // checks stall, that would point to a real stuck await instead and is
  // worth re-investigating.
  const heartbeat = setInterval(() => {
    console.log(`  [heartbeat] ${new Date().toISOString()}`);
  }, 10000);
  console.log(`Browser smoke test — base URL: ${BASE}`);
  console.log(
    `Database fixtures: ${HAS_DB ? "enabled (DATABASE_URL set)" : "DISABLED — no DATABASE_URL, only DB-free pages will be checked"}\n`
  );

  let fx: Awaited<ReturnType<typeof seedFixtures>> | undefined;
  if (HAS_DB) {
    console.log(
      "Seeding fixtures (admin/teacher/learner accounts, a published course with a lesson/quiz/exam, an enrollment, a certificate)..."
    );
    fx = await seedFixtures();
    console.log(
      `  course slug: ${fx.courseSlug}, lessonId: ${fx.lessonId}, unitId: ${fx.unitId}, certificateId: ${fx.certificateId}\n`
    );
  }

  const launchOpts = process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {};
  let browser = await chromium.launch(launchOpts);

  try {
    // One context per role (not per viewport x lang — that would mean 12
    // contexts x up to 3 logins each = 36 logins, hammering the very rate
    // limiter this codebase's own security audit confirmed works). Each
    // check opens its own Page within the context (see checkPage's
    // comment for why) — cookies and localStorage still persist correctly
    // since both live on the context, not the page.
    if (process.env.SMOKE_TEST_SKIP_ANON !== "true") {
      console.log("--- Anonymous ---");
      const anonContext = await withTimeout(browser.newContext(), 30000, "newContext (anonymous)");
      await warmUpContext(anonContext);
      for (const lang of LANGS) {
        await setLang(anonContext, lang);
        for (const vp of VIEWPORTS) {
          for (const p of DB_FREE_PAGES) {
            await checkPage(anonContext, vp, p.label, lang, p.path);
          }
          if (fx) {
            await checkPage(anonContext, vp, "course-detail", lang, `/courses/${fx.courseSlug}`);
            await checkPage(anonContext, vp, "certificate-verify", lang, `/verify/certificate/${fx.certificateId}`);
            await checkPage(anonContext, vp, "lesson-anon", lang, `/lesson/${fx.lessonId}`, {
              expectLoginRedirect: true,
            });
            await checkPage(anonContext, vp, "dashboard-anon", lang, "/dashboard", {
              expectLoginRedirect: true,
            });
          }
        }
      }
      await withTimeout(anonContext.close(), 15000, "close anonContext").catch(() => {});
    } else {
      console.log("--- Anonymous: SKIPPED (SMOKE_TEST_SKIP_ANON=true) ---");
    }

    if (fx) {
      const roles: Array<{ label: string; email: string; pages: Array<{ label: string; path: string }> }> = [
        {
          label: "learner",
          email: `smoke-learner-${RUN}@nourix.test`,
          pages: [
            { label: "dashboard", path: "/dashboard" },
            { label: "lesson", path: `/lesson/${fx.lessonId}` },
            { label: "unit-quiz", path: `/quiz/${fx.unitId}` },
            { label: "final-exam", path: `/exam/${fx.courseId}` },
          ],
        },
        {
          label: "teacher",
          email: `smoke-teacher-${RUN}@nourix.test`,
          pages: [{ label: "teacher-dashboard", path: "/teacher" }],
        },
        {
          label: "admin",
          email: `smoke-admin-${RUN}@nourix.test`,
          pages: [{ label: "admin-dashboard", path: "/admin" }],
        },
      ];
      const roleFilter = process.env.SMOKE_TEST_ROLES?.split(",").map((r) => r.trim());
      const selectedRoles = roleFilter ? roles.filter((r) => roleFilter.includes(r.label)) : roles;
      if (roleFilter) {
        console.log(`(SMOKE_TEST_ROLES set — running only: ${selectedRoles.map((r) => r.label).join(", ")})`);
      }

      for (const role of selectedRoles) {
        console.log(`--- ${role.label} ---`);
        // A fresh browser process per role, not just a fresh context — cheap
        // insurance regardless of the process-freeze cause documented above
        // main(), and it does let learner and teacher run back-to-back
        // safely. It's not sufficient on its own for a full anon+3-role run
        // in one process, though — see SMOKE_TEST_ROLES in the header.
        try {
          await withTimeout(browser.close(), 15000, `close browser before ${role.label}`);
        } catch {
          // Best-effort — if the old browser process is itself unresponsive,
          // don't let that block starting a fresh one below.
        }
        console.log(`  [${role.label}] relaunching browser...`);
        browser = await withTimeout(chromium.launch(launchOpts), 30000, `relaunch browser (${role.label})`);
        console.log(`  [${role.label}] browser relaunched, opening context...`);
        const roleContext = await withTimeout(browser.newContext(), 30000, `newContext (${role.label})`);
        console.log(`  [${role.label}] context opened, warming up...`);
        await warmUpContext(roleContext);
        console.log(`  [${role.label}] warmed up, logging in...`);
        await loginAs(roleContext, role.email, fx.password);
        console.log(`  [${role.label}] logged in.`);
        for (const lang of LANGS) {
          await setLang(roleContext, lang);
          for (const vp of VIEWPORTS) {
            for (const p of role.pages) {
              await checkPage(roleContext, vp, p.label, lang, p.path);
            }
          }
        }
        await withTimeout(roleContext.close(), 15000, `close context (${role.label})`).catch(() => {});
      }
    }
  } finally {
    clearInterval(heartbeat);
    await withTimeout(browser.close(), 15000, "final browser close").catch(() => {});
    if (fx) {
      console.log("\nCleaning up fixtures...");
      await cleanupFixtures(fx);
    }
  }

  console.log(`\n${checksRun} page checks run across ${VIEWPORTS.length} viewports x ${LANGS.length} languages.`);
  if (failures.length) {
    console.log(`\n❌ ${failures.length} FAILURE(S):\n`);
    for (const f of failures) {
      console.log(`  [${f.viewport} / ${f.lang} / ${f.page}] ${f.reason}`);
    }
    process.exit(1);
  } else {
    console.log("\n✅ No failures.");
  }
}

// Hard overall watchdog: ~200 page checks (4 viewports x 3 languages x 14
// distinct page kinds, plus logins/fixture setup), each opening and
// closing its own Page — real overhead, but a fresh Page per check is
// what turned out to actually be reliable in this environment (see
// checkPage's header comment). A real full run in a resource-constrained
// sandbox measured ~25 minutes for the anonymous-pages portion alone; 45
// minutes covers the full matrix with headroom. If it's ever hit, something
// is stuck in a way the
// per-operation timeouts above didn't catch, and hanging silently forever
// (as an earlier version of this script did) is worse than exiting loudly.
withTimeout(main(), 45 * 60 * 1000, "entire smoke test run").catch((error) => {
  console.error("Smoke test crashed or timed out:", error);
  process.exit(1);
});
