import { and, asc, desc, eq, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  tafawoqAssessments,
  tafawoqAttempts,
  tafawoqExams,
  tafawoqLessons,
  tafawoqMessages,
  tafawoqSkillStates,
  tafawoqStudents,
  tafawoqVideos,
} from "../../drizzle/schema";
import type { BacStream, SchoolLevel, Tier } from "@shared/tafawoq";
import type { SkillState } from "../tafawoq/studentModel";
import { getDb } from "./shared";

// ---------------------------------------------------------------------------
// Tafawoq AI Teacher persistence. Unlike the read-mostly catalog helpers
// elsewhere in server/db/, nothing here can be meaningfully faked without a
// database (a student model with no stored evidence is not a student
// model), so a missing DATABASE_URL is reported honestly instead of
// returning empty results.
// ---------------------------------------------------------------------------

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Database not configured",
    });
  }
  return db;
}

export async function getTafawoqStudentByUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(tafawoqStudents)
    .where(eq(tafawoqStudents.userId, userId))
    .limit(1);
  return rows[0];
}

export async function upsertTafawoqStudent(input: {
  userId: number;
  displayName: string;
  age: number;
  schoolLevel: SchoolLevel;
  stream: BacStream | null;
  goals: string | null;
}) {
  const db = await requireDb();
  await db
    .insert(tafawoqStudents)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        displayName: input.displayName,
        age: input.age,
        schoolLevel: input.schoolLevel,
        stream: input.stream,
        goals: input.goals,
      },
    });
  return (await getTafawoqStudentByUser(input.userId))!;
}

export async function setTargetMark(studentId: number, targetMark: number) {
  const db = await requireDb();
  await db.update(tafawoqStudents).set({ targetMark }).where(eq(tafawoqStudents.id, studentId));
}

export async function getSkillStates(studentId: number, lessonKey: string): Promise<SkillState[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqSkillStates)
    .where(
      and(eq(tafawoqSkillStates.studentId, studentId), eq(tafawoqSkillStates.lessonKey, lessonKey))
    );
  return rows.map(row => ({
    skill: row.skillKey,
    pKnown: row.pKnown,
    attempts: row.attempts,
    correct: row.correct,
  }));
}

export async function getAllSkillStates(studentId: number) {
  const db = await requireDb();
  return db.select().from(tafawoqSkillStates).where(eq(tafawoqSkillStates.studentId, studentId));
}

export async function saveSkillStates(studentId: number, lessonKey: string, states: SkillState[]) {
  const db = await requireDb();
  for (const state of states) {
    await db
      .insert(tafawoqSkillStates)
      .values({
        studentId,
        lessonKey,
        skillKey: state.skill,
        pKnown: state.pKnown,
        attempts: state.attempts,
        correct: state.correct,
      })
      .onDuplicateKeyUpdate({
        set: { pKnown: state.pKnown, attempts: state.attempts, correct: state.correct },
      });
  }
}

export async function createAssessment(input: {
  studentId: number;
  lessonKey: string;
  kind: "placement" | "practice" | "oral";
  itemsJson: string;
  source: "ai" | "template" | "bank";
}) {
  const db = await requireDb();
  const result = await db.insert(tafawoqAssessments).values(input).$returningId();
  return result[0].id;
}

export async function createExam(input: { studentId: number; stream: string | null; paperJson: string }) {
  const db = await requireDb();
  const result = await db.insert(tafawoqExams).values(input).$returningId();
  return result[0].id;
}

export async function getExam(examId: number) {
  const db = await requireDb();
  const rows = await db.select().from(tafawoqExams).where(eq(tafawoqExams.id, examId)).limit(1);
  return rows[0];
}

/** Claims an open exam for marking; false if it was already marked. */
export async function claimExam(examId: number) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqExams)
    .set({ status: "graded", gradedAt: new Date() })
    .where(and(eq(tafawoqExams.id, examId), eq(tafawoqExams.status, "open")));
  return result.affectedRows === 1;
}

export async function saveExamResult(examId: number, score: number, resultJson: string) {
  const db = await requireDb();
  await db.update(tafawoqExams).set({ score, resultJson }).where(eq(tafawoqExams.id, examId));
}

/** Marked exams, newest first. */
export async function listMarkedExams(studentId: number, limit = 20) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqExams)
    .where(and(eq(tafawoqExams.studentId, studentId), eq(tafawoqExams.status, "graded")))
    .orderBy(desc(tafawoqExams.id))
    .limit(limit);
}

export async function getAssessment(assessmentId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqAssessments)
    .where(eq(tafawoqAssessments.id, assessmentId))
    .limit(1);
  return rows[0];
}

export async function getOpenAssessment(
  studentId: number,
  lessonKey: string,
  kind: "placement" | "practice" | "oral"
) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqAssessments)
    .where(
      and(
        eq(tafawoqAssessments.studentId, studentId),
        eq(tafawoqAssessments.lessonKey, lessonKey),
        eq(tafawoqAssessments.kind, kind),
        eq(tafawoqAssessments.status, "open")
      )
    )
    .orderBy(desc(tafawoqAssessments.id))
    .limit(1);
  return rows[0];
}

/**
 * Marks an open assessment graded. Returns false if it was already graded
 * (a double submit) so the caller never applies the same evidence twice.
 */
export async function markAssessmentGraded(input: {
  assessmentId: number;
  score: number;
  resultJson: string;
  masteryBefore: number;
  masteryAfter: number;
}) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqAssessments)
    .set({
      status: "graded",
      score: input.score,
      resultJson: input.resultJson,
      masteryBefore: input.masteryBefore,
      masteryAfter: input.masteryAfter,
      gradedAt: new Date(),
    })
    .where(
      and(eq(tafawoqAssessments.id, input.assessmentId), eq(tafawoqAssessments.status, "open"))
    );
  return result.affectedRows === 1;
}

export async function listGradedAssessments(studentId: number, lessonKey: string) {
  const db = await requireDb();
  return db
    .select({
      id: tafawoqAssessments.id,
      kind: tafawoqAssessments.kind,
      score: tafawoqAssessments.score,
      masteryBefore: tafawoqAssessments.masteryBefore,
      masteryAfter: tafawoqAssessments.masteryAfter,
      gradedAt: tafawoqAssessments.gradedAt,
    })
    .from(tafawoqAssessments)
    .where(
      and(
        eq(tafawoqAssessments.studentId, studentId),
        eq(tafawoqAssessments.lessonKey, lessonKey),
        eq(tafawoqAssessments.status, "graded")
      )
    )
    .orderBy(asc(tafawoqAssessments.id));
}

export async function recordAttempts(
  rows: Array<{
    studentId: number;
    assessmentId: number;
    lessonKey: string;
    skillKey: string;
    questionId: string;
    difficulty: number;
    correct: boolean;
    misconception: string | null;
    responseMs: number | null;
  }>
) {
  if (!rows.length) return;
  const db = await requireDb();
  await db.insert(tafawoqAttempts).values(
    rows.map(row => ({
      ...row,
      correct: row.correct ? 1 : 0,
      misconception: row.misconception?.slice(0, 200) ?? null,
    }))
  );
}

export async function getAttempts(studentId: number, lessonKey: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.studentId, studentId), eq(tafawoqAttempts.lessonKey, lessonKey)))
    .orderBy(asc(tafawoqAttempts.id));
  return rows.map(row => ({
    correct: row.correct === 1,
    difficulty: Math.min(3, Math.max(1, row.difficulty)) as 1 | 2 | 3,
    responseMs: row.responseMs,
    misconception: row.misconception,
  }));
}

export async function getAttemptedQuestionIds(studentId: number, lessonKey: string) {
  const db = await requireDb();
  const rows = await db
    .selectDistinct({ questionId: tafawoqAttempts.questionId })
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.studentId, studentId), eq(tafawoqAttempts.lessonKey, lessonKey)));
  return rows.map(row => row.questionId);
}

export async function saveLesson(input: {
  studentId: number;
  lessonKey: string;
  tier: Tier;
  contentJson: string;
  source: "ai" | "template";
}) {
  const db = await requireDb();
  const result = await db.insert(tafawoqLessons).values(input).$returningId();
  return result[0].id;
}

export async function getLatestLesson(studentId: number, lessonKey: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqLessons)
    .where(and(eq(tafawoqLessons.studentId, studentId), eq(tafawoqLessons.lessonKey, lessonKey)))
    .orderBy(desc(tafawoqLessons.id))
    .limit(1);
  return rows[0];
}

export async function saveVideo(input: {
  studentId: number;
  lessonKey: string;
  personalLessonId: number | null;
  scriptJson: string;
  source: "ai" | "template";
}) {
  const db = await requireDb();
  const result = await db.insert(tafawoqVideos).values(input).$returningId();
  return result[0].id;
}

export async function listVideos(studentId: number, lessonKey: string) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqVideos)
    .where(and(eq(tafawoqVideos.studentId, studentId), eq(tafawoqVideos.lessonKey, lessonKey)))
    .orderBy(desc(tafawoqVideos.id));
}

export async function addMessage(input: {
  studentId: number;
  lessonKey: string;
  role: "tutor" | "student";
  content: string;
  source: "ai" | "template" | null;
}) {
  const db = await requireDb();
  await db.insert(tafawoqMessages).values(input);
}

export async function listMessages(studentId: number, lessonKey: string) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqMessages)
    .where(and(eq(tafawoqMessages.studentId, studentId), eq(tafawoqMessages.lessonKey, lessonKey)))
    .orderBy(asc(tafawoqMessages.id));
}

/** Every answered question since `since`, across lessons — for weekly activity. */
export async function getActivitySince(studentId: number, since: Date) {
  const db = await requireDb();
  return db
    .select({
      lessonKey: tafawoqAttempts.lessonKey,
      correct: tafawoqAttempts.correct,
      responseMs: tafawoqAttempts.responseMs,
      createdAt: tafawoqAttempts.createdAt,
    })
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.studentId, studentId), gte(tafawoqAttempts.createdAt, since)));
}

export async function getLastActivity(studentId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ createdAt: tafawoqAttempts.createdAt })
    .from(tafawoqAttempts)
    .where(eq(tafawoqAttempts.studentId, studentId))
    .orderBy(desc(tafawoqAttempts.id))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}

/** Highest assessment id for a student so far (0 if none) — marks "after this point". */
export async function lastAssessmentId(studentId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ id: tafawoqAssessments.id })
    .from(tafawoqAssessments)
    .where(eq(tafawoqAssessments.studentId, studentId))
    .orderBy(desc(tafawoqAssessments.id))
    .limit(1);
  return rows[0]?.id ?? 0;
}
