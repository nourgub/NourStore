import { MATH_CURRICULUM } from "../agents/mathCurriculum";
import type { SubjectId } from "../types";

// Canonical curriculum-level taxonomy the knowledge base validates against —
// deliberately NOT a new parallel structure: for math it reuses the exact
// level ids and topics already in mathCurriculum.ts (the one the exam
// generation agents use), so a KB lesson classified under "4am" refers to
// the same level a teacher sees when generating an exam.
//
// Scope note (see DELIVERY_SUMMARY / the KB phase report): only math is
// modeled here so far, and only the متوسط/ثانوي stages mathCurriculum.ts
// already covers — ابتدائي (primary) and عربية (Arabic) curriculum
// taxonomies are explicitly NOT built yet. isValidEducationLevelId returns
// false for anything outside that scope rather than silently accepting an
// unvalidated level id.

export function isValidEducationLevelId(subjectId: SubjectId, levelId: string): boolean {
  if (subjectId !== "math") return false;
  return MATH_CURRICULUM.some((l) => l.id === levelId);
}

export function getEducationLevelLabel(subjectId: SubjectId, levelId: string): string | null {
  if (subjectId !== "math") return null;
  return MATH_CURRICULUM.find((l) => l.id === levelId)?.label ?? null;
}

export function isValidCurriculumTopic(subjectId: SubjectId, levelId: string, topic: string): boolean {
  if (subjectId !== "math") return false;
  const level = MATH_CURRICULUM.find((l) => l.id === levelId);
  return level ? level.topics.includes(topic) : false;
}

export function getCurriculumTopics(subjectId: SubjectId, levelId: string): string[] {
  if (subjectId !== "math") return [];
  return MATH_CURRICULUM.find((l) => l.id === levelId)?.topics ?? [];
}
