import { beforeAll, describe, expect, it } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";
import { getDb } from "../../db/shared";
import { createEmailUser } from "../../db/usersAuth";
import { emailOpenId, hashPassword } from "../../_core/emailAuth";
import {
  tafawoqAssessments,
  tafawoqAttempts,
  tafawoqEvents,
  tafawoqStreamChanges,
  tafawoqStudents,
  tafawoqSubscriptions,
  users,
  type User,
} from "../../../drizzle/schema";
import type { BankQuestion } from "../curriculum";

/**
 * REAL DATABASE end-to-end run of the BAC platform: sign-up → locked
 * stream → second subject → subscription confirmed by an admin → placement
 * → daily plan → teacher → weekly test → mock BAC → bank → revision →
 * parent → admin. SKIPPED (never faked as passing) without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ctxFor(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

async function fixtureUser(label: string, role: User["role"] = "learner"): Promise<User> {
  const db = await getDb();
  const email = `${label}-${RUN}@bac.test`;
  const openId = emailOpenId(email);
  const result = await createEmailUser({ openId, email, name: label, passwordHash: await hashPassword("a-long-test-password") });
  if (!result.ok) throw new Error(`fixture ${email}`);
  if (role !== "learner") await db!.update(users).set({ role }).where(eq(users.openId, openId));
  const [row] = await db!.select().from(users).where(eq(users.openId, openId)).limit(1);
  return row;
}

async function stored(assessmentId: number): Promise<BankQuestion[]> {
  const db = await getDb();
  const [row] = await db!.select().from(tafawoqAssessments).where(eq(tafawoqAssessments.id, assessmentId));
  return JSON.parse(row.itemsJson);
}

/** Answers every question of a paper (ids "assessment~question") correctly or not. */
async function paperAnswers(questions: Array<{ id: string }>, correct: (index: number) => boolean) {
  const answers = [];
  for (const [index, question] of questions.entries()) {
    const [assessmentId, questionId] = question.id.split("~");
    const item = (await stored(Number(assessmentId))).find(entry => entry.id === questionId)!;
    answers.push({ questionId: question.id, answer: correct(index) ? item.answer : item.type === "mcq" ? item.options!.find(option => option !== item.answer)! : "0" });
  }
  return answers;
}

async function events(userId: number, event: string) {
  const db = await getDb();
  return db!.select().from(tafawoqEvents).where(and(eq(tafawoqEvents.userId, userId), eq(tafawoqEvents.event, event)));
}

describe.skipIf(!HAS_DB || !!process.env.ANTHROPIC_API_KEY)("REAL DB — Tafawoq BAC platform", () => {
  let admin: User;
  let sara: User; // sciences
  let yacine: User; // lettres, maths as second subject
  let parent: User;
  let otherParent: User;

  beforeAll(async () => {
    admin = await fixtureUser("admin", "admin");
    sara = await fixtureUser("sara");
    yacine = await fixtureUser("yacine");
    parent = await fixtureUser("parent", "parent");
    otherParent = await fixtureUser("other-parent", "parent");
  });

  it("creates an account through the real sign-up and logs it", async () => {
    const email = `signup-${RUN}@bac.test`;
    await appRouter.createCaller(ctxFor(null)).auth.registerWithEmail({ email, password: "Very-long-password-42", name: "Nadia" });
    const db = await getDb();
    const [row] = await db!.select().from(users).where(eq(users.email, email));
    expect(row.role).toBe("learner");
    expect(await events(row.id, "account_created")).toHaveLength(1);
    const failed = appRouter.createCaller(ctxFor(null)).auth.loginWithEmail({ email, password: "wrong-password-123" });
    await expect(failed).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const [failure] = await db!.select().from(tafawoqEvents).where(eq(tafawoqEvents.event, "login_failed")).orderBy(desc(tafawoqEvents.id)).limit(1);
    // Never the password, never the full address.
    expect(failure.detailsJson).not.toContain("wrong-password");
    expect(failure.detailsJson).not.toContain(email);
  });

  it("locks the chosen stream; other streams are refused by the API", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    await caller.tafawoq.register({ displayName: "سارة", age: 17, schoolLevel: "bac" });
    expect((await caller.bac.state()).step).toBe("stream");
    // No content before choosing a stream, even through the old endpoints.
    await expect(caller.tafawoq.startPlacement({ lessonKey: "math-limits" })).rejects.toMatchObject({ message: "STREAM_REQUIRED" });

    await caller.bac.chooseStream({ stream: "sciences" });
    await expect(caller.bac.chooseStream({ stream: "lettres" })).rejects.toMatchObject({ code: "FORBIDDEN", message: "STREAM_ALREADY_LOCKED" });
    // Editing the profile request by hand cannot change the stream either.
    await caller.tafawoq.register({ displayName: "سارة", age: 17, schoolLevel: "middle", stream: "lettres" });
    const db = await getDb();
    const [student] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, sara.id));
    expect(student.stream).toBe("sciences");
    expect(student.schoolLevel).toBe("bac");
    expect(await events(sara.id, "stream_chosen")).toHaveLength(1);
    expect((await events(sara.id, "stream_change_blocked")).length).toBeGreaterThanOrEqual(2);

    // Second subjects with lessons can be chosen; one outside the stream's options cannot.
    const state = await caller.bac.state();
    expect(state.step).toBe("second");
    if (state.step === "second") {
      expect(state.secondChoices.filter(choice => choice.available).map(choice => choice.key)).toContain("philosophy");
    }
    await expect(caller.bac.chooseSecondSubject({ subject: "math" })).rejects.toMatchObject({ message: "SUBJECT_NOT_ALLOWED" });
    await caller.bac.chooseSecondSubject({ subject: "philosophy" });
    expect((await caller.bac.state()).step).toBe("placement");

    // A lesson of the literary streams (arithmetic) is refused by the server.
    await expect(caller.tafawoq.startPlacement({ lessonKey: "math-arithmetic" })).rejects.toMatchObject({ code: "FORBIDDEN", message: "STREAM_LOCKED" });
    expect((await events(sara.id, "access_denied")).length).toBeGreaterThanOrEqual(1);
  });

  it("serves no lesson content until an admin confirms the payment", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    await expect(caller.tafawoq.generatePractice({ lessonKey: "math-limits" })).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });
    await expect(caller.bac.todayPlan()).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });

    const page = await caller.bac.subscription();
    expect(page.plans.find(plan => plan.key === "monthly")?.priceDa).toBe(3000);
    expect(page.gateway).toBe("manual");
    const request = await caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "baridimob", paymentReference: "REF-1" });
    expect(request.status).toBe("pending_payment");
    await expect(caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp" })).rejects.toMatchObject({ code: "CONFLICT" });
    // Still pending: nothing unlocked.
    await expect(caller.tafawoq.generatePractice({ lessonKey: "math-limits" })).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });
    // A student cannot confirm their own payment.
    await expect(caller.bacAdmin.confirmSubscription({ id: request.id })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const confirmed = await appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id });
    expect(confirmed.endsAt.getTime()).toBeGreaterThan(Date.now() + 27 * 86_400_000);
    await expect(appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id })).rejects.toMatchObject({ code: "CONFLICT" });
    const summary = (await caller.bac.subscription()).summary;
    expect(summary.active).toBe(true);
    expect(summary.daysLeft).toBeGreaterThanOrEqual(28);
  });

  it("runs the placement test across the student's subjects", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    const test = await caller.bac.startPlacement();
    expect(test.questions.length).toBeGreaterThanOrEqual(10);
    expect(test.questions.length).toBeLessThanOrEqual(20);
    expect(JSON.stringify(test.questions)).not.toContain('"answer"');
    // Easy → medium → hard.
    const difficulties = test.questions.map(question => question.difficulty);
    expect([...difficulties].sort()).toEqual(difficulties);
    // Re-opening returns the same paper.
    expect((await caller.bac.startPlacement()).examId).toBe(test.examId);

    const answers = await paperAnswers(test.questions, index => index % 2 === 0);
    const result = await caller.bac.submitPlacement({ examId: test.examId, answers });
    expect(result.subjects.map(entry => entry.subject).sort()).toEqual(["math", "natural_sciences", "philosophy", "physics"]);
    expect(["beginner", "needs_support", "intermediate", "good", "advanced"]).toContain(result.subjects[0].level);
    expect(result.review.length).toBeGreaterThan(0);
    expect(result.priorities.length).toBeGreaterThan(0);
    // Wrong answers carry a diagnosis, stored in the student's file.
    const wrong = result.items.find(item => !item.correct)!;
    expect(wrong.errorType).toBeTruthy();
    expect(wrong.rule).toBeTruthy();
    const db = await getDb();
    const [student] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, sara.id));
    const typed = await db!.select().from(tafawoqAttempts).where(and(eq(tafawoqAttempts.studentId, student.id), eq(tafawoqAttempts.correct, 0)));
    expect(typed.every(row => row.errorType !== null)).toBe(true);
    await expect(caller.bac.submitPlacement({ examId: test.examId, answers })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await caller.bac.state()).step).toBe("ready");
  });

  it("builds the daily plan and tracks its completion and the streak", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    const plan = await caller.bac.todayPlan();
    expect(plan.tasks.map(task => task.kind)).toEqual(expect.arrayContaining(["lesson", "exercises", "quiz"]));
    expect(plan.minutes).toBeGreaterThan(0);
    expect(plan.progress.done).toBe(0);
    // Same plan all day.
    expect((await caller.bac.todayPlan()).tasks.map(task => task.id)).toEqual(plan.tasks.map(task => task.id));

    await caller.bac.completePlanTask({ taskId: "lesson" });
    const exercises = await caller.bac.startPlanTask({ taskId: "exercises" });
    expect((await caller.bac.startPlanTask({ taskId: "exercises" })).assessmentId).toBe(exercises.assessmentId);
    const items = await stored(exercises.assessmentId);
    await caller.tafawoq.submitAssessment({
      assessmentId: exercises.assessmentId,
      answers: items.map(item => ({ questionId: item.id, answer: item.answer })),
    });
    const after = await caller.bac.todayPlan();
    expect(after.progress.done).toBe(2);
    expect(after.streak.current).toBe(1);
    expect(after.streak.activeToday).toBe(true);

    const dashboard = await caller.bac.dashboard();
    expect(dashboard.stream).toBe("sciences");
    expect(dashboard.subscription.active).toBe(true);
    expect(dashboard.subjects[0].subject).toBe("math");
    expect(dashboard.lastTest?.kind).toBe("placement");
    expect(dashboard.points).toBeGreaterThan(0);
    expect(dashboard.badges).toContain("first_test");
  });

  it("answers teacher quick requests in the fixed format", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    const simpler = await caller.bac.teacherAction({ lessonKey: "math-limits", action: "simpler", style: "darja" });
    expect(simpler.message.title).toBeTruthy();
    expect(simpler.message.formula.length).toBeGreaterThan(0);
    expect(simpler.message.question).toBeTruthy();
    const similar = await caller.bac.teacherAction({ lessonKey: "math-limits", action: "similar" });
    expect(similar.exercise?.questions).toHaveLength(1);
    const workspace = await caller.tafawoq.workspace({ lessonKey: "math-limits" });
    if (!workspace.placed) throw new Error("expected placed");
    const structured = workspace.messages.filter(message => message.structured);
    expect(structured.length).toBe(2);
    // The teacher of another stream's lesson is refused.
    await expect(caller.bac.teacherAction({ lessonKey: "math-arithmetic", action: "example" })).rejects.toMatchObject({ message: "STREAM_LOCKED" });
  });

  it("gives a weekly test out of 20 once a week", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    const weekly = await caller.bac.startWeekly();
    const total = Object.values(weekly.points).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(20);
    const answers = await paperAnswers(weekly.questions, () => true);
    const result = await caller.bac.submitWeekly({ examId: weekly.examId, answers });
    expect(result.score).toBeCloseTo(20);
    expect(result.correct).toBe(result.total);
    await expect(caller.bac.startWeekly()).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await caller.bac.weekly()).status).toBe("graded");
  });

  it("saves mock BAC answers while the paper is open", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    const exam = await caller.tafawoq.generateExam();
    const first = exam.exercises[0];
    await caller.bac.saveMockDraft({ examId: exam.examId, draft: { [first.assessmentId]: [{ questionId: first.questions[0].id, answer: "1" }] } });
    const reopened = await caller.bac.openMock();
    expect(reopened?.examId).toBe(exam.examId);
    expect(reopened?.draft?.[first.assessmentId]?.[0].answer).toBe("1");
    const papers = [];
    for (const exercise of exam.exercises) {
      const items = await stored(exercise.assessmentId);
      papers.push({ assessmentId: exercise.assessmentId, answers: items.map(item => ({ questionId: item.id, answer: item.answer, responseMs: 60_000 })) });
    }
    const marked = await caller.bac.submitMock({ examId: exam.examId, papers });
    expect(marked.score).toBe(20);
    expect(marked.time).toHaveLength(exam.exercises.length);
    expect(marked.officialMin).toBe(210);
    expect(await caller.bac.openMock()).toBeNull();
  });

  it("opens topics from the bank and a quick revision pack", async () => {
    const caller = appRouter.createCaller(ctxFor(sara));
    const bank = await caller.bac.bank();
    expect(bank.topics.every(topic => topic.year === null || typeof topic.year === "number")).toBe(true);
    const full = bank.topics.find(topic => topic.kind === "full")!;
    const opened = await caller.bac.openTopic({ topicId: full.id });
    if (opened.kind !== "generated") throw new Error("expected generated");
    expect(opened.questions.length).toBeGreaterThan(1);
    const retried = await caller.bac.openTopic({ topicId: full.id, seed: opened.topic.seed });
    if (retried.kind !== "generated") throw new Error("expected generated");
    expect(retried.questions.map(question => question.prompt)).toEqual(opened.questions.map(question => question.prompt));
    await caller.bac.saveTopic({ topicId: full.id, saved: true });
    expect((await caller.bac.bank()).saved).toContain(full.id);
    await expect(caller.bac.openTopic({ topicId: "gen:math-arithmetic:x" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    // An official topic published for the literary streams stays invisible to Sara.
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const created = await adminCaller.bacAdmin.createBankTopic({
      subject: "math",
      streams: ["lettres"],
      year: 2024,
      unit: "المتتاليات",
      difficulty: 2,
      questionType: "written",
      kind: "full",
      title: "موضوع",
      statement: "نص الموضوع",
      solution: "الحل النموذجي",
      methodology: null,
      points: 7,
      commonMistakes: null,
      published: true,
    });
    expect((await caller.bac.bank()).topics.some(topic => topic.id === `db:${created.id}`)).toBe(false);
    await expect(caller.bac.openTopic({ topicId: `db:${created.id}` })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const pack = await caller.bac.revisionPack();
    expect(pack.subjects[0].subject).toBe("math");
    expect(pack.subjects[0].lessons[0].flashcards.length).toBeGreaterThan(0);
  });

  it("handles the literary stream with maths as second subject, changed at most once", async () => {
    const caller = appRouter.createCaller(ctxFor(yacine));
    await caller.tafawoq.register({ displayName: "ياسين", age: 18, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "lettres" });
    const state = await caller.bac.state();
    expect(state.step).toBe("second");
    await expect(caller.tafawoq.startPlacement({ lessonKey: "math-sequences" })).rejects.toMatchObject({ message: "SUBJECT_NOT_ALLOWED" });
    // Not one of the stream's second-subject options.
    await expect(caller.bac.chooseSecondSubject({ subject: "physics" })).rejects.toMatchObject({ message: "SUBJECT_NOT_ALLOWED" });
    await caller.bac.chooseSecondSubject({ subject: "math" });
    expect((await caller.bac.state()).step).toBe("placement");
    await caller.tafawoq.startPlacement({ lessonKey: "math-sequences" });
    await expect(caller.tafawoq.startPlacement({ lessonKey: "math-complex" })).rejects.toMatchObject({ message: "STREAM_LOCKED" });

    // An admin moves the second subject (does not use the student's change)…
    const db = await getDb();
    const [student] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, yacine.id));
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await adminCaller.bacAdmin.setSecondSubject({ studentId: student.id, subject: "islamic" });
    // …the student moves back once, then a second change in the cycle is refused.
    // Islamic studies has no content yet: moving back to maths is the student's one change.
    await caller.bac.chooseSecondSubject({ subject: "math" });
    await adminCaller.bacAdmin.setSecondSubject({ studentId: student.id, subject: "islamic" });
    await expect(caller.bac.chooseSecondSubject({ subject: "math" })).rejects.toMatchObject({ message: "SECOND_SUBJECT_CHANGE_LIMIT" });
    // When the admin turns changes off, none is allowed.
    await adminCaller.bacAdmin.setSettings({ secondSubjectChange: false });
    await expect(caller.bac.chooseSecondSubject({ subject: "math" })).rejects.toMatchObject({ message: "SECOND_SUBJECT_CHANGE_DISABLED" });
    await adminCaller.bacAdmin.setSettings({ secondSubjectChange: true });
    await adminCaller.bacAdmin.setSecondSubject({ studentId: student.id, subject: "math" });
  });

  it("changes a stream only through an admin-approved request, logged", async () => {
    const caller = appRouter.createCaller(ctxFor(yacine));
    await expect(caller.bac.requestStreamChange({ toStream: "langues", toLanguage: "german", reason: "court" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // The languages stream needs its specialisation.
    await expect(caller.bac.requestStreamChange({ toStream: "langues", reason: "أريد التحويل إلى شعبة اللغات الأجنبية" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "LANGUAGE_REQUIRED",
    });
    const request = await caller.bac.requestStreamChange({ toStream: "langues", toLanguage: "german", reason: "أريد التحويل إلى شعبة اللغات الأجنبية" });
    await expect(caller.bac.requestStreamChange({ toStream: "sciences", reason: "طلب ثانٍ أثناء انتظار الأول" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller.bacAdmin.resolveStreamRequest({ requestId: request.id, approve: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await adminCaller.bacAdmin.resolveStreamRequest({ requestId: request.id, approve: true, note: "مقبول" });
    await expect(adminCaller.bacAdmin.resolveStreamRequest({ requestId: request.id, approve: false })).rejects.toMatchObject({ code: "CONFLICT" });
    const db = await getDb();
    const [student] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, yacine.id));
    expect(student.stream).toBe("langues");
    expect(student.thirdLanguage).toBe("german");
    expect(student.secondSubject).toBeNull();
    const state = await caller.bac.state();
    expect(state.student?.thirdLanguage).toBe("german");
    expect("content" in state && state.content.core.map(entry => entry.key)).toEqual(["french", "english", "german", "arabic"]);
    const [change] = await db!.select().from(tafawoqStreamChanges).where(eq(tafawoqStreamChanges.studentId, student.id));
    expect(change).toMatchObject({ studentName: "ياسين", fromStream: "lettres", toStream: "langues", fromLanguage: null, toLanguage: "german", adminId: admin.id });
    // Switching the specialisation inside the stream is a request too.
    const toSpanish = await caller.bac.requestStreamChange({ toStream: "langues", toLanguage: "spanish", reason: "أفضل دراسة الإسبانية بدل الألمانية" });
    await adminCaller.bacAdmin.resolveStreamRequest({ requestId: toSpanish.id, approve: true });
    const [after] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, yacine.id));
    expect(after.thirdLanguage).toBe("spanish");
    await expect(caller.bac.chooseThirdLanguage({ language: "italian" })).rejects.toMatchObject({ message: "LANGUAGE_ALREADY_LOCKED" });
    expect(change.reason).toContain("اللغات");
    expect(change.adminName).toBe("admin");
  });

  it("shows parents only their own linked children, chats only with consent", async () => {
    const student = appRouter.createCaller(ctxFor(sara));
    const code = await student.bac.createParentCode();
    const parentCaller = appRouter.createCaller(ctxFor(parent));
    expect(await parentCaller.parent.acceptInvite({ code: code.code })).toBe(true);
    const [child] = await parentCaller.bac.parentOverview();
    expect(child.bac?.stream).toBe("sciences");
    expect(child.bac?.subscription.status).toBe("active");
    expect(child.bac?.chats).toBeNull();
    await student.bac.setShareChats({ share: true });
    const [shared] = await parentCaller.bac.parentOverview();
    expect(shared.bac?.chats?.length).toBeGreaterThan(0);
    // Another parent sees nothing; a student cannot use the parent view.
    expect(await appRouter.createCaller(ctxFor(otherParent)).bac.parentOverview()).toEqual([]);
    await expect(student.bac.parentOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(parentCaller.bac.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps the admin panel for admins only", async () => {
    const student = appRouter.createCaller(ctxFor(sara));
    await expect(student.bacAdmin.students({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(ctxFor(parent)).bacAdmin.analytics()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(ctxFor(null)).bacAdmin.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const list = await adminCaller.bacAdmin.students({ search: "سارة" });
    expect(list.some(row => row.userId === sara.id && row.stream === "sciences")).toBe(true);
    const analytics = await adminCaller.bacAdmin.analytics();
    expect(analytics.subjects.find(row => row.subject === "math")?.answers).toBeGreaterThan(0);
    // Hiding a lesson closes it server-side.
    await adminCaller.bacAdmin.setContent({ key: "lesson:math-limits", enabled: false });
    await expect(student.tafawoq.generatePractice({ lessonKey: "math-limits" })).rejects.toMatchObject({ message: "SUBJECT_UNAVAILABLE" });
    await adminCaller.bacAdmin.setContent({ key: "lesson:math-limits", enabled: true });
  });

  it("closes everything when the subscription ends, and on suspension", async () => {
    const db = await getDb();
    await db!
      .update(tafawoqSubscriptions)
      .set({ endsAt: new Date(Date.now() - 60_000) })
      .where(eq(tafawoqSubscriptions.userId, sara.id));
    const student = appRouter.createCaller(ctxFor(sara));
    await expect(student.tafawoq.generatePractice({ lessonKey: "math-derivatives" })).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });
    await expect(student.bac.todayPlan()).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });
    expect((await student.bac.subscription()).summary.status).toBe("expired");
    // The dashboard still opens (to renew).
    expect((await student.bac.dashboard()).subscription.active).toBe(false);

    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await adminCaller.bacAdmin.setAccountStatus({ userId: sara.id, status: "suspended" });
    const [suspended] = await db!.select().from(users).where(eq(users.id, sara.id));
    await expect(appRouter.createCaller(ctxFor(suspended)).bac.dashboard()).rejects.toMatchObject({ message: "ACCOUNT_SUSPENDED" });
    await adminCaller.bacAdmin.setAccountStatus({ userId: sara.id, status: "active" });
    const events = await adminCaller.bacAdmin.events({ event: "access_denied" });
    expect(events.length).toBeGreaterThan(0);
  });
});
