// Content quality: students' reports on questions, the questions most often
// missed (a signal to look at, never proof a question is wrong), the lesson
// content fingerprint that makes an approval go stale when the content
// changes, and the policy for content no teacher has approved yet.
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { tafawoqAttempts, tafawoqContentFlags, users } from "../../../drizzle/schema";
import { getDb } from "../../db/shared";
import * as bac from "../../db/bacPlatform";
import { logAdminAction } from "../../db/adminAudit";
import { getLesson, LESSONS } from "../curriculum";
import { lessonContentHash } from "./reviewPolicy";

export { contentPolicy, lessonContentHash, reviewStates, type ReviewState } from "./reviewPolicy";
import * as tafawoq from "../service";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database not configured" });
  return db;
}

// ---------------------------------------------------------------------------
// Students' reports
// ---------------------------------------------------------------------------

export async function flagQuestion(userId: number, input: { questionId: string; kind: "error" | "unclear"; note: string | null }) {
  const student = await tafawoq.studentOrThrow(userId);
  // Only a question this student was given and answered: its text comes from their own results.
  const results = await bac.recentGradedResults(student.id, 200);
  let found: { lessonKey: string; prompt: string } | null = null;
  for (const row of results) {
    if (!row.resultJson) continue;
    const item = (JSON.parse(row.resultJson) as Array<{ questionId?: string; prompt?: string }>).find(entry => entry.questionId === input.questionId);
    if (item) {
      found = { lessonKey: row.lessonKey, prompt: (item.prompt ?? "").slice(0, 4000) };
      break;
    }
  }
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "QUESTION_NOT_FOUND" });
  const db = await requireDb();
  const [result] = await db
    .insert(tafawoqContentFlags)
    .ignore()
    .values({ userId, lessonKey: found.lessonKey, questionId: input.questionId, kind: input.kind, prompt: found.prompt, note: input.note?.trim() || null });
  return { created: (result as { affectedRows?: number }).affectedRows === 1 };
}

export async function adminFlags(status: "open" | "reviewing" | "resolved" | "dismissed") {
  const db = await requireDb();
  const rows = await db
    .select({
      id: tafawoqContentFlags.id,
      lessonKey: tafawoqContentFlags.lessonKey,
      questionId: tafawoqContentFlags.questionId,
      kind: tafawoqContentFlags.kind,
      prompt: tafawoqContentFlags.prompt,
      note: tafawoqContentFlags.note,
      status: tafawoqContentFlags.status,
      adminNote: tafawoqContentFlags.adminNote,
      createdAt: tafawoqContentFlags.createdAt,
      userName: users.name,
    })
    .from(tafawoqContentFlags)
    .leftJoin(users, eq(users.id, tafawoqContentFlags.userId))
    .where(eq(tafawoqContentFlags.status, status))
    .orderBy(desc(tafawoqContentFlags.createdAt))
    .limit(200);
  // Reports on the same question are grouped: how many students said so.
  const totals = await db
    .select({ questionId: tafawoqContentFlags.questionId, n: count() })
    .from(tafawoqContentFlags)
    .groupBy(tafawoqContentFlags.questionId);
  const byQuestion = new Map(totals.map(row => [row.questionId, Number(row.n)]));
  return rows.map(row => ({ ...row, lessonTitle: getLesson(row.lessonKey)?.title ?? row.lessonKey, reportsOnQuestion: byQuestion.get(row.questionId) ?? 1 }));
}

export async function adminSetFlag(adminId: number, input: { id: number; status: "reviewing" | "resolved" | "dismissed"; adminNote: string | null }) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqContentFlags)
    .set({
      status: input.status,
      adminNote: input.adminNote?.trim() || null,
      resolvedBy: input.status === "reviewing" ? null : adminId,
      resolvedAt: input.status === "reviewing" ? null : new Date(),
    })
    .where(eq(tafawoqContentFlags.id, input.id));
  if ((result as { affectedRows?: number }).affectedRows !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
  await logAdminAction({ actorId: adminId, action: "content_flag", targetType: "content_flag", targetId: String(input.id), details: { status: input.status } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Most-missed questions
// ---------------------------------------------------------------------------

/** Generated items "g-<generator>-<seed>" are grouped by their template. */
function templateOf(questionId: string): string {
  return questionId.startsWith("g-") ? questionId.replace(/-\d+$/, "") : questionId;
}

export const MIN_ATTEMPTS_FOR_STATS = 10;

export async function adminMissedQuestions() {
  const db = await requireDb();
  const rows = await db
    .select({
      lessonKey: tafawoqAttempts.lessonKey,
      questionId: tafawoqAttempts.questionId,
      attempts: count(),
      wrong: sql<number>`SUM(CASE WHEN ${tafawoqAttempts.correct} = 0 THEN 1 ELSE 0 END)`,
      students: sql<number>`COUNT(DISTINCT ${tafawoqAttempts.studentId})`,
    })
    .from(tafawoqAttempts)
    .groupBy(tafawoqAttempts.lessonKey, tafawoqAttempts.questionId);
  const grouped = new Map<string, { lessonKey: string; key: string; generated: boolean; attempts: number; wrong: number; students: number }>();
  for (const row of rows) {
    const key = templateOf(row.questionId);
    const entry = grouped.get(`${row.lessonKey}|${key}`) ?? { lessonKey: row.lessonKey, key, generated: key !== row.questionId, attempts: 0, wrong: 0, students: 0 };
    entry.attempts += Number(row.attempts);
    entry.wrong += Number(row.wrong);
    entry.students = Math.max(entry.students, Number(row.students));
    grouped.set(`${row.lessonKey}|${key}`, entry);
  }
  return Array.from(grouped.values())
    .filter(entry => entry.attempts >= MIN_ATTEMPTS_FOR_STATS)
    .map(entry => {
      const lesson = getLesson(entry.lessonKey);
      const bankItem = entry.generated ? undefined : lesson?.bank.find(question => question.id === entry.key);
      return {
        ...entry,
        wrongRate: entry.wrong / entry.attempts,
        lessonTitle: lesson?.title ?? entry.lessonKey,
        prompt: bankItem?.prompt ?? null,
      };
    })
    .sort((a, b) => b.wrongRate - a.wrongRate || b.attempts - a.attempts)
    .slice(0, 50);
}

export function allLessonHashes() {
  return LESSONS.map(lesson => ({ key: lesson.key, hash: lessonContentHash(lesson) }));
}
