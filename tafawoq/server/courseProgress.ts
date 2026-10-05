// Pure, dialect-agnostic business logic for course-progress rules — kept
// separate from any single query implementation so the rule (how progress
// percent is computed, what counts as 100% completion) is expressed once
// and is easy to unit-test without a database. See courseProgress.test.ts.

/**
 * A course's progress percentage is the share of its total lessons the
 * learner has completed, capped at 100 and rounded to the nearest whole
 * percent. Used identically by both backends — this is the one place this
 * rule is expressed, so a future change to it (partial credit for
 * in-progress lessons, weighting by lesson duration, etc.) only needs to
 * happen once.
 */
export function computeProgressPercent(
  totalLessonIds: number[],
  completedLessonIds: Iterable<number>
): number {
  if (totalLessonIds.length === 0) return 0;
  const completedSet = new Set(completedLessonIds);
  const completedCount = totalLessonIds.filter((id) =>
    completedSet.has(id)
  ).length;
  return Math.min(100, Math.round((completedCount / totalLessonIds.length) * 100));
}

/** A course counts as complete once every one of its lessons is completed — the single definition of "done" both backends use to decide whether to flip enrollment status and trigger certificate issuance. */
export function isCourseComplete(progressPercent: number): boolean {
  return progressPercent >= 100;
}

/**
 * Given an ordered list of a course's lesson ids and the set of ones the
 * learner has completed, decides whether a specific lesson is locked
 * (its immediately preceding lesson hasn't been completed yet) — the
 * single definition of the sequential-unlock rule both backends enforce.
 */
export function isLessonLockedByOrder(
  orderedLessonIds: number[],
  targetLessonId: number,
  completedLessonIds: Iterable<number>
): boolean {
  const index = orderedLessonIds.indexOf(targetLessonId);
  if (index <= 0) return false; // first lesson (or not found) is never locked by this rule
  const completedSet = new Set(completedLessonIds);
  return !completedSet.has(orderedLessonIds[index - 1]);
}
