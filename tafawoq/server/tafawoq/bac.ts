// Tafawoq AI Teacher — the BAC itself: the paper's structure per stream,
// marking, mentions, the exam date, and "your road to your mark" — a
// predicted maths mark from the student model and mock exams, the gap to
// the student's target, and the most valuable thing to do today. Pure
// functions: no database, unit-tested in ./tafawoq.test.ts.
import { LESSONS, type Lesson } from "./curriculum";

export type ExamSlot = { lessons: string[]; points: number };

/** The paper's structure per stream, after the official BAC papers. */
export const EXAM_BLUEPRINTS: Record<"scientific" | "gestion" | "literary", { minutes: number; slots: ExamSlot[] }> = {
  scientific: {
    minutes: 210,
    slots: [
      { lessons: ["math-probability"], points: 4 },
      { lessons: ["math-complex", "math-space-geometry"], points: 4 },
      { lessons: ["math-sequences", "math-integrals", "math-arithmetic", "math-differential-equations"], points: 5 },
      { lessons: ["math-exponential", "math-logarithm"], points: 7 },
    ],
  },
  gestion: {
    minutes: 180,
    slots: [
      { lessons: ["math-probability", "math-statistics"], points: 4 },
      { lessons: ["math-sequences"], points: 5 },
      { lessons: ["math-integrals", "math-limits"], points: 4 },
      { lessons: ["math-exponential", "math-logarithm", "math-derivatives"], points: 7 },
    ],
  },
  literary: {
    minutes: 150,
    slots: [
      { lessons: ["math-arithmetic"], points: 6 },
      { lessons: ["math-sequences"], points: 7 },
      { lessons: ["math-probability"], points: 7 },
    ],
  },
};

export function examBlueprint(stream: string | null) {
  if (stream === "gestion") return EXAM_BLUEPRINTS.gestion;
  if (stream === "lettres" || stream === "langues") return EXAM_BLUEPRINTS.literary;
  return EXAM_BLUEPRINTS.scientific;
}

/** Algerian BAC mentions. */
export function examMention(score: number): string {
  if (score >= 18) return "ممتاز";
  if (score >= 16) return "جيد جداً";
  if (score >= 14) return "جيد";
  if (score >= 12) return "قريب من الجيد";
  if (score >= 10) return "مقبول";
  return "غير ناجح بعد";
}

/** Points of each part: the exercise's points shared by difficulty, to the quarter point. */
export function partPoints(points: number, difficulties: number[]): number[] {
  const total = difficulties.reduce((sum, value) => sum + value, 0) || 1;
  const shares = difficulties.map(value => Math.round(((points * value) / total) * 4) / 4);
  // Give the rounding remainder to the last (hardest) part so they sum exactly.
  shares[shares.length - 1] += points - shares.reduce((sum, value) => sum + value, 0);
  return shares;
}


// ---------------------------------------------------------------------------
// The road to the mark
// ---------------------------------------------------------------------------

/**
 * The next BAC date. Set TAFAWOQ_BAC_DATE (YYYY-MM-DD) once the ministry
 * announces it; until then, an estimate: the second Sunday of June.
 */
export function nextBacDate(now: Date, configured: string | undefined = process.env.TAFAWOQ_BAC_DATE): { date: Date; official: boolean } {
  if (configured && /^\d{4}-\d{2}-\d{2}$/.test(configured)) {
    const date = new Date(`${configured}T08:00:00Z`);
    if (date.getTime() > now.getTime() - 5 * 86_400_000) return { date, official: true };
  }
  for (let year = now.getUTCFullYear(); ; year += 1) {
    const june = new Date(Date.UTC(year, 5, 1, 8));
    const firstSunday = 1 + ((7 - june.getUTCDay()) % 7);
    const date = new Date(Date.UTC(year, 5, firstSunday + 7, 8));
    // Still "this year's BAC" during the exam week.
    if (date.getTime() > now.getTime() - 5 * 86_400_000) return { date, official: false };
  }
}

/** Assumed mastery of a lesson the student hasn't been placed in yet. */
export const UNKNOWN_MASTERY = 0.3;
/** Rough points a focused 20-minute session adds, used for pacing only. */
export const POINTS_PER_SESSION = 0.15;

export type LessonStanding = { key: string; mastery: number | null };

export type RoadmapLesson = {
  key: string;
  title: string;
  /** Points this lesson is worth on average in the paper (its slot shared by the slot's lessons). */
  points: number;
  /** Points expected today: points × mastery (assumed mastery when not assessed). */
  expected: number;
  mastery: number | null;
};

const quarter = (value: number) => Math.round(value * 4) / 4;

/** The lessons of the student's paper with the points each is worth. */
export function paperLessons(stream: string | null): Array<{ lesson: Lesson; points: number }> {
  const blueprint = examBlueprint(stream);
  const out: Array<{ lesson: Lesson; points: number }> = [];
  for (const slot of blueprint.slots) {
    const available = slot.lessons
      .map(key => LESSONS.find(lesson => lesson.key === key))
      .filter((lesson): lesson is Lesson => !!lesson && lesson.skills.length > 0)
      .filter(lesson => !stream || !lesson.streams || lesson.streams.includes(stream as never));
    for (const lesson of available) out.push({ lesson, points: slot.points / available.length });
  }
  // Scale to 20 when a slot has no lesson for this stream.
  const total = out.reduce((sum, entry) => sum + entry.points, 0) || 1;
  return out.map(entry => ({ ...entry, points: (entry.points * 20) / total }));
}

/**
 * Predicted maths mark out of 20: what the student model says each lesson
 * is worth today, blended with recent mock exam marks (real exams weigh more
 * the more there are). The range narrows as more lessons are assessed and
 * more exams are taken.
 */
export function predictMark(stream: string | null, standings: LessonStanding[], examMarks: number[]) {
  const mastery = new Map(standings.map(entry => [entry.key, entry.mastery]));
  const lessons: RoadmapLesson[] = paperLessons(stream).map(({ lesson, points }) => {
    const known = mastery.get(lesson.key) ?? null;
    return { key: lesson.key, title: lesson.title, points, expected: points * (known ?? UNKNOWN_MASTERY), mastery: known };
  });
  const model = lessons.reduce((sum, entry) => sum + entry.expected, 0);
  const recent = examMarks.slice(-3);
  const examWeight = Math.min(0.6, 0.25 * recent.length);
  const examAverage = recent.length ? recent.reduce((sum, mark) => sum + mark, 0) / recent.length : 0;
  const predicted = quarter(model * (1 - examWeight) + examAverage * examWeight);
  const unknownShare = lessons.filter(entry => entry.mastery === null).reduce((sum, entry) => sum + entry.points, 0) / 20;
  const halfWidth = Math.max(0.75, quarter(1 + 6 * unknownShare - 0.5 * recent.length));
  return {
    predicted,
    low: Math.max(0, quarter(predicted - halfWidth)),
    high: Math.min(20, quarter(predicted + halfWidth)),
    lessons,
  };
}

/** The lesson where today's work is worth the most points. */
export function bestNextLesson(lessons: RoadmapLesson[]) {
  const ranked = [...lessons].sort(
    (a, b) => b.points * (1 - (b.mastery ?? UNKNOWN_MASTERY)) - a.points * (1 - (a.mastery ?? UNKNOWN_MASTERY))
  );
  const best = ranked[0];
  if (!best) return null;
  return {
    lessonKey: best.key,
    lessonTitle: best.title,
    /** Not assessed yet: the task is the placement test. */
    needsPlacement: best.mastery === null,
    /** Rough gain of one focused session, to the quarter point (at least a quarter). */
    gain: best.mastery === null ? null : Math.max(0.25, quarter(Math.min(best.points * (1 - best.mastery), POINTS_PER_SESSION * 3))),
  };
}

/** Sessions per week needed to close the gap before the exam (2 to keep a level, 7 at most). */
export function sessionsPerWeek(gap: number, daysLeft: number) {
  if (gap <= 0) return 2;
  const weeks = Math.max(1, daysLeft / 7);
  return Math.min(7, Math.max(2, Math.ceil(gap / POINTS_PER_SESSION / weeks)));
}
