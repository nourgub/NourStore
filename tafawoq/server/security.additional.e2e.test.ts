import { describe, it, expect, afterAll } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db/shared";
import { createEmailUser } from "./db/usersAuth";
import { hashPassword, emailOpenId } from "./_core/emailAuth";
import { issueCertificate } from "./db/certificates";
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
    subject: "math",
    stage: "middle",
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
      stage: "middle",
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
