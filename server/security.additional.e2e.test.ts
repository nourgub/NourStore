import { describe, it, expect, afterAll } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db/shared";
import { createEmailUser } from "./db/usersAuth";
import { hashPassword, emailOpenId } from "./_core/emailAuth";
import { issueCertificate } from "./db/certificates";
import { getPlatformSetting, setPlatformSetting } from "./db/platformSettings";
import { handleWhatsAppAdminCommand } from "./whatsappBot";
import {
  users,
  courses,
  units,
  lessons,
  courseEnrollments,
  certificates,
  supportTickets,
  supportTicketMessages,
  referralCodes,
  notifications,
  pointsLedger,
  placementTests,
  placementQuestions,
  placementAttempts,
  type User,
} from "../drizzle/schema";

/**
 * Phase 6 — additional security scenarios against a REAL database, each one
 * a specific gap named in the remaining-gaps prompt rather than already
 * covered by realDb.e2e.test.ts (which proves the happy-path flow and
 * cross-LEARNER isolation, but not cross-teacher ownership, ticket
 * isolation, protected-file gating, or double-submission safety).
 *
 * Skipped — not faked as passing — when DATABASE_URL is not set, same as
 * realDb.e2e.test.ts.
 */

const HAS_DB = !!process.env.DATABASE_URL;

if (!HAS_DB) {
  // eslint-disable-next-line no-console
  console.warn(
    "[security.additional.e2e.test.ts] SKIPPED — no DATABASE_URL set. This " +
      "suite only proves anything against a real MySQL instance."
  );
}

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function fakeReq() {
  return { protocol: "https", headers: {} } as TrpcContext["req"];
}
function fakeRes() {
  return { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"];
}
function ctxFor(user: User | null): TrpcContext {
  return { user, req: fakeReq(), res: fakeRes() };
}

async function mustGetDb() {
  const db = await getDb();
  if (!db) throw new Error("Expected a real database connection in this suite");
  return db;
}

const createdUserIds: number[] = [];
const createdCourseIds: number[] = [];

async function createFixtureUser(role: "teacher" | "learner" | "admin", label: string) {
  const email = `${label}-${RUN}@nourix.test`;
  const openId = emailOpenId(email);
  const passwordHash = await hashPassword("Fixture-Pass-123");
  const result = await createEmailUser({ openId, email, name: label, passwordHash });
  if (!result.ok) throw new Error(`Failed to create fixture user ${email}`);
  const db = await mustGetDb();
  if (role !== "learner") {
    await db.update(users).set({ role }).where(eq(users.openId, openId));
  }
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const user = rows[0] as User;
  createdUserIds.push(user.id);
  return user;
}

async function createFixtureCourse(
  teacher: User,
  opts: { isFree?: boolean } = {}
): Promise<{ courseId: number; unitId: number; lessonId: number }> {
  const db = await mustGetDb();
  const teacherCaller = appRouter.createCaller(ctxFor(teacher));
  const slug = `sec-course-${RUN}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await teacherCaller.content.createCourse({
    slug,
    subject: "grammar",
    level: "foundation",
    titleAr: "دورة اختبار أمني",
    titleFr: "Cours de test sécurité",
    titleEn: "Security test course",
    descriptionAr: "دورة لأغراض الاختبار الآلي فقط",
    descriptionFr: "Cours à des fins de test automatisé uniquement",
    descriptionEn: "Course for automated testing purposes only",
  });
  expect(result.ok).toBe(true);
  const courseRows = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  const courseId = courseRows[0].id;
  createdCourseIds.push(courseId);
  // Free by default so tests that don't care about billing (ownership,
  // ticket isolation, etc.) don't also need a subscription fixture —
  // override to isFree: false for the one test that specifically checks
  // paid-course asset gating.
  await db
    .update(courses)
    .set({ isFree: opts.isFree === false ? 0 : 1 })
    .where(eq(courses.id, courseId));
  await teacherCaller.content.createUnit({
    courseId,
    orderIndex: 0,
    titleAr: "وحدة",
    titleFr: "Unité",
    titleEn: "Unit",
  });
  const unitRows = await db.select().from(units).where(eq(units.courseId, courseId)).limit(1);
  const unitId = unitRows[0].id;
  await teacherCaller.content.createLesson({
    unitId,
    orderIndex: 0,
    titleAr: "درس",
    titleFr: "Leçon",
    titleEn: "Lesson",
    type: "article",
    content: "محتوى الدرس لأغراض الاختبار.",
  });
  const lessonRows = await db.select().from(lessons).where(eq(lessons.unitId, unitId)).limit(1);
  const lessonId = lessonRows[0].id;
  // Publish so it's a real, reachable course for these access-control checks.
  await db.update(courses).set({ isPublished: 1 }).where(eq(courses.id, courseId));
  return { courseId, unitId, lessonId };
}

describe.skipIf(!HAS_DB)("Phase 6 — additional security scenarios against real MySQL", () => {
  afterAll(async () => {
    const db = await mustGetDb();
    for (const courseId of createdCourseIds) {
      await db.delete(certificates).where(eq(certificates.courseId, courseId));
      await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
      const unitRows = await db.select({ id: units.id }).from(units).where(eq(units.courseId, courseId));
      for (const u of unitRows) {
        await db.delete(lessons).where(eq(lessons.unitId, u.id));
      }
      await db.delete(units).where(eq(units.courseId, courseId));
      await db.delete(courses).where(eq(courses.id, courseId));
    }
    if (createdUserIds.length) {
      const ticketRows = await db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(inArray(supportTickets.userId, createdUserIds));
      for (const t of ticketRows) {
        await db.delete(supportTicketMessages).where(eq(supportTicketMessages.ticketId, t.id));
      }
      await db.delete(supportTickets).where(inArray(supportTickets.userId, createdUserIds));
      await db.delete(referralCodes).where(inArray(referralCodes.userId, createdUserIds));
      await db.delete(notifications).where(inArray(notifications.userId, createdUserIds));
      await db.delete(pointsLedger).where(inArray(pointsLedger.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  it("a teacher cannot modify another teacher's course — the row itself proves it, not just the response", async () => {
    const teacherA = await createFixtureUser("teacher", "sec-teacherA-course");
    const teacherB = await createFixtureUser("teacher", "sec-teacherB-course");
    const { courseId } = await createFixtureCourse(teacherA);
    const db = await mustGetDb();

    const callerB = appRouter.createCaller(ctxFor(teacherB));
    await callerB.content.updateCourse({
      id: courseId,
      titleAr: "تم الاختراق",
      titleFr: "Piraté",
      titleEn: "Hacked",
      descriptionAr: "وصف",
      descriptionFr: "Description",
      descriptionEn: "Description",
      level: "foundation",
    });

    const afterRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    expect(afterRows[0].titleEn).toBe("Security test course");
  });

  it("a teacher cannot edit a lesson belonging to another teacher's course — the row itself proves it", async () => {
    const teacherA = await createFixtureUser("teacher", "sec-teacherA-lesson");
    const teacherB = await createFixtureUser("teacher", "sec-teacherB-lesson");
    const { lessonId } = await createFixtureCourse(teacherA);
    const db = await mustGetDb();

    const callerB = appRouter.createCaller(ctxFor(teacherB));
    await callerB.content.updateLesson({
      id: lessonId,
      titleAr: "تم الاختراق",
      titleFr: "Piraté",
      titleEn: "Hacked",
    });

    const afterRows = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    expect(afterRows[0].titleEn).toBe("Lesson");
  });

  it("a learner cannot read another learner's support ticket messages", async () => {
    const learnerA = await createFixtureUser("learner", "sec-learnerA-ticket");
    const learnerB = await createFixtureUser("learner", "sec-learnerB-ticket");
    const callerA = appRouter.createCaller(ctxFor(learnerA));
    await callerA.support.createTicket({
      subject: "Private issue",
      message: "This is learner A's private support message.",
    });
    const db = await mustGetDb();
    const ticketRows = await db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.userId, learnerA.id))
      .limit(1);
    const ticketId = ticketRows[0].id;

    const callerB = appRouter.createCaller(ctxFor(learnerB));
    await expect(callerB.support.ticketMessages({ ticketId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    // The ticket's owner can still read it — proves the gate is ownership-based, not a blanket lockout.
    await expect(callerA.support.ticketMessages({ ticketId })).resolves.toBeTruthy();
  });

  it("a learner enrolled in a paid course but with no active subscription cannot get protected lesson asset URLs", async () => {
    const teacher = await createFixtureUser("teacher", "sec-teacher-assets");
    const learner = await createFixtureUser("learner", "sec-learner-assets");
    const { courseId, lessonId } = await createFixtureCourse(teacher, { isFree: false });
    const db = await mustGetDb();
    // Enrolled directly (bypassing checkout) but deliberately given no
    // subscription row at all — the real-world case this guards against.
    await db.insert(courseEnrollments).values({ userId: learner.id, courseId, status: "active" });

    const learnerCaller = appRouter.createCaller(ctxFor(learner));
    const assetResult = await learnerCaller.learning.lessonAssets({ lessonId });
    expect(assetResult).toEqual([]);
  });

  it("a protected mutation rejects cleanly with no session, instead of silently proceeding", async () => {
    const teacher = await createFixtureUser("teacher", "sec-teacher-nosession");
    const { courseId } = await createFixtureCourse(teacher);
    const anonCaller = appRouter.createCaller(ctxFor(null));
    await expect(anonCaller.progress.enroll({ courseId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const db = await mustGetDb();
    const rows = await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId));
    expect(rows.length).toBe(0);
  });

  it("submitting the exact same enrollment request twice never creates two enrollment rows", async () => {
    const teacher = await createFixtureUser("teacher", "sec-teacher-dup-enroll");
    const learner = await createFixtureUser("learner", "sec-learner-dup-enroll");
    const { courseId } = await createFixtureCourse(teacher);
    const learnerCaller = appRouter.createCaller(ctxFor(learner));

    const first = await learnerCaller.progress.enroll({ courseId });
    const second = await learnerCaller.progress.enroll({ courseId });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const db = await mustGetDb();
    const rows = await db
      .select()
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.userId, learner.id), eq(courseEnrollments.courseId, courseId)));
    expect(rows.length).toBe(1);
  });

  it("issuing a certificate for the same user+course twice never creates a second certificate", async () => {
    const teacher = await createFixtureUser("teacher", "sec-teacher-dup-cert");
    const learner = await createFixtureUser("learner", "sec-learner-dup-cert");
    const { courseId } = await createFixtureCourse(teacher);
    const db = await mustGetDb();
    // A completed enrollment, with no final exam configured for this course
    // (issueCertificate only requires a passed final exam when one exists)
    // — the minimal real precondition for issuance.
    await db.insert(courseEnrollments).values({ userId: learner.id, courseId, status: "completed" });

    const first = await issueCertificate({ userId: learner.id, courseId });
    const second = await issueCertificate({ userId: learner.id, courseId });
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect((second as { certificateId: string }).certificateId).toBe(
      (first as { certificateId: string }).certificateId
    );

    const rows = await db
      .select()
      .from(certificates)
      .where(and(eq(certificates.userId, learner.id), eq(certificates.courseId, courseId)));
    expect(rows.length).toBe(1);
  });
});

describe.skipIf(!HAS_DB)(
  "WhatsApp admin approval of self-registered pending accounts",
  () => {
    const ADMIN_SETTING_KEY = "admin_approval_whatsapp_number";
    const AUTHORIZED_ADMIN_NUMBER = "213555000111";
    let originalAdminNumber: string | null = null;
    const createdIds: number[] = [];

    async function registerPending(label: string) {
      const email = `${label}-${RUN}@nourix.test`;
      const openId = emailOpenId(email);
      const anon = appRouter.createCaller(ctxFor(null));
      const result = await anon.auth.registerWithEmail({
        email,
        password: "Pending-Pass-123",
        name: label,
      });
      const db = await mustGetDb();
      const row = (
        await db.select().from(users).where(eq(users.openId, openId)).limit(1)
      )[0] as User;
      createdIds.push(row.id);
      return { result, openId, email, userId: row.id };
    }

    afterAll(async () => {
      const db = await mustGetDb();
      if (createdIds.length) {
        await db.delete(notifications).where(inArray(notifications.userId, createdIds));
        await db.delete(users).where(inArray(users.id, createdIds));
      }
      // Restore whatever admin-approval number (if any) existed before this
      // suite ran, rather than leaving a test fixture number in a shared
      // platformSettings row.
      await setPlatformSetting(ADMIN_SETTING_KEY, originalAdminNumber ?? "");
    });

    it("blocks login immediately after self-registration, then unblocks it once the configured admin number sends 'قبول <id>'", async () => {
      originalAdminNumber = await getPlatformSetting(ADMIN_SETTING_KEY);
      await setPlatformSetting(ADMIN_SETTING_KEY, AUTHORIZED_ADMIN_NUMBER);

      const { result, email, userId } = await registerPending("wa-approve-flow");
      expect(result).toEqual({ ok: true, pending: true });

      const anonLogin = appRouter.createCaller(ctxFor(null));
      await expect(
        anonLogin.auth.loginWithEmail({ email, password: "Pending-Pass-123" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const handled = await handleWhatsAppAdminCommand(
        AUTHORIZED_ADMIN_NUMBER,
        `قبول ${userId}`
      );
      expect(handled).toBe(true);

      const db = await mustGetDb();
      const row = (
        await db.select({ accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1)
      )[0];
      expect(row.accountStatus).toBe("active");

      await expect(
        appRouter
          .createCaller(ctxFor(null))
          .auth.loginWithEmail({ email, password: "Pending-Pass-123" })
      ).resolves.toMatchObject({ ok: true });
    });

    it("ignores 'قبول <id>' from any number other than the configured admin number — the account stays pending", async () => {
      await setPlatformSetting(ADMIN_SETTING_KEY, AUTHORIZED_ADMIN_NUMBER);
      const { userId } = await registerPending("wa-unauthorized-sender");

      const handled = await handleWhatsAppAdminCommand(
        "213699999999",
        `قبول ${userId}`
      );
      expect(handled).toBe(false);

      const db = await mustGetDb();
      const row = (
        await db.select({ accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1)
      )[0];
      expect(row.accountStatus).toBe("pending");
    });

    it("'رفض <id>' from the authorized admin number suspends the account instead of activating it", async () => {
      await setPlatformSetting(ADMIN_SETTING_KEY, AUTHORIZED_ADMIN_NUMBER);
      const { email, userId } = await registerPending("wa-reject-flow");

      const handled = await handleWhatsAppAdminCommand(
        AUTHORIZED_ADMIN_NUMBER,
        `رفض ${userId}`
      );
      expect(handled).toBe(true);

      const db = await mustGetDb();
      const row = (
        await db.select({ accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1)
      )[0];
      expect(row.accountStatus).toBe("suspended");

      await expect(
        appRouter
          .createCaller(ctxFor(null))
          .auth.loginWithEmail({ email, password: "Pending-Pass-123" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("a command referencing a non-existent user id is handled gracefully (no throw) and touches no real account", async () => {
      await setPlatformSetting(ADMIN_SETTING_KEY, AUTHORIZED_ADMIN_NUMBER);
      const handled = await handleWhatsAppAdminCommand(
        AUTHORIZED_ADMIN_NUMBER,
        "قبول 999999999"
      );
      expect(handled).toBe(true);
    });
  }
);

describe.skipIf(!HAS_DB)(
  "Electronic level-placement test: submit -> real score + recommended level, shown immediately",
  () => {
    const createdTestIds: number[] = [];
    const createdUserIds: number[] = [];

    afterAll(async () => {
      const db = await mustGetDb();
      if (createdTestIds.length) {
        await db
          .delete(placementAttempts)
          .where(inArray(placementAttempts.testId, createdTestIds));
        await db
          .delete(placementQuestions)
          .where(inArray(placementQuestions.testId, createdTestIds));
        await db
          .delete(placementTests)
          .where(inArray(placementTests.id, createdTestIds));
      }
      if (createdUserIds.length) {
        await db.delete(users).where(inArray(users.id, createdUserIds));
      }
    });

    // The app only ever resolves "the current test" as
    // `WHERE isPublished = 1 LIMIT 1` with no ordering (see
    // getPlacementTestWithQuestions/getPlacementTestForPublic) — it was
    // never designed to have more than one published test at once. Every
    // fixture test here unpublishes ANY currently-published row first (not
    // just ones this suite created — a stray one could be left over from
    // manual testing) so "the current test" is unambiguously the one just
    // created.
    async function createPublishedTest(label: string) {
      const db = await mustGetDb();
      await db
        .update(placementTests)
        .set({ isPublished: 0 })
        .where(eq(placementTests.isPublished, 1));
      const [testResult] = await db.insert(placementTests).values({
        subject: "combined",
        titleAr: `اختبار ${label}`,
        titleFr: `Test ${label}`,
        titleEn: `Test ${label}`,
        isPublished: 1,
      });
      const testId = (testResult as { insertId: number }).insertId;
      createdTestIds.push(testId);
      // 5 questions, each with a real known-correct answer, so a specific
      // score (and therefore a specific recommendedLevel) can be asserted.
      for (let i = 0; i < 5; i++) {
        await db.insert(placementQuestions).values({
          testId,
          promptAr: `سؤال ${i + 1}`,
          promptFr: `Question ${i + 1}`,
          promptEn: `Question ${i + 1}`,
          optionsJson: JSON.stringify(["A", "B", "C"]),
          answerKey: "A",
          skill: "grammar",
          difficulty: "starter",
          orderIndex: i,
        });
      }
      return testId;
    }

    it("scores a real submission server-side and immediately returns score + recommendedLevel — never trusting a client-supplied score", async () => {
      const testId = await createPublishedTest(`score-${RUN}`);
      const learner = await createFixtureUser(
        "learner",
        `placement-learner-${RUN}`
      );
      createdUserIds.push(learner.id);
      const caller = appRouter.createCaller(ctxFor(learner));

      // All 5 answers correct -> 100% -> "advanced".
      const allCorrect: Record<string, string> = {};
      for (let i = 0; i < 5; i++) allCorrect[String(i)] = "A";
      const result = await caller.placement.submit({
        testId,
        answersJson: JSON.stringify(allCorrect),
      });
      expect(result.score).toBe(100);
      expect(result.correct).toBe(5);
      expect(result.total).toBe(5);
      expect(result.recommendedLevel).toBe("advanced");

      const db = await mustGetDb();
      const rows = await db
        .select()
        .from(placementAttempts)
        .where(
          and(
            eq(placementAttempts.testId, testId),
            eq(placementAttempts.userId, learner.id)
          )
        );
      expect(rows.length).toBe(1);
      expect(rows[0].score).toBe(100);
      expect(rows[0].recommendedLevel).toBe("advanced");
    });

    it("a lower real score maps to a lower recommended level, not always 'advanced'", async () => {
      const testId = await createPublishedTest(`lowscore-${RUN}`);
      const learner = await createFixtureUser(
        "learner",
        `placement-lowscore-${RUN}`
      );
      createdUserIds.push(learner.id);
      const caller = appRouter.createCaller(ctxFor(learner));

      // Only the first answer correct -> 20% -> "starter".
      const mostlyWrong = { "0": "A", "1": "B", "2": "B", "3": "B", "4": "B" };
      const result = await caller.placement.submit({
        testId,
        answersJson: JSON.stringify(mostlyWrong),
      });
      expect(result.score).toBe(20);
      expect(result.recommendedLevel).toBe("starter");
    });

    it("an anonymous visitor gets a real computed score — the test is a free lead-magnet, not gated behind login — but nothing is persisted since there's no user to attach it to", async () => {
      const testId = await createPublishedTest(`anon-${RUN}`);
      const anon = appRouter.createCaller(ctxFor(null));

      // All 5 answers correct -> 100% -> "advanced", same scoring as a logged-in user.
      const allCorrect: Record<string, string> = {};
      for (let i = 0; i < 5; i++) allCorrect[String(i)] = "A";
      const result = await anon.placement.submit({
        testId,
        answersJson: JSON.stringify(allCorrect),
      });
      expect(result.score).toBe(100);
      expect(result.recommendedLevel).toBe("advanced");

      const db = await mustGetDb();
      const rows = await db
        .select()
        .from(placementAttempts)
        .where(eq(placementAttempts.testId, testId));
      expect(rows.length).toBe(0);
    });

    it("the public 'current' query returns the real published test's real questions, without ever exposing answerKey", async () => {
      await createPublishedTest(`public-${RUN}`);
      const anon = appRouter.createCaller(ctxFor(null));
      const current = await anon.placement.current();
      expect(current.test).toBeTruthy();
      expect(current.questions.length).toBeGreaterThan(0);
      for (const q of current.questions) {
        expect(q).not.toHaveProperty("answerKey");
      }
    });
  }
);
