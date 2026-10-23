import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db/shared";
import { createEmailUser } from "../db/usersAuth";
import { emailOpenId, hashPassword } from "../_core/emailAuth";
import { setPlatformSetting } from "../db/platformSettings";
import { tafawoqContentReviews, users, type User } from "../../drizzle/schema";
import { clearReviewCache } from "./platform/reviewPolicy";

/**
 * REAL DATABASE: content quality — a student reports a question they were
 * given (text taken from their own results), once per kind; the admin
 * reviews reports; an approval records the content fingerprint; in
 * commercial mode a lesson no teacher approved is closed to learners who had
 * not started it, and stays open to those who had. SKIPPED without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ctxFor(user: User): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: "10.7.0.1", get: () => "localhost" } as unknown as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe.skipIf(!HAS_DB || !!process.env.ANTHROPIC_API_KEY)("REAL DB — content quality", () => {
  let appRouter: typeof import("../routers").appRouter;
  let admin: User;

  async function fixtureUser(label: string, role: User["role"] = "learner"): Promise<User> {
    const db = (await getDb())!;
    const email = `${label}-${RUN}@quality.test`;
    const openId = emailOpenId(email);
    const result = await createEmailUser({ openId, email, name: label, passwordHash: await hashPassword("a-long-test-password") });
    if (!result.ok) throw new Error(`fixture ${email}`);
    if (role !== "learner") await db.update(users).set({ role }).where(eq(users.openId, openId));
    const [row] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return row;
  }

  async function subscribedStudent(label: string) {
    const user = await fixtureUser(label);
    const caller = appRouter.createCaller(ctxFor(user));
    await caller.tafawoq.register({ displayName: label, age: 17, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "sciences" });
    const request = await caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp" });
    await appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa });
    return { user, caller };
  }

  beforeAll(async () => {
    ({ appRouter } = await import("../routers"));
    admin = await fixtureUser("admin", "admin");
  });
  afterAll(async () => {
    await setPlatformSetting("bac.contentPolicy", "trial");
    clearReviewCache();
  });

  it("takes a report on a question the student answered, once per kind, and lets the admin handle it", async () => {
    const { caller } = await subscribedStudent("reporter");
    const placement = await caller.tafawoq.startPlacement({ lessonKey: "math-limits" });
    const result = await caller.tafawoq.submitAssessment({ assessmentId: placement.assessmentId, answers: placement.questions.map(question => ({ questionId: question.id, answer: "0" })) });
    const questionId = result.items[0].questionId;

    expect(await caller.tafawoq.flagQuestion({ questionId, kind: "error", note: "الجواب الصحيح خاطئ" })).toEqual({ created: true });
    expect(await caller.tafawoq.flagQuestion({ questionId, kind: "error" })).toEqual({ created: false });
    expect(await caller.tafawoq.flagQuestion({ questionId, kind: "unclear" })).toEqual({ created: true });
    // A question the student was never given is refused.
    await expect(caller.tafawoq.flagQuestion({ questionId: "not-a-question", kind: "error" })).rejects.toMatchObject({ message: "QUESTION_NOT_FOUND" });
    // Students cannot read the review list.
    await expect(caller.bacAdmin.contentFlags({ status: "open" })).rejects.toBeTruthy();

    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const open = (await adminCaller.bacAdmin.contentFlags({ status: "open" })).filter(row => row.questionId === questionId);
    expect(open).toHaveLength(2);
    expect(open[0].prompt).toBe(result.items[0].prompt); // from the student's results, not from the request
    await adminCaller.bacAdmin.setContentFlag({ id: open[0].id, status: "resolved", adminNote: "صُحّح" });
    expect((await adminCaller.bacAdmin.contentFlags({ status: "resolved" })).some(row => row.id === open[0].id)).toBe(true);
    expect(Array.isArray(await adminCaller.bacAdmin.missedQuestions())).toBe(true);
  });

  it("records what was approved; commercial mode closes unapproved lessons to new learners only", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const db = (await getDb())!;
    await db.delete(tafawoqContentReviews).where(eq(tafawoqContentReviews.lessonKey, "math-limits"));
    await adminCaller.bacAdmin.setContentReview({ lessonKey: "math-derivatives", status: "approved", reviewerName: "أستاذة الرياضيات", source: "البرنامج الرسمي" });
    const inventory = await adminCaller.bacAdmin.contentInventory();
    expect(inventory.states["math-derivatives"]).toBe("approved");
    expect(inventory.reviews.find(row => row.lessonKey === "math-derivatives")?.contentHash).toMatch(/^[0-9a-f]{32}$/);
    // The stored fingerprint no longer matching the content shows as "changed".
    await db.update(tafawoqContentReviews).set({ contentHash: "0".repeat(32) }).where(eq(tafawoqContentReviews.lessonKey, "math-derivatives"));
    clearReviewCache();
    expect((await adminCaller.bacAdmin.contentInventory()).states["math-derivatives"]).toBe("changed");

    const { caller: started } = await subscribedStudent("started");
    const placement = await started.tafawoq.startPlacement({ lessonKey: "math-limits" });
    await started.tafawoq.submitAssessment({ assessmentId: placement.assessmentId, answers: placement.questions.map(question => ({ questionId: question.id, answer: "0" })) });
    const { caller: newcomer } = await subscribedStudent("newcomer");

    expect((await started.tafawoq.workspace({ lessonKey: "math-limits" })).placed && (await started.tafawoq.workspace({ lessonKey: "math-limits" }))).toMatchObject({ review: "unreviewed" });
    await adminCaller.bacAdmin.setContentPolicy({ policy: "commercial" });
    try {
      await expect(newcomer.tafawoq.generatePractice({ lessonKey: "math-limits" })).rejects.toMatchObject({ message: "CONTENT_NOT_REVIEWED" });
      // Who had started keeps it.
      await expect(started.tafawoq.workspace({ lessonKey: "math-limits" })).resolves.toBeTruthy();
    } finally {
      await adminCaller.bacAdmin.setContentPolicy({ policy: "trial" });
    }
    await expect(newcomer.tafawoq.workspace({ lessonKey: "math-limits" })).resolves.toBeTruthy();
  });

  it("shows the owner's details only as set by the admin, and lists what blocks a commercial launch", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const { caller } = await subscribedStudent("legalreader");
    await adminCaller.bacAdmin.setLegalInfo({ ownerName: "", contactEmail: "", contactAddress: "", refundPolicy: "", hostingLocation: "", dataRetention: "", updatedOn: "" });
    const empty = await caller.tafawoq.legalInfo();
    expect(empty.missing).toHaveLength(7);
    expect(Object.values(empty.fields).every(value => value === null)).toBe(true);
    const readiness = await adminCaller.bacAdmin.launchReadiness();
    expect(readiness.checks.find(check => check.key === "legal_fields")?.status).toBe("commercial");
    expect(readiness.manual).toContain("lawyer_review");
    await expect(caller.bacAdmin.launchReadiness()).rejects.toBeTruthy();
    try {
      await adminCaller.bacAdmin.setLegalInfo({ ownerName: "اسم تجريبي للاختبار", contactEmail: "contact@example.test" });
      const partial = await caller.tafawoq.legalInfo();
      expect(partial.fields.ownerName).toBe("اسم تجريبي للاختبار");
      expect(partial.missing).not.toContain("ownerName");
      expect(partial.missing).toContain("refundPolicy");
    } finally {
      await adminCaller.bacAdmin.setLegalInfo({ ownerName: "", contactEmail: "" });
    }
  });
});
