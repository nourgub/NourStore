import { describe, it, expect, beforeAll } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db/shared";
import { createEmailUser } from "../db/usersAuth";
import { hashPassword, emailOpenId } from "../_core/emailAuth";
import { users, type User } from "../../drizzle/schema";
import { getLesson, type BankQuestion } from "./curriculum";
import { tafawoqAssessments } from "../../drizzle/schema";
import { DIALOGUE_DONE, dialogueState } from "./dialogue";

/**
 * REAL DATABASE end-to-end run of the Tafawoq AI Teacher loop:
 * register → placement → analysis → tutor → lesson → video → practice →
 * automatic correction → mastery update. Runs without ANTHROPIC_API_KEY,
 * so it exercises the template path deterministically; SKIPPED (not faked
 * as passing) when DATABASE_URL is not set — same convention as
 * server/realDb.e2e.test.ts.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ctxFor(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

/** The server-side copy of an assessment, answer keys included. */
async function storedItems(assessmentId: number): Promise<BankQuestion[]> {
  const db = await getDb();
  const [row] = await db!.select().from(tafawoqAssessments).where(eq(tafawoqAssessments.id, assessmentId));
  return JSON.parse(row.itemsJson);
}

async function latestOral(userId: number) {
  const db = await getDb();
  const { tafawoqStudents } = await import("../../drizzle/schema");
  const [student] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, userId));
  const rows = await db!
    .select()
    .from(tafawoqAssessments)
    .where(and(eq(tafawoqAssessments.studentId, student.id), eq(tafawoqAssessments.kind, "oral")))
    .orderBy(desc(tafawoqAssessments.id))
    .limit(1);
  return rows[0];
}

async function fixtureUser(label: string): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Expected a real database connection in this suite");
  const email = `${label}-${RUN}@tafawoq.test`;
  const openId = emailOpenId(email);
  const result = await createEmailUser({
    openId,
    email,
    name: label,
    passwordHash: await hashPassword("a-long-test-password"),
  });
  if (!result.ok) throw new Error(`Failed to create fixture user ${email}`);
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

describe.skipIf(!HAS_DB || !!process.env.ANTHROPIC_API_KEY)(
  "REAL DB — Tafawoq AI Teacher full loop",
  () => {
    const lesson = getLesson("math-derivatives")!;
    let ahmed: User;
    let other: User;

    beforeAll(async () => {
      ahmed = await fixtureUser("ahmed");
      other = await fixtureUser("other");
    });

    it("runs placement → analysis → lesson → video → practice → mastery update", async () => {
      const caller = appRouter.createCaller(ctxFor(ahmed));

      await expect(caller.tafawoq.startPlacement({ lessonKey: lesson.key })).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
      });
      await caller.tafawoq.register({ displayName: "أحمد", age: 15, schoolLevel: "bac" });

      const placement = await caller.tafawoq.startPlacement({ lessonKey: lesson.key });
      expect(placement.questions).toHaveLength(10);
      // The browser never receives the answer key.
      expect(JSON.stringify(placement.questions)).not.toContain('"answer"');
      // Re-opening returns the same open test instead of a new one.
      expect((await caller.tafawoq.startPlacement({ lessonKey: lesson.key })).assessmentId).toBe(
        placement.assessmentId
      );

      // Ahmed understands functions but consistently forgets to decrement
      // the exponent, and misses everything built on the power rule.
      const bank = await storedItems(placement.assessmentId);
      const answers = bank.map(item => {
        if (item.skill === "function_values" || item.skill === "derivative_meaning") {
          return { questionId: item.id, answer: item.answer, responseMs: 20_000 };
        }
        const misconceptionOption = Object.entries(item.distractors ?? {}).find(
          ([, key]) => key === "power_no_decrement"
        )?.[0];
        const wrong = misconceptionOption ?? item.options?.find(option => option !== item.answer) ?? "0";
        return { questionId: item.id, answer: wrong, responseMs: 60_000 };
      });
      const result = await caller.tafawoq.submitAssessment({
        assessmentId: placement.assessmentId,
        answers,
      });
      expect(result.kind).toBe("placement");
      expect(result.analysis.tier).toBe("weak");
      expect(result.analysis.strengths.map(skill => skill.key)).toContain("function_values");
      expect(result.analysis.weaknesses.map(skill => skill.key)).toContain("power_rule");
      expect(result.analysis.focusSkills.map(skill => skill.key)).toEqual(["power_rule"]);
      expect(result.errorsThisTime.map(error => error.key)).toContain("power_no_decrement");

      await expect(
        caller.tafawoq.submitAssessment({ assessmentId: placement.assessmentId, answers })
      ).rejects.toMatchObject({ code: "CONFLICT" });

      await caller.tafawoq.startTutor({ lessonKey: lesson.key });
      await caller.tafawoq.startTutor({ lessonKey: lesson.key }); // idempotent
      let workspace = await caller.tafawoq.workspace({ lessonKey: lesson.key });
      if (!workspace.placed) throw new Error("expected placed workspace");
      expect(workspace.messages).toHaveLength(1);
      expect(workspace.messages[0].content).toContain("أحمد");

      const reply = await caller.tafawoq.sendMessage({
        lessonKey: lesson.key,
        message: "لم أفهم مشتقة xⁿ",
      });
      expect(reply.reply).toContain("n·xⁿ⁻¹");

      const personal = await caller.tafawoq.generateLesson({ lessonKey: lesson.key });
      expect(personal.source).toBe("template");
      expect(personal.tier).toBe("weak");
      expect(personal.content.sections[0].skill).toBe("power_rule");

      const video = await caller.tafawoq.generateVideo({ lessonKey: lesson.key });
      expect(video.script.scenes[0].narration).toContain("مرحباً أحمد");

      const practice = await caller.tafawoq.generatePractice({ lessonKey: lesson.key });
      expect(practice.questions).toHaveLength(5);
      const keyed = await storedItems(practice.assessmentId);

      // Another student can't see or submit Ahmed's assessment.
      const intruder = appRouter.createCaller(ctxFor(other));
      await intruder.tafawoq.register({ displayName: "Other", age: 16, schoolLevel: "bac" });
      await expect(
        intruder.tafawoq.submitAssessment({ assessmentId: practice.assessmentId, answers: [] })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const practiceResult = await caller.tafawoq.submitAssessment({
        assessmentId: practice.assessmentId,
        answers: keyed.map(item => ({ questionId: item.id, answer: item.answer, responseMs: 25_000 })),
      });
      expect(practiceResult.score).toBe(100);
      expect(practiceResult.masteryAfter).toBeGreaterThan(practiceResult.masteryBefore);
      const power = practiceResult.skillChanges.find(change => change.skill === "power_rule")!;
      expect(power.after).toBeGreaterThan(power.before!);

      workspace = await caller.tafawoq.workspace({ lessonKey: lesson.key });
      if (!workspace.placed) throw new Error("expected placed workspace");
      expect(workspace.history.map(entry => entry.kind)).toEqual(["placement", "practice"]);
      expect(workspace.videos).toHaveLength(1);
      expect(workspace.messages.at(-1)!.content).toContain("صححت تمارينك");

      // Oral quiz: ask, get a question, answer it (as speech would arrive).
      const quiz = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "اختبرني" });
      expect(quiz.reply.startsWith("سؤال:")).toBe(true);
      const oral = await latestOral(ahmed.id);
      const [oralItem] = JSON.parse(oral.itemsJson) as BankQuestion[];
      // A lesson question while the quiz is pending is answered, not graded.
      const aside = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "اشرح لي القاعدة من فضلك" });
      expect(aside.reply.startsWith("✔")).toBe(false);
      expect((await latestOral(ahmed.id)).status).toBe("open");
      const spokenAnswer =
        oralItem.type === "mcq" ? `الجواب ${"أبجد"[oralItem.options!.indexOf(oralItem.answer)]}` : oralItem.answer;
      const graded = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: spokenAnswer });
      expect(graded.reply).toContain("صحيح");
      expect((await latestOral(ahmed.id)).status).toBe("graded");
      await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "اختبرني" });
      const givenUp = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "لا أعرف" });
      expect(givenUp.reply).toContain("الحل");

      // Phone-call lesson: intro → one oral question answered → summary.
      const call = await caller.tafawoq.callIntro({ lessonKey: lesson.key });
      expect(call.text).toContain("أحمد");
      expect(call.text).toContain("أسئلة صغيرة"); // the call teaches by dialogue
      await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "اختبرني" });
      const [callItem] = JSON.parse((await latestOral(ahmed.id)).itemsJson) as BankQuestion[];
      await caller.tafawoq.sendMessage({
        lessonKey: lesson.key,
        message: callItem.type === "mcq" ? `${"أبجد"[callItem.options!.indexOf(callItem.answer)]}` : callItem.answer,
      });
      const callEnd = await caller.tafawoq.callSummary({ lessonKey: lesson.key, afterId: call.afterId });
      expect(callEnd).toMatchObject({ correct: 1, total: 1 });
      expect(callEnd.text).toContain("أجبت إجابة صحيحة عن 1 من 1");

      // Teaching by dialogue: hint after a miss, a question pauses it, the
      // right answers lead to the rule. No assessment is created.
      let turn = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "علّمني بالحوار" });
      expect(turn.reply).toContain("❓ (1/");
      turn = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "123456" });
      expect(turn.reply).toContain("💡");
      turn = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: "أعطني مثالاً" });
      expect(turn.reply).toContain("لنعد إلى سؤالنا");
      for (let step = 0; step < 6 && !turn.reply.includes(DIALOGUE_DONE); step += 1) {
        const state = dialogueState(lesson, turn.reply)!;
        expect(state).not.toBeNull();
        turn = await caller.tafawoq.sendMessage({ lessonKey: lesson.key, message: state.dialogue.steps[state.index].answer });
      }
      expect(turn.reply).toContain(DIALOGUE_DONE);

      // A BAC-style problem: one statement, chained parts, graded part by part.
      const problem = await caller.tafawoq.generateProblem({ lessonKey: lesson.key });
      expect(problem.questions.length).toBeGreaterThanOrEqual(4);
      expect(problem.questions[0].problem?.statement).toContain("f(x)");
      expect(JSON.stringify(problem.questions)).not.toContain('"answer"');
      const parts = await storedItems(problem.assessmentId);
      const problemResult = await caller.tafawoq.submitAssessment({
        assessmentId: problem.assessmentId,
        answers: parts.map(item => ({ questionId: item.id, answer: item.answer })),
      });
      expect(problemResult).toMatchObject({ correct: parts.length, total: parts.length });

      const overview = await caller.tafawoq.overview();
      expect(overview.student?.displayName).toBe("أحمد");
      expect(overview.lessons.map(entry => entry.key)).toEqual([lesson.key]);

      // Parent report: Ahmed shares a one-time code, his parent redeems it.
      const { code } = await caller.tafawoq.createParentCode();
      const parent = await fixtureUser("parent");
      const strangerParent = await fixtureUser("stranger-parent");
      // Parents pick their own account type at sign-up; it can't be changed afterwards.
      await appRouter.createCaller(ctxFor(parent)).auth.chooseRole({ role: "parent" });
      await expect(
        appRouter.createCaller(ctxFor(parent)).auth.chooseRole({ role: "teacher" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await appRouter.createCaller(ctxFor(strangerParent)).auth.chooseRole({ role: "parent" });
      const db = await getDb();
      const [parentRow] = await db!.select().from(users).where(eq(users.id, parent.id));
      expect(parentRow.role).toBe("parent");
      const parentCaller = appRouter.createCaller(ctxFor(parentRow));
      await expect(parentCaller.parent.acceptInvite({ code })).resolves.toBe(true);
      await expect(parentCaller.parent.acceptInvite({ code })).resolves.toBe(false); // single use

      const [child] = await parentCaller.tafawoq.parentReport();
      expect(child.profile?.displayName).toBe("أحمد");
      expect(child.lessons.map(entry => entry.key)).toEqual([lesson.key]);
      expect(child.lessons[0].sessions).toBe(6); // placement, practice, 3 oral questions, 1 BAC problem
      expect(child.lessons[0].weaknesses.length).toBeGreaterThan(0);
      expect(child.week?.answered).toBe(18 + parts.length);
      expect(child.advice.some(item => item.kind === "focus" || item.kind === "progress")).toBe(true);

      // A parent sees only children who shared a code with them.
      const stranger = appRouter.createCaller(ctxFor({ ...strangerParent, role: "parent" }));
      await expect(stranger.tafawoq.parentReport()).resolves.toEqual([]);
      await expect(caller.tafawoq.parentReport()).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  }
);
