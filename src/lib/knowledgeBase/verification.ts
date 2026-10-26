// Deterministic (non-AI) verification — the mandatory layer instruction 5
// and rule 11 require: "لا تعتمد على الذكاء الاصطناعي وحده للتحقق من
// الرياضيات". There is no SymPy/CAS in this project (pure Node/TypeScript —
// see the KB phase report for why that's a deliberate, flagged choice), so
// this module does NOT attempt to symbolically re-derive whether a solution
// is mathematically correct. What it DOES check, exactly and without any
// model call:
//   - rubric points sum to the stated total exactly (integer-hundredths
//     comparison, not floating point — see points.ts)
//   - required fields aren't empty
//   - exact-text duplicates against already-known content
//
// "Verified" by this module means "structurally and arithmetically sound,
// consistent with a source we're treating as authoritative" (an official
// exam + its official correction) — NOT "independently proven
// mathematically correct". That distinction matters and is why this stays
// a separate, honestly-named layer rather than folded into "AI review".
import { toHundredths } from "../points";
import { insertKbVerification, listKbExercises, listKbLessons } from "../db";
import type { KbExam, KbExercise, KbLesson, KbVerificationMethod, KbVerificationResult } from "../types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface VerificationCheck {
  method: KbVerificationMethod;
  result: KbVerificationResult;
  detail: string;
}

export interface VerificationOutcome {
  checks: VerificationCheck[];
  overall: "verified" | "needs_human_review";
}

function recordAndCollect(targetType: "lesson" | "exercise" | "exam", targetId: string, checks: VerificationCheck[]): void {
  const now = new Date().toISOString();
  for (const check of checks) {
    insertKbVerification({
      id: newId("kbver"),
      targetType,
      targetId,
      method: check.method,
      result: check.result,
      detail: check.detail,
      checkedAt: now,
      checkedBy: null,
    });
  }
}

function pointsCheck(label: string, rubric: { points: number }[], totalPoints: number): VerificationCheck {
  const rubricSum = rubric.reduce((s, r) => s + toHundredths(r.points), 0);
  const target = toHundredths(totalPoints);
  if (rubric.length === 0) {
    return { method: "deterministic_points", result: "fail", detail: `${label}: شبكة التصحيح فارغة` };
  }
  if (rubricSum !== target) {
    return {
      method: "deterministic_points",
      result: "fail",
      detail: `${label}: مجموع نقاط شبكة التصحيح (${rubricSum / 100}) لا يساوي النقطة الكلية (${totalPoints})`,
    };
  }
  return { method: "deterministic_points", result: "pass", detail: `${label}: مجموع النقاط مطابق (${totalPoints})` };
}

function completenessCheck(label: string, fields: { name: string; value: string | null }[]): VerificationCheck {
  const empty = fields.filter((f) => !f.value || !f.value.trim());
  if (empty.length > 0) {
    return {
      method: "deterministic_completeness",
      result: "fail",
      detail: `${label}: حقول فارغة (${empty.map((f) => f.name).join("، ")})`,
    };
  }
  return { method: "deterministic_completeness", result: "pass", detail: `${label}: جميع الحقول المطلوبة مكتملة` };
}

function duplicateCheck(label: string, text: string, othersText: string[]): VerificationCheck {
  const normalized = text.trim();
  const isDuplicate = othersText.some((t) => t.trim() === normalized);
  if (isDuplicate) {
    return { method: "deterministic_duplicate", result: "fail", detail: `${label}: نص مطابق تمامًا لعنصر آخر موجود مسبقًا` };
  }
  return { method: "deterministic_duplicate", result: "pass", detail: `${label}: لا يوجد تكرار نصي مطابق` };
}

export function verifyLesson(lesson: KbLesson): VerificationOutcome {
  const completeness = completenessCheck("الدرس", [
    { name: "العنوان", value: lesson.title },
    ...lesson.sections.map((s, i) => ({ name: `قسم ${i + 1} (${s.heading || "بلا عنوان"})`, value: s.body })),
  ]);
  const sectionsNonEmpty: VerificationCheck =
    lesson.sections.length > 0
      ? { method: "deterministic_completeness", result: "pass", detail: "الدرس يحتوي أقسامًا" }
      : { method: "deterministic_completeness", result: "fail", detail: "الدرس بلا أي أقسام" };

  const others = listKbLessons({ subjectId: lesson.subjectId, educationLevelId: lesson.educationLevelId })
    .filter((l) => l.id !== lesson.id)
    .map((l) => l.title);
  const duplicate = duplicateCheck("الدرس", lesson.title, others);

  const checks = [completeness, sectionsNonEmpty, duplicate];
  const overall = checks.every((c) => c.result === "pass") ? "verified" : "needs_human_review";
  recordAndCollect("lesson", lesson.id, checks);
  return { checks, overall };
}

export function verifyExercise(exercise: KbExercise): VerificationOutcome {
  const completeness = completenessCheck("التمرين", [
    { name: "نص السؤال", value: exercise.promptText },
    { name: "الحل النموذجي", value: exercise.solutionText },
  ]);
  const points = pointsCheck("التمرين", exercise.rubric, exercise.points);
  const others = listKbExercises({ subjectId: exercise.subjectId, educationLevelId: exercise.educationLevelId })
    .filter((e) => e.id !== exercise.id)
    .map((e) => e.promptText);
  const duplicate = duplicateCheck("التمرين", exercise.promptText, others);

  const checks = [completeness, points, duplicate];
  const overall = checks.every((c) => c.result === "pass") ? "verified" : "needs_human_review";
  recordAndCollect("exercise", exercise.id, checks);
  return { checks, overall };
}

export function verifyExam(exam: KbExam): VerificationOutcome {
  const completeness = completenessCheck("الامتحان", [
    { name: "العنوان", value: exam.title },
    ...exam.questions.map((q, i) => ({ name: `السؤال ${i + 1}`, value: q.promptText })),
  ]);
  const pointsChecks = exam.questions.map((q, i) => pointsCheck(`السؤال ${i + 1}`, q.rubric, q.points));
  const questionsNonEmpty: VerificationCheck =
    exam.questions.length > 0
      ? { method: "deterministic_completeness", result: "pass", detail: "الامتحان يحتوي أسئلة" }
      : { method: "deterministic_completeness", result: "fail", detail: "الامتحان بلا أي أسئلة" };

  const checks = [completeness, questionsNonEmpty, ...pointsChecks];
  const overall = checks.every((c) => c.result === "pass") ? "verified" : "needs_human_review";
  recordAndCollect("exam", exam.id, checks);
  return { checks, overall };
}
