import crypto from "node:crypto";
import {
  findKbSourceByUrl,
  findKbSourceDocumentByChecksum,
  getKbExam,
  getKbExercise,
  getKbLesson,
  getKbSourceDocument,
  insertKbChunk,
  insertKbExam,
  insertKbExercise,
  insertKbLesson,
  insertKbSource,
  insertKbSourceDocument,
  insertKbVerification,
  listKbSources,
  updateKbExamStatus,
  updateKbExerciseStatus,
  updateKbLessonStatus,
  updateKbSourceDocumentExtraction,
  updateKbSourceDocumentStatus,
} from "../db";
import type {
  KbContentStatus,
  KbExam,
  KbExamType,
  KbExercise,
  KbLesson,
  KbLicenseStatus,
  KbSource,
  KbSourceDocument,
  KbSourceType,
  KbVerificationTargetType,
  SubjectId,
} from "../types";
import { isValidCurriculumTopic, isValidEducationLevelId } from "./levels";
import { verifyExam, verifyExercise, verifyLesson, type VerificationOutcome } from "./verification";

export class KnowledgeBaseError extends Error {}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Sources ----------

export interface RegisterSourceInput {
  name: string;
  url: string;
  sourceType: KbSourceType;
  // Deliberately required, not defaulted to something permissive — every
  // caller must state what it believes about this source's license, and
  // "unknown" (the honest default when truly unsure) is a real, legitimate
  // value that gates extraction later (see canStoreFullText).
  licenseStatus: KbLicenseStatus;
  reliabilityNote: string;
}

// Idempotent on url: re-registering the same source returns the existing
// row rather than creating a duplicate — a Research Agent calling this
// repeatedly (e.g. re-discovering the same ministry page) never fragments
// one source into many rows.
export function registerSource(input: RegisterSourceInput): KbSource {
  const existing = findKbSourceByUrl(input.url);
  if (existing) return existing;

  const source: KbSource = {
    id: newId("kbsrc"),
    name: input.name,
    url: input.url,
    sourceType: input.sourceType,
    licenseStatus: input.licenseStatus,
    reliabilityNote: input.reliabilityNote,
    discoveredAt: new Date().toISOString(),
    lastCheckedAt: null,
  };
  insertKbSource(source);
  return source;
}

export function getAllSources(): KbSource[] {
  return listKbSources();
}

// ---------- Source documents ----------

export interface RecordSourceDocumentInput {
  sourceId: string;
  url: string;
  title: string;
  fileType: KbSourceDocument["fileType"];
  subjectId: SubjectId;
  educationLevelId: string;
  documentKind: KbSourceDocument["documentKind"];
  contentYear: string | null;
  notes?: string;
}

// Records that a document was *found* — no content yet (that's
// extractSourceDocument). Rejects an unrecognized education level up front
// rather than silently storing an unclassifiable row (instruction: don't
// rely on AI alone to prove curriculum match — a level that isn't in the
// known taxonomy at all is caught here, deterministically, before any model
// ever sees this document).
export function recordSourceDocument(input: RecordSourceDocumentInput): KbSourceDocument {
  if (!isValidEducationLevelId(input.subjectId, input.educationLevelId)) {
    throw new KnowledgeBaseError(
      `مستوى تعليمي غير معروف لهذه المادة: "${input.educationLevelId}" (مادة: ${input.subjectId}) — راجع src/lib/knowledgeBase/levels.ts`,
    );
  }
  const doc: KbSourceDocument = {
    id: newId("kbdoc"),
    sourceId: input.sourceId,
    url: input.url,
    title: input.title,
    fileType: input.fileType,
    subjectId: input.subjectId,
    educationLevelId: input.educationLevelId,
    documentKind: input.documentKind,
    contentYear: input.contentYear,
    rawText: null,
    excerpt: null,
    checksum: null,
    status: "collected",
    notes: input.notes ?? "",
    collectedAt: new Date().toISOString(),
  };
  insertKbSourceDocument(doc);
  return doc;
}

// A license status this conservative on purpose: only "public_domain" ever
// allows storing the full extracted text. "permitted_excerpt" allows an
// excerpt only, even if the caller has the full text in hand. "unknown" and
// "restricted" allow neither — instruction 13 (never exceed copyright) is
// enforced here, not left to the caller's judgment each time.
function canStoreFullText(licenseStatus: KbLicenseStatus): boolean {
  return licenseStatus === "public_domain";
}
function canStoreExcerpt(licenseStatus: KbLicenseStatus): boolean {
  return licenseStatus === "public_domain" || licenseStatus === "permitted_excerpt";
}

const EXCERPT_MAX_CHARS = 1000;

export interface ExtractDocumentResult {
  document: KbSourceDocument;
  duplicateOf: KbSourceDocument | null;
}

/**
 * Takes raw extracted text (already pulled from the file by extractText.ts
 * or an equivalent) and a resolved source, and decides — deterministically,
 * from the source's own licenseStatus, never from a guess — how much of it
 * this platform is allowed to keep. Also the single place duplicate
 * detection happens (SHA-256 of whatever text IS being stored).
 */
export function extractSourceDocument(args: {
  documentId: string;
  sourceLicenseStatus: KbLicenseStatus;
  extractedText: string;
}): ExtractDocumentResult {
  const doc = getKbSourceDocument(args.documentId);
  if (!doc) throw new KnowledgeBaseError(`وثيقة مصدر غير موجودة: ${args.documentId}`);

  const trimmed = args.extractedText.trim();
  if (trimmed.length === 0) {
    updateKbSourceDocumentStatus(doc.id, "needs_human_review", "فشل الاستخراج: لا يوجد نص قابل للاستخراج من الملف");
    return { document: { ...doc, status: "needs_human_review" }, duplicateOf: null };
  }

  const storedText = canStoreFullText(args.sourceLicenseStatus)
    ? trimmed
    : canStoreExcerpt(args.sourceLicenseStatus)
      ? trimmed.slice(0, EXCERPT_MAX_CHARS)
      : null;

  if (storedText === null) {
    // License doesn't allow keeping any text — stays "collected" with the
    // URL/metadata only, per instruction: metadata+link only when storage
    // isn't licensed. Flagged for human review to resolve the license
    // question, not silently left in limbo.
    updateKbSourceDocumentStatus(
      doc.id,
      "needs_human_review",
      "لا يُسمح بتخزين أي نص من هذا المصدر (حالة الترخيص: " + args.sourceLicenseStatus + ") — يحتاج مراجعة بشرية لتحديد الترخيص قبل المتابعة",
    );
    return { document: { ...doc, status: "needs_human_review" }, duplicateOf: null };
  }

  const checksum = crypto.createHash("sha256").update(storedText).digest("hex");
  const existingDuplicate = findKbSourceDocumentByChecksum(checksum);
  if (existingDuplicate && existingDuplicate.id !== doc.id) {
    updateKbSourceDocumentStatus(doc.id, "rejected", `مكرر — نفس محتوى الوثيقة ${existingDuplicate.id}`);
    return { document: { ...doc, status: "rejected" }, duplicateOf: existingDuplicate };
  }

  const isFullText = canStoreFullText(args.sourceLicenseStatus);
  updateKbSourceDocumentExtraction({
    id: doc.id,
    rawText: isFullText ? storedText : null,
    excerpt: isFullText ? null : storedText,
    checksum,
    status: "extracted",
  });
  return {
    document: { ...doc, rawText: isFullText ? storedText : null, excerpt: isFullText ? null : storedText, checksum, status: "extracted" },
    duplicateOf: null,
  };
}

// ---------- Classification (creates the actual lesson/exercise/exam row) ----------
//
// Deliberately NOT doing any AI call in this module — callers pass already
// -structured content (e.g. from a human admin, or from a separate
// AI-structuring helper that itself never writes to the DB directly). This
// keeps the write path deterministic and fully unit-testable without a live
// model call, matching instruction 15 (never claim a test passed that
// wasn't actually run) — a function that calls Gemini can't be covered by
// an offline unit test the same way, so it stays a separate layer.

export interface ClassifyLessonInput {
  sourceDocumentId: string | null;
  subjectId: SubjectId;
  educationLevelId: string;
  curriculumTopic: string;
  title: string;
  sections: KbLesson["sections"];
  skills: string[];
}

function assertKnownLevelAndTopic(subjectId: SubjectId, educationLevelId: string, curriculumTopic: string): void {
  if (!isValidEducationLevelId(subjectId, educationLevelId)) {
    throw new KnowledgeBaseError(`مستوى تعليمي غير معروف: "${educationLevelId}" (مادة: ${subjectId})`);
  }
  // Deterministic check against the known curriculum topic list — this is
  // exactly instruction 4's "لا تعتمد على تصنيف الذكاء الاصطناعي وحده
  // لإثبات مطابقة المحتوى للمنهاج": even if an AI classifier picked the
  // topic string, it must match the real reference taxonomy or this throws.
  if (!isValidCurriculumTopic(subjectId, educationLevelId, curriculumTopic)) {
    throw new KnowledgeBaseError(
      `المحور "${curriculumTopic}" غير موجود في منهاج المستوى "${educationLevelId}" — راجع src/lib/agents/mathCurriculum.ts`,
    );
  }
}

export function classifyAsLesson(input: ClassifyLessonInput): KbLesson {
  assertKnownLevelAndTopic(input.subjectId, input.educationLevelId, input.curriculumTopic);
  if (input.sections.length === 0) {
    throw new KnowledgeBaseError("لا يمكن تصنيف درس بلا أي محتوى (sections فارغة)");
  }
  const lesson: KbLesson = {
    id: newId("kbles"),
    sourceDocumentId: input.sourceDocumentId,
    subjectId: input.subjectId,
    educationLevelId: input.educationLevelId,
    curriculumTopic: input.curriculumTopic,
    title: input.title,
    sections: input.sections,
    skills: input.skills,
    status: "classified",
    verifiedAt: null,
    verifiedBy: null,
    createdAt: new Date().toISOString(),
  };
  insertKbLesson(lesson);
  return lesson;
}

export interface ClassifyExerciseInput {
  sourceDocumentId: string | null;
  subjectId: SubjectId;
  educationLevelId: string;
  curriculumTopic: string;
  promptText: string;
  solutionText: string | null;
  rubric: KbExercise["rubric"];
  points: number;
  difficulty: KbExercise["difficulty"];
}

export function classifyAsExercise(input: ClassifyExerciseInput): KbExercise {
  assertKnownLevelAndTopic(input.subjectId, input.educationLevelId, input.curriculumTopic);
  if (!input.promptText.trim()) throw new KnowledgeBaseError("لا يمكن تصنيف تمرين بنص سؤال فارغ");
  const exercise: KbExercise = {
    id: newId("kbex"),
    sourceDocumentId: input.sourceDocumentId,
    subjectId: input.subjectId,
    educationLevelId: input.educationLevelId,
    curriculumTopic: input.curriculumTopic,
    promptText: input.promptText,
    solutionText: input.solutionText,
    rubric: input.rubric,
    points: input.points,
    difficulty: input.difficulty,
    status: "classified",
    verifiedAt: null,
    verifiedBy: null,
    createdAt: new Date().toISOString(),
  };
  insertKbExercise(exercise);
  return exercise;
}

export interface ClassifyExamInput {
  sourceDocumentId: string | null;
  title: string;
  examType: KbExamType;
  subjectId: SubjectId;
  educationLevelId: string;
  contentYear: string | null;
  questions: KbExam["questions"];
}

export function classifyAsExam(input: ClassifyExamInput): KbExam {
  if (!isValidEducationLevelId(input.subjectId, input.educationLevelId)) {
    throw new KnowledgeBaseError(`مستوى تعليمي غير معروف: "${input.educationLevelId}" (مادة: ${input.subjectId})`);
  }
  if (input.questions.length === 0) throw new KnowledgeBaseError("لا يمكن تصنيف امتحان بلا أسئلة");
  for (const q of input.questions) {
    if (!isValidCurriculumTopic(input.subjectId, input.educationLevelId, q.curriculumTopic)) {
      throw new KnowledgeBaseError(
        `محور السؤال "${q.curriculumTopic}" غير موجود في منهاج المستوى "${input.educationLevelId}"`,
      );
    }
  }
  const exam: KbExam = {
    id: newId("kbxm"),
    sourceDocumentId: input.sourceDocumentId,
    title: input.title,
    examType: input.examType,
    subjectId: input.subjectId,
    educationLevelId: input.educationLevelId,
    contentYear: input.contentYear,
    questions: input.questions,
    status: "classified",
    verifiedAt: null,
    verifiedBy: null,
    createdAt: new Date().toISOString(),
  };
  insertKbExam(exam);
  return exam;
}

// ---------- Status transitions shared across lessons/exercises/exams ----------

type TargetType = Exclude<KbVerificationTargetType, "source_document">;

function getTarget(targetType: TargetType, id: string): KbLesson | KbExercise | KbExam | null {
  if (targetType === "lesson") return getKbLesson(id);
  if (targetType === "exercise") return getKbExercise(id);
  return getKbExam(id);
}

function setStatus(targetType: TargetType, id: string, status: KbContentStatus, verifiedBy?: string | null): void {
  const verifiedAt = status === "verified" ? new Date().toISOString() : null;
  if (targetType === "lesson") updateKbLessonStatus({ id, status, verifiedAt, verifiedBy: verifiedBy ?? null });
  else if (targetType === "exercise") updateKbExerciseStatus({ id, status, verifiedAt, verifiedBy: verifiedBy ?? null });
  else updateKbExamStatus({ id, status, verifiedAt, verifiedBy: verifiedBy ?? null });
}

const VALID_PRE_VERIFICATION_STATUSES: KbContentStatus[] = ["classified", "pending_verification", "needs_human_review"];

export function submitForVerification(targetType: TargetType, id: string): void {
  const target = getTarget(targetType, id);
  if (!target) throw new KnowledgeBaseError(`عنصر غير موجود: ${targetType}/${id}`);
  if (!VALID_PRE_VERIFICATION_STATUSES.includes(target.status)) {
    throw new KnowledgeBaseError(`لا يمكن إرسال عنصر بحالة "${target.status}" للتحقق`);
  }
  setStatus(targetType, id, "pending_verification");
}

/**
 * Runs the deterministic verification checks (see verification.ts) and
 * applies their outcome to the row's status — the only place
 * classified/pending_verification content can reach "verified" without an
 * explicit human review. Every individual check is recorded in
 * kb_verifications regardless of outcome, so "why is this verified/stuck in
 * review" is always answerable from the audit trail, not just the final
 * status.
 */
export function runDeterministicVerification(targetType: TargetType, id: string): VerificationOutcome {
  const target = getTarget(targetType, id);
  if (!target) throw new KnowledgeBaseError(`عنصر غير موجود: ${targetType}/${id}`);
  if (!VALID_PRE_VERIFICATION_STATUSES.includes(target.status)) {
    throw new KnowledgeBaseError(`لا يمكن تشغيل التحقق على عنصر بحالة "${target.status}"`);
  }

  const outcome =
    targetType === "lesson"
      ? verifyLesson(target as KbLesson)
      : targetType === "exercise"
        ? verifyExercise(target as KbExercise)
        : verifyExam(target as KbExam);

  setStatus(targetType, id, outcome.overall);
  return outcome;
}

// A human (admin) explicitly confirming a row that deterministic checks
// alone couldn't fully settle (e.g. needs_human_review) or fast-tracking a
// trusted one. Always recorded as its own human_review verification row —
// never silently promoted without an audit trail of who approved it.
export function markVerifiedByHuman(targetType: TargetType, id: string, adminTeacherId: string, note: string): void {
  const target = getTarget(targetType, id);
  if (!target) throw new KnowledgeBaseError(`عنصر غير موجود: ${targetType}/${id}`);
  insertKbVerification({
    id: newId("kbver"),
    targetType,
    targetId: id,
    method: "human_review",
    result: "pass",
    detail: note,
    checkedAt: new Date().toISOString(),
    checkedBy: adminTeacherId,
  });
  setStatus(targetType, id, "verified", adminTeacherId);
}

export function rejectContent(targetType: TargetType, id: string, adminTeacherId: string, reason: string): void {
  const target = getTarget(targetType, id);
  if (!target) throw new KnowledgeBaseError(`عنصر غير موجود: ${targetType}/${id}`);
  insertKbVerification({
    id: newId("kbver"),
    targetType,
    targetId: id,
    method: "human_review",
    result: "fail",
    detail: reason,
    checkedAt: new Date().toISOString(),
    checkedBy: adminTeacherId,
  });
  setStatus(targetType, id, "rejected");
}

function chunkLesson(lesson: KbLesson): void {
  for (const section of lesson.sections) {
    insertKbChunk({
      id: newId("kbchk"),
      subjectId: lesson.subjectId,
      educationLevelId: lesson.educationLevelId,
      curriculumTopic: lesson.curriculumTopic,
      chunkType: "definition",
      text: `${section.heading}\n${section.body}`,
      sourceLessonId: lesson.id,
      sourceExerciseId: null,
      sourceExamId: null,
      createdAt: new Date().toISOString(),
    });
  }
}

function chunkExercise(exercise: KbExercise): void {
  const text = exercise.solutionText
    ? `${exercise.promptText}\n\nالحل:\n${exercise.solutionText}`
    : exercise.promptText;
  insertKbChunk({
    id: newId("kbchk"),
    subjectId: exercise.subjectId,
    educationLevelId: exercise.educationLevelId,
    curriculumTopic: exercise.curriculumTopic,
    chunkType: "exercise",
    text,
    sourceLessonId: null,
    sourceExerciseId: exercise.id,
    sourceExamId: null,
    createdAt: new Date().toISOString(),
  });
}

function chunkExam(exam: KbExam): void {
  for (const q of exam.questions) {
    const text = q.solutionText ? `${q.promptText}\n\nالحل:\n${q.solutionText}` : q.promptText;
    insertKbChunk({
      id: newId("kbchk"),
      subjectId: exam.subjectId,
      educationLevelId: exam.educationLevelId,
      curriculumTopic: q.curriculumTopic,
      chunkType: "exercise",
      text,
      sourceLessonId: null,
      sourceExerciseId: null,
      sourceExamId: exam.id,
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Publishing is the ONLY path that creates retrievable kb_chunks, and it is
 * only ever reachable from "verified" — never directly from
 * classified/pending_verification, so nothing unverified can ever become
 * retrievable by the (future) RAG wiring. Chunking itself is deterministic
 * (split lesson sections, one chunk per exercise/exam question) — no AI
 * call, so nothing here can silently invent content that wasn't already in
 * the verified row.
 */
export function publishContent(targetType: TargetType, id: string): void {
  const target = getTarget(targetType, id);
  if (!target) throw new KnowledgeBaseError(`عنصر غير موجود: ${targetType}/${id}`);
  if (target.status !== "verified") {
    throw new KnowledgeBaseError(`لا يمكن نشر عنصر لم يُتحقق منه بعد (الحالة الحالية: ${target.status})`);
  }
  if (targetType === "lesson") chunkLesson(target as KbLesson);
  else if (targetType === "exercise") chunkExercise(target as KbExercise);
  else chunkExam(target as KbExam);
  setStatus(targetType, id, "published", target.verifiedBy);
}
