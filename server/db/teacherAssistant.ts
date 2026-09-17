// Storage for what the teacher assistant (Claude) produces: lesson plans,
// exam papers, model solutions + grading scales, and graded student papers.
//
// Three rules hold across every function here:
//
//   1. Ownership is scoped, never assumed. Every read, update and delete is
//      filtered by teacherId (an admin bypasses, same as everywhere else in
//      this codebase) — there is no unscoped query in this file, so one
//      teacher cannot reach another's exam paper by guessing an id.
//   2. A missing database degrades honestly. getDb() returns null when
//      DATABASE_URL is unset; every save then returns null and the caller
//      still hands the teacher their generated text, unsaved. The assistant
//      keeps working on a DB-less deployment instead of erroring.
//   3. A mark a student receives is typed by a human. Grades are stored as
//      "draft" with finalPoints NULL; markPaperGradeReviewed is the only
//      thing that sets a mark, and only then is anyone notified.

import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import type { MySqlColumn } from "drizzle-orm/mysql-core";
import {
  assistantUsage,
  courseEnrollments,
  courses,
  examPapers,
  examSolutionSets,
  lessonPlans,
  paperGrades,
  parentLinks,
  teacherReferences,
  users,
} from "../../drizzle/schema";
import { getDb } from "./shared";
import { createNotification } from "./notifications";

export type TeacherRole = "teacher" | "institution" | "admin";

/** An admin sees everything; everyone else sees only their own rows. */
function ownerFilter(
  column: MySqlColumn,
  teacherId: number,
  role: TeacherRole
) {
  return role === "admin" ? undefined : eq(column, teacherId);
}

function insertedId(result: unknown): number {
  return (result as { insertId: number }).insertId;
}

// ---------------------------------------------------------------------------
// Module 1 — lesson plans
// ---------------------------------------------------------------------------

export async function saveLessonPlan(input: {
  teacherId: number;
  level: string;
  topic: string;
  durationMinutes: number;
  priorKnowledge?: string;
  content: string;
  model: string;
  truncated: boolean;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(lessonPlans).values({
    teacherId: input.teacherId,
    level: input.level,
    topic: input.topic,
    durationMinutes: input.durationMinutes,
    priorKnowledge: input.priorKnowledge ?? null,
    content: input.content,
    model: input.model,
    truncated: input.truncated,
  });
  return insertedId(result);
}

/** Metadata only — the bodies are MEDIUMTEXT, fetched one at a time by getLessonPlan. */
export async function listLessonPlans(
  teacherId: number,
  role: TeacherRole,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: lessonPlans.id,
      level: lessonPlans.level,
      topic: lessonPlans.topic,
      durationMinutes: lessonPlans.durationMinutes,
      truncated: lessonPlans.truncated,
      createdAt: lessonPlans.createdAt,
    })
    .from(lessonPlans)
    .where(ownerFilter(lessonPlans.teacherId, teacherId, role))
    .orderBy(desc(lessonPlans.createdAt))
    .limit(limit);
}

export async function getLessonPlan(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(lessonPlans)
    .where(
      role === "admin"
        ? eq(lessonPlans.id, id)
        : and(eq(lessonPlans.id, id), eq(lessonPlans.teacherId, teacherId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteLessonPlan(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return false;
  const existing = await getLessonPlan(id, teacherId, role);
  if (!existing) return false;
  await db.delete(lessonPlans).where(eq(lessonPlans.id, id));
  return true;
}

// ---------------------------------------------------------------------------
// Module 2 — exam papers
// ---------------------------------------------------------------------------

export async function saveExamPaper(input: {
  teacherId: number;
  level: string;
  topics: string[];
  durationMinutes: number;
  totalPoints: number;
  content: string;
  model: string;
  truncated: boolean;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(examPapers).values({
    teacherId: input.teacherId,
    level: input.level,
    topics: input.topics.join("\n"),
    durationMinutes: input.durationMinutes,
    totalPoints: input.totalPoints,
    content: input.content,
    model: input.model,
    truncated: input.truncated,
  });
  return insertedId(result);
}

export async function listExamPapers(
  teacherId: number,
  role: TeacherRole,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: examPapers.id,
      level: examPapers.level,
      topics: examPapers.topics,
      durationMinutes: examPapers.durationMinutes,
      totalPoints: examPapers.totalPoints,
      truncated: examPapers.truncated,
      createdAt: examPapers.createdAt,
    })
    .from(examPapers)
    .where(ownerFilter(examPapers.teacherId, teacherId, role))
    .orderBy(desc(examPapers.createdAt))
    .limit(limit);
}

export async function getExamPaper(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(examPapers)
    .where(
      role === "admin"
        ? eq(examPapers.id, id)
        : and(eq(examPapers.id, id), eq(examPapers.teacherId, teacherId))
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Deleting a paper keeps any model solution made from it: the solution set
 * carries its own copy of the exam text, so it stays usable — only the link
 * back to the deleted paper is cleared.
 */
export async function deleteExamPaper(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return false;
  const existing = await getExamPaper(id, teacherId, role);
  if (!existing) return false;
  await db
    .update(examSolutionSets)
    .set({ examPaperId: null })
    .where(eq(examSolutionSets.examPaperId, id));
  await db.delete(examPapers).where(eq(examPapers.id, id));
  return true;
}

// ---------------------------------------------------------------------------
// Module 3 — model solutions + grading scales
// ---------------------------------------------------------------------------

export async function saveExamSolutionSet(input: {
  teacherId: number;
  examPaperId?: number | null;
  examText: string;
  solutionsJson: string;
  parseError?: string | null;
  questionCount?: number | null;
  scaleTotalPoints?: number | null;
  model: string;
  truncated: boolean;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(examSolutionSets).values({
    teacherId: input.teacherId,
    examPaperId: input.examPaperId ?? null,
    examText: input.examText,
    solutionsJson: input.solutionsJson,
    parseError: input.parseError ?? null,
    questionCount: input.questionCount ?? null,
    scaleTotalPoints: input.scaleTotalPoints ?? null,
    model: input.model,
    truncated: input.truncated,
  });
  return insertedId(result);
}

export async function listExamSolutionSets(
  teacherId: number,
  role: TeacherRole,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: examSolutionSets.id,
      examPaperId: examSolutionSets.examPaperId,
      questionCount: examSolutionSets.questionCount,
      scaleTotalPoints: examSolutionSets.scaleTotalPoints,
      parseError: examSolutionSets.parseError,
      truncated: examSolutionSets.truncated,
      createdAt: examSolutionSets.createdAt,
    })
    .from(examSolutionSets)
    .where(ownerFilter(examSolutionSets.teacherId, teacherId, role))
    .orderBy(desc(examSolutionSets.createdAt))
    .limit(limit);
}

export async function getExamSolutionSet(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(examSolutionSets)
    .where(
      role === "admin"
        ? eq(examSolutionSets.id, id)
        : and(
            eq(examSolutionSets.id, id),
            eq(examSolutionSets.teacherId, teacherId)
          )
    )
    .limit(1);
  return rows[0] ?? null;
}

export type DeleteSolutionSetResult =
  | { ok: true; deletedDraftGrades: number }
  | { ok: false; reason: "not_found" | "has_reviewed_grades" };

/**
 * Refuses to delete a grading scale that reviewed marks were issued against:
 * those marks are a student's record, and the scale is the evidence behind
 * them. Draft grades (never seen by anyone but this teacher) go with it.
 */
export async function deleteExamSolutionSet(
  id: number,
  teacherId: number,
  role: TeacherRole
): Promise<DeleteSolutionSetResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const existing = await getExamSolutionSet(id, teacherId, role);
  if (!existing) return { ok: false, reason: "not_found" };
  const reviewed = await db
    .select({ id: paperGrades.id })
    .from(paperGrades)
    .where(
      and(eq(paperGrades.solutionSetId, id), eq(paperGrades.status, "reviewed"))
    )
    .limit(1);
  if (reviewed.length) return { ok: false, reason: "has_reviewed_grades" };
  const drafts = await db
    .select({ id: paperGrades.id })
    .from(paperGrades)
    .where(eq(paperGrades.solutionSetId, id));
  await db.delete(paperGrades).where(eq(paperGrades.solutionSetId, id));
  await db.delete(examSolutionSets).where(eq(examSolutionSets.id, id));
  return { ok: true, deletedDraftGrades: drafts.length };
}

// ---------------------------------------------------------------------------
// Module 4 — graded student papers
// ---------------------------------------------------------------------------

/**
 * A teacher may only attach a grade to a learner genuinely enrolled in one of
 * their own courses — the same ownership check every other teacher-authoring
 * endpoint here uses (courses.ownerId, admin bypasses).
 */
export async function teacherOwnsLearner(
  teacherId: number,
  role: TeacherRole,
  learnerId: number
): Promise<boolean> {
  if (role === "admin") return true;
  const db = await getDb();
  if (!db) return false;
  const owned = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .where(
      and(
        eq(courseEnrollments.userId, learnerId),
        eq(courses.ownerId, teacherId)
      )
    )
    .limit(1);
  return owned.length > 0;
}

export async function savePaperGrade(input: {
  teacherId: number;
  solutionSetId: number;
  learnerId?: number | null;
  studentLabel?: string | null;
  answerText: string;
  report: string;
  model: string;
  truncated: boolean;
  maxPoints?: number | null;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(paperGrades).values({
    teacherId: input.teacherId,
    solutionSetId: input.solutionSetId,
    learnerId: input.learnerId ?? null,
    studentLabel: input.studentLabel ?? null,
    answerText: input.answerText,
    report: input.report,
    model: input.model,
    truncated: input.truncated,
    maxPoints: input.maxPoints ?? null,
    // Always a draft: no mark exists until a teacher types one.
    status: "draft",
  });
  return insertedId(result);
}

export async function listPaperGrades(
  teacherId: number,
  role: TeacherRole,
  options: { solutionSetId?: number; limit?: number } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const owner = ownerFilter(paperGrades.teacherId, teacherId, role);
  const bySet = options.solutionSetId
    ? eq(paperGrades.solutionSetId, options.solutionSetId)
    : undefined;
  return db
    .select({
      id: paperGrades.id,
      solutionSetId: paperGrades.solutionSetId,
      learnerId: paperGrades.learnerId,
      learnerName: users.name,
      studentLabel: paperGrades.studentLabel,
      status: paperGrades.status,
      finalPoints: paperGrades.finalPoints,
      maxPoints: paperGrades.maxPoints,
      truncated: paperGrades.truncated,
      reviewedAt: paperGrades.reviewedAt,
      createdAt: paperGrades.createdAt,
    })
    .from(paperGrades)
    .leftJoin(users, eq(users.id, paperGrades.learnerId))
    .where(owner && bySet ? and(owner, bySet) : (owner ?? bySet))
    .orderBy(desc(paperGrades.createdAt))
    .limit(options.limit ?? 50);
}

export async function getPaperGrade(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(paperGrades)
    .where(
      role === "admin"
        ? eq(paperGrades.id, id)
        : and(eq(paperGrades.id, id), eq(paperGrades.teacherId, teacherId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deletePaperGrade(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return false;
  const existing = await getPaperGrade(id, teacherId, role);
  if (!existing) return false;
  await db.delete(paperGrades).where(eq(paperGrades.id, id));
  return true;
}

export type ReviewGradeResult =
  | {
      ok: true;
      notified: number;
      /** What the row held before this review — the caller writes the audit record. */
      previous: {
        report: string;
        model: string;
        learnerId: number | null;
        finalPoints: number | null;
        alreadyReviewed: boolean;
      };
    }
  | { ok: false; reason: "not_found" | "invalid_mark" };

/**
 * The one function that turns a suggestion into a mark. The teacher types
 * finalPoints — it is never read out of the AI report — and only once this
 * runs is the learner (and every actively-linked parent) notified. Marking an
 * already-reviewed grade again just updates it, without re-notifying, so a
 * correction does not spam a family.
 */
export async function markPaperGradeReviewed(input: {
  id: number;
  teacherId: number;
  role: TeacherRole;
  finalPoints: number;
  maxPoints: number;
  teacherNotes?: string;
}): Promise<ReviewGradeResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  if (
    !Number.isInteger(input.finalPoints) ||
    !Number.isInteger(input.maxPoints) ||
    input.maxPoints <= 0 ||
    input.finalPoints < 0 ||
    input.finalPoints > input.maxPoints
  ) {
    return { ok: false, reason: "invalid_mark" };
  }
  const existing = await getPaperGrade(input.id, input.teacherId, input.role);
  if (!existing) return { ok: false, reason: "not_found" };
  const alreadyReviewed = existing.status === "reviewed";
  await db
    .update(paperGrades)
    .set({
      status: "reviewed",
      finalPoints: input.finalPoints,
      maxPoints: input.maxPoints,
      teacherNotes: input.teacherNotes ?? null,
      reviewedAt: new Date(),
    })
    .where(eq(paperGrades.id, input.id));
  const previous = {
    report: existing.report,
    model: existing.model,
    learnerId: existing.learnerId,
    finalPoints: existing.finalPoints,
    alreadyReviewed,
  };
  if (alreadyReviewed || !existing.learnerId)
    return { ok: true, notified: 0, previous };

  const title = `نتيجة جديدة: ${input.finalPoints}/${input.maxPoints}`;
  const body = input.teacherNotes?.trim() || "راجع ورقتك المصححة مع أستاذك.";
  await createNotification({
    userId: existing.learnerId,
    type: "paper_grade",
    title,
    body,
  });
  let notified = 1;
  const parents = await db
    .select({ parentId: parentLinks.parentId })
    .from(parentLinks)
    .where(
      and(
        eq(parentLinks.childId, existing.learnerId),
        eq(parentLinks.status, "active")
      )
    );
  for (const parent of parents) {
    await createNotification({
      userId: parent.parentId,
      type: "paper_grade",
      title,
      body,
    });
    notified += 1;
  }
  return { ok: true, notified, previous };
}

/** A learner's own reviewed marks. Drafts are never visible to anyone but the teacher. */
export async function getPaperGradesForLearner(learnerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: paperGrades.id,
      finalPoints: paperGrades.finalPoints,
      maxPoints: paperGrades.maxPoints,
      teacherNotes: paperGrades.teacherNotes,
      reviewedAt: paperGrades.reviewedAt,
    })
    .from(paperGrades)
    .where(
      and(
        eq(paperGrades.learnerId, learnerId),
        eq(paperGrades.status, "reviewed"),
        isNotNull(paperGrades.finalPoints)
      )
    )
    .orderBy(desc(paperGrades.reviewedAt));
}

/** The same reviewed marks, for every child actively linked to this parent. */
export async function getPaperGradesForParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db
    .select({ childId: parentLinks.childId })
    .from(parentLinks)
    .where(
      and(eq(parentLinks.parentId, parentId), eq(parentLinks.status, "active"))
    );
  const childIds = links.map(link => link.childId);
  if (!childIds.length) return [];
  return db
    .select({
      id: paperGrades.id,
      learnerId: paperGrades.learnerId,
      learnerName: users.name,
      finalPoints: paperGrades.finalPoints,
      maxPoints: paperGrades.maxPoints,
      teacherNotes: paperGrades.teacherNotes,
      reviewedAt: paperGrades.reviewedAt,
    })
    .from(paperGrades)
    .innerJoin(users, eq(users.id, paperGrades.learnerId))
    .where(
      and(
        inArray(paperGrades.learnerId, childIds),
        eq(paperGrades.status, "reviewed"),
        isNotNull(paperGrades.finalPoints)
      )
    )
    .orderBy(desc(paperGrades.reviewedAt));
}

// ---------------------------------------------------------------------------
// The reference library — files attached to every generation automatically
// ---------------------------------------------------------------------------

/** Which module a reference applies to. "all" means every module. */
export type ReferenceScope =
  "all" | "lesson" | "exam" | "solutions" | "grading";
/** The four modules, as the generation endpoints name them. */
export type AssistantModule = Exclude<ReferenceScope, "all">;

/**
 * A cap on how many references one teacher may keep. Each active one is
 * re-sent on every generation, so this is a cost ceiling as much as a
 * storage one — and a library nobody curates stops being a reference.
 */
export const MAX_REFERENCES_PER_TEACHER = 20;

export async function countReferences(teacherId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: teacherReferences.id })
    .from(teacherReferences)
    .where(eq(teacherReferences.teacherId, teacherId));
  return rows.length;
}

export async function saveReference(input: {
  teacherId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string | null;
  extractedText?: string | null;
  scope: ReferenceScope;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(teacherReferences).values({
    teacherId: input.teacherId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey ?? null,
    extractedText: input.extractedText ?? null,
    scope: input.scope,
  });
  return insertedId(result);
}

/** The library as the teacher sees it — metadata only, never the file bodies. */
export async function listReferences(teacherId: number, role: TeacherRole) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: teacherReferences.id,
      fileName: teacherReferences.fileName,
      mimeType: teacherReferences.mimeType,
      sizeBytes: teacherReferences.sizeBytes,
      scope: teacherReferences.scope,
      active: teacherReferences.active,
      createdAt: teacherReferences.createdAt,
      // Enough to show "read as text" vs "sent as a file", without shipping
      // a megabyte of extracted text into a list view.
      storedAsFile: isNotNull(teacherReferences.storageKey),
    })
    .from(teacherReferences)
    .where(ownerFilter(teacherReferences.teacherId, teacherId, role))
    .orderBy(desc(teacherReferences.createdAt));
}

/**
 * The rows to attach to one generation: this teacher's own, switched on, and
 * scoped either to every module or to this one. Deliberately NOT admin-wide —
 * an admin generating a lesson gets their own references, not every
 * teacher's, because "admin can read everything" must not turn into "admin's
 * prompts silently carry someone else's syllabus".
 */
export async function getActiveReferences(
  teacherId: number,
  module: AssistantModule
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(teacherReferences)
    .where(
      and(
        eq(teacherReferences.teacherId, teacherId),
        eq(teacherReferences.active, true),
        inArray(teacherReferences.scope, ["all", module])
      )
    )
    .orderBy(desc(teacherReferences.createdAt));
}

export async function getReference(
  id: number,
  teacherId: number,
  role: TeacherRole
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(teacherReferences)
    .where(
      role === "admin"
        ? eq(teacherReferences.id, id)
        : and(
            eq(teacherReferences.id, id),
            eq(teacherReferences.teacherId, teacherId)
          )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateReference(input: {
  id: number;
  teacherId: number;
  role: TeacherRole;
  active?: boolean;
  scope?: ReferenceScope;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await getReference(input.id, input.teacherId, input.role);
  if (!existing) return false;
  await db
    .update(teacherReferences)
    .set({
      active: input.active ?? existing.active,
      scope: input.scope ?? existing.scope,
    })
    .where(eq(teacherReferences.id, input.id));
  return true;
}

/**
 * Removes the row. The uploaded file is removed too, but by the caller
 * (server/routers/teacher.ts) using the row's storageKey: deleting the object
 * is I/O against whichever provider is configured, and this layer stays
 * database-only. A caller that skips it leaves an orphaned object, never a
 * dangling row.
 */
export async function deleteReference(
  id: number,
  teacherId: number,
  role: TeacherRole
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await getReference(id, teacherId, role);
  if (!existing) return false;
  await db.delete(teacherReferences).where(eq(teacherReferences.id, id));
  return true;
}

// ---------------------------------------------------------------------------
// Usage — what the assistant consumed (migration 0027)
// ---------------------------------------------------------------------------

export type AssistantModule4 = "lesson" | "exam" | "solutions" | "grading";

/**
 * Records one API call. Never throws: a teacher's lesson plan must not be lost
 * because the accounting row failed to insert.
 */
export async function recordAssistantUsage(input: {
  teacherId: number;
  module: AssistantModule4;
  model: string;
  inputTokens: number;
  outputTokens: number;
  ok: boolean;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(assistantUsage).values({
      teacherId: input.teacherId,
      module: input.module,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      ok: input.ok,
    });
  } catch (error) {
    console.error("[AssistantUsage] failed to record usage:", error);
  }
}

export type AssistantUsageSummary = {
  sinceDays: number;
  totals: { requests: number; failed: number; inputTokens: number; outputTokens: number };
  byModule: {
    module: AssistantModule4;
    requests: number;
    failed: number;
    inputTokens: number;
    outputTokens: number;
  }[];
};

/**
 * One teacher's own usage over a recent window. Tokens and request counts
 * only — no money figure, because this codebase does not know the price of a
 * token and would have to invent it.
 *
 * Deliberately NOT widened for admins: this answers "what have I used", and an
 * admin asking about someone else's spend is a different feature with a
 * different consent story.
 */
export async function getAssistantUsageSummary(
  teacherId: number,
  sinceDays = 30
): Promise<AssistantUsageSummary> {
  const empty: AssistantUsageSummary = {
    sinceDays,
    totals: { requests: 0, failed: 0, inputTokens: 0, outputTokens: 0 },
    byModule: [],
  };
  const db = await getDb();
  if (!db) return empty;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      module: assistantUsage.module,
      ok: assistantUsage.ok,
      inputTokens: assistantUsage.inputTokens,
      outputTokens: assistantUsage.outputTokens,
    })
    .from(assistantUsage)
    .where(
      and(
        eq(assistantUsage.teacherId, teacherId),
        gte(assistantUsage.createdAt, since)
      )
    );
  const byModule = new Map<AssistantModule4, AssistantUsageSummary["byModule"][number]>();
  for (const row of rows) {
    const module = row.module as AssistantModule4;
    const entry = byModule.get(module) ?? {
      module,
      requests: 0,
      failed: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    entry.requests += 1;
    if (!row.ok) entry.failed += 1;
    entry.inputTokens += row.inputTokens;
    entry.outputTokens += row.outputTokens;
    byModule.set(module, entry);
  }
  const list = Array.from(byModule.values()).sort(
    (a, b) => b.requests - a.requests
  );
  return {
    sinceDays,
    totals: list.reduce(
      (sum, entry) => ({
        requests: sum.requests + entry.requests,
        failed: sum.failed + entry.failed,
        inputTokens: sum.inputTokens + entry.inputTokens,
        outputTokens: sum.outputTokens + entry.outputTokens,
      }),
      empty.totals
    ),
    byModule: list,
  };
}
