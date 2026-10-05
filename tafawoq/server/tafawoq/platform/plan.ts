// Tafawoq BAC platform — the automatic daily plan, the study streak and
// the motivation system (points, badges). Pure functions: the service
// gathers the student's standings, mistakes and activity days, these turn
// them into today's plan and the badges earned. Unit-tested in
// ./platform.test.ts.
import type { BadgeKey, ErrorType } from "@shared/bacPlatform";

/** Algeria is UTC+1 all year (no daylight saving). */
const ALGIERS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** The calendar day in Algiers, "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  return new Date(date.getTime() + ALGIERS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Monday of the day's week, "YYYY-MM-DD" (the weekly test's key). */
export function weekKey(date: Date): string {
  const local = new Date(date.getTime() + ALGIERS_OFFSET_MS);
  const weekday = (local.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(local.getTime() - weekday * DAY_MS).toISOString().slice(0, 10);
}

/** Start of the week (Monday 00:00 in Algiers) as an instant. */
export function weekStart(date: Date): Date {
  return new Date(Date.parse(`${weekKey(date)}T00:00:00Z`) - ALGIERS_OFFSET_MS);
}

function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/**
 * Consecutive study days ending today — or yesterday, when the student
 * hasn't studied yet today (the streak isn't broken before the day ends).
 */
export function studyStreak(activeDays: Iterable<string>, today: string) {
  const days = new Set(activeDays);
  const activeToday = days.has(today);
  let cursor = activeToday ? today : previousDay(today);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }
  let best = 0;
  for (const day of Array.from(days)) {
    if (days.has(previousDay(day))) continue;
    let length = 0;
    let next = day;
    while (days.has(next)) {
      length += 1;
      next = new Date(Date.parse(`${next}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
    }
    best = Math.max(best, length);
  }
  return { current, best, activeToday };
}

// ---------------------------------------------------------------------------
// Daily plan
// ---------------------------------------------------------------------------

export type PlanSkill = {
  key: string;
  name: string;
  explanation: string;
  example: { problem: string; steps: string[]; answer: string };
};

export type PlanLesson = {
  key: string;
  title: string;
  /** Points the lesson is worth in the BAC paper (pacing weight). */
  points: number;
  mastery: number | null;
  /** Weakest skills first. */
  weakSkills: PlanSkill[];
};

export type PlanMistake = {
  lessonKey: string;
  lessonTitle: string;
  skillKey: string;
  skillName: string;
  prompt: string;
  given: string;
  correctAnswer: string;
  explanation: string;
  misconception: string | null;
  errorType: ErrorType | null;
};

export type PlanInput = {
  day: string;
  lessons: PlanLesson[];
  /** Recent wrong answers, newest first. */
  mistakes: PlanMistake[];
  errorCounts: Partial<Record<ErrorType, number>>;
  daysLeft: number;
  activeDaysLast14: number;
  overallMastery: number;
};

export type PlanTaskKind = "lesson" | "exercises" | "review" | "quiz";

export type PlanTask = {
  id: string;
  kind: PlanTaskKind;
  lessonKey: string;
  lessonTitle: string;
  skillKey: string | null;
  skillName: string | null;
  minutes: number;
  /** Number of questions (exercises, quiz, review). */
  count: number;
  /** The short lesson (kind "lesson"). */
  lesson?: PlanSkill;
  /** The earlier mistake to review (kind "review"). */
  mistake?: PlanMistake;
  /** Set when the task's questions were created; done once graded. */
  assessmentId: number | null;
  /** Lesson read / review seen (set by the student). */
  completedAt: string | null;
};

export type Intensity = "light" | "normal" | "intensive";

export type DailyPlan = {
  day: string;
  intensity: Intensity;
  minutes: number;
  /** Why the plan looks like this (for the interface). */
  reasons: Array<"bacSoon" | "comeback" | "weakLevel" | "recurringError" | "noPlacement">;
  tasks: PlanTask[];
};

const UNKNOWN_MASTERY = 0.3;

/** Lessons ordered by how many BAC points today's work can win. */
export function prioritizeLessons(lessons: PlanLesson[]): PlanLesson[] {
  return [...lessons].sort(
    (a, b) =>
      b.points * (1 - (b.mastery ?? UNKNOWN_MASTERY)) - a.points * (1 - (a.mastery ?? UNKNOWN_MASTERY)) ||
      a.key.localeCompare(b.key)
  );
}

export function buildDailyPlan(input: PlanInput): DailyPlan {
  const ranked = prioritizeLessons(input.lessons.filter(lesson => lesson.weakSkills.length > 0));
  const reasons: DailyPlan["reasons"] = [];
  const intensity: Intensity =
    input.daysLeft <= 30 ? "intensive" : input.activeDaysLast14 <= 3 ? "light" : "normal";
  if (intensity === "intensive") reasons.push("bacSoon");
  if (intensity === "light") reasons.push("comeback");
  if (input.overallMastery < 0.4) reasons.push("weakLevel");
  if (input.lessons.some(lesson => lesson.mastery === null)) reasons.push("noPlacement");

  const first = ranked[0];
  if (!first) return { day: input.day, intensity, minutes: 0, reasons, tasks: [] };
  const second = ranked[1] ?? first;
  const skill = first.weakSkills[0];
  const exerciseCount = intensity === "intensive" ? 6 : intensity === "light" ? 3 : 5;
  const tasks: PlanTask[] = [];
  const base = { assessmentId: null, completedAt: null };

  tasks.push({
    ...base,
    id: "lesson",
    kind: "lesson",
    lessonKey: first.key,
    lessonTitle: first.title,
    skillKey: skill.key,
    skillName: skill.name,
    minutes: 10,
    count: 0,
    lesson: skill,
  });
  tasks.push({
    ...base,
    id: "exercises",
    kind: "exercises",
    lessonKey: first.key,
    lessonTitle: first.title,
    skillKey: skill.key,
    skillName: skill.name,
    minutes: exerciseCount * 3,
    count: exerciseCount,
  });

  // The earlier mistake worth reviewing: the most frequent kind of error first.
  const topError = (Object.entries(input.errorCounts) as Array<[ErrorType, number]>).sort((a, b) => b[1] - a[1])[0];
  const mistake =
    input.mistakes.find(entry => topError && entry.errorType === topError[0]) ?? input.mistakes[0];
  if (mistake) {
    if (topError && topError[1] >= 2) reasons.push("recurringError");
    tasks.push({
      ...base,
      id: "review",
      kind: "review",
      lessonKey: mistake.lessonKey,
      lessonTitle: mistake.lessonTitle,
      skillKey: mistake.skillKey,
      skillName: mistake.skillName,
      minutes: 8,
      count: 2,
      mistake,
    });
  }

  const quizSkill = second.weakSkills[0];
  tasks.push({
    ...base,
    id: "quiz",
    kind: "quiz",
    lessonKey: second.key,
    lessonTitle: second.title,
    skillKey: second === first ? null : quizSkill?.key ?? null,
    skillName: second === first ? null : quizSkill?.name ?? null,
    minutes: 6,
    count: 3,
  });

  const target = (intensity === "intensive" ? 75 : intensity === "light" ? 30 : 45) + (input.overallMastery < 0.4 ? 15 : 0);
  const planned = tasks.reduce((sum, task) => sum + task.minutes, 0);
  return { day: input.day, intensity, minutes: Math.max(planned, target), reasons, tasks };
}

/** A task counts as done once graded (questions) or marked read (lesson). */
export function isTaskDone(task: PlanTask, gradedAssessments: Set<number>): boolean {
  if (task.kind === "lesson") return task.completedAt !== null;
  return task.assessmentId !== null && gradedAssessments.has(task.assessmentId);
}

export function planProgress(plan: DailyPlan, gradedAssessments: Set<number>) {
  const done = plan.tasks.filter(task => isTaskDone(task, gradedAssessments)).length;
  return { done, total: plan.tasks.length, percent: plan.tasks.length ? Math.round((done / plan.tasks.length) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Motivation: points and badges (computed from real activity, never stored
// twice). No public ranking: a student's points are only shown to them.
// ---------------------------------------------------------------------------

export type ActivityTotals = {
  correctAnswers: number;
  answers: number;
  gradedSets: number;
  planTasksDone: number;
  placementTaken: boolean;
  mockExams: number;
  weeklyTests: number;
  bestStreak: number;
  /** Mastery of the student's best subject, 0–1. */
  bestSubjectMastery: number;
};

export function computePoints(totals: ActivityTotals): number {
  return (
    totals.correctAnswers * 2 +
    totals.gradedSets * 10 +
    totals.planTasksDone * 15 +
    (totals.mockExams + totals.weeklyTests) * 30 +
    (totals.placementTaken ? 20 : 0)
  );
}

export function computeBadges(totals: ActivityTotals): BadgeKey[] {
  const earned: BadgeKey[] = [];
  if (totals.placementTaken || totals.gradedSets > 0) earned.push("first_test");
  if (totals.mockExams > 0) earned.push("first_mock");
  if (totals.weeklyTests > 0) earned.push("first_weekly");
  if (totals.answers >= 50) earned.push("exercises_50");
  if (totals.answers >= 200) earned.push("exercises_200");
  if (totals.bestStreak >= 3) earned.push("streak_3");
  if (totals.bestStreak >= 7) earned.push("streak_7");
  if (totals.bestStreak >= 30) earned.push("streak_30");
  if (totals.bestSubjectMastery >= 0.5) earned.push("subject_half");
  if (totals.bestSubjectMastery >= 0.85) earned.push("subject_mastered");
  return earned;
}
