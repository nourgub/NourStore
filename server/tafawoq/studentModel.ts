// Tafawoq AI Teacher — student model.
//
// Pure functions only (no database, no network) so every decision the
// teacher makes about a student is deterministic and unit-testable:
//
//   * Knowledge tracing — Bayesian Knowledge Tracing (Corbett & Anderson)
//     per skill. Each answer updates P(skill known) from the evidence,
//     with guess/slip rates that depend on the item (a 4-option MCQ is
//     easier to guess than a typed answer; a hard item is easier to slip
//     on). Placement answers update without a learning transition (no
//     instruction happened between items); practice answers include one.
//   * Student modeling — tier, strengths, weaknesses, recurring errors,
//     learning speed, lesson completion.
//   * Recommendation — which skills to teach next, respecting the lesson's
//     prerequisite graph, and a step-by-step personal learning plan.
import type { LearningSpeed, Tier } from "@shared/tafawoq";
import type { Lesson } from "./curriculum";

export const PRIOR_KNOWN = 0.3;
export const MASTERED = 0.85;
export const STRENGTH = 0.7;
export const WEAKNESS = 0.5;
const PREREQUISITE_READY = 0.6;

export type SkillState = {
  skill: string;
  pKnown: number;
  attempts: number;
  correct: number;
};

export type Observation = {
  skill: string;
  correct: boolean;
  difficulty: 1 | 2 | 3;
  type: "mcq" | "short";
  optionsCount?: number;
};

export function itemParams(observation: Observation) {
  const guess =
    observation.type === "mcq"
      ? Math.min(0.3, 1 / Math.max(2, observation.optionsCount ?? 4))
      : 0.05;
  // Slip grows with difficulty; the floor keeps one wrong answer on a
  // placement test from reading as "knows nothing" (1%).
  const slip = 0.12 + 0.05 * (observation.difficulty - 1);
  return { guess, slip };
}

/** One BKT step: posterior given the answer, then (optionally) learning. */
export function bktUpdate(
  pKnown: number,
  observation: Observation,
  options: { learning: boolean }
): number {
  const { guess, slip } = itemParams(observation);
  const posterior = observation.correct
    ? (pKnown * (1 - slip)) / (pKnown * (1 - slip) + (1 - pKnown) * guess)
    : (pKnown * slip) / (pKnown * slip + (1 - pKnown) * (1 - guess));
  // Harder items teach more when practiced successfully — a small,
  // bounded transition so one lucky answer can't declare mastery.
  const transit = options.learning ? 0.08 + 0.04 * (observation.difficulty - 1) : 0;
  const next = posterior + (1 - posterior) * transit;
  return clamp(next, 0.05, 0.99);
}

export function applyObservations(
  lesson: Lesson,
  previous: SkillState[],
  observations: Observation[],
  options: { learning: boolean }
): SkillState[] {
  const states = new Map<string, SkillState>();
  for (const skill of lesson.skills) {
    const existing = previous.find(state => state.skill === skill.key);
    states.set(
      skill.key,
      existing
        ? { ...existing }
        : { skill: skill.key, pKnown: PRIOR_KNOWN, attempts: 0, correct: 0 }
    );
  }
  for (const observation of observations) {
    const state = states.get(observation.skill);
    if (!state) continue;
    state.pKnown = bktUpdate(state.pKnown, observation, options);
    state.attempts += 1;
    if (observation.correct) state.correct += 1;
  }
  return lesson.skills.map(skill => states.get(skill.key)!);
}

export function overallMastery(states: SkillState[]): number {
  if (!states.length) return 0;
  return states.reduce((sum, state) => sum + state.pKnown, 0) / states.length;
}

export function tierFor(mastery: number): Tier {
  if (mastery < 0.4) return "weak";
  if (mastery < 0.7) return "intermediate";
  return "advanced";
}

export function isLessonComplete(states: SkillState[]): boolean {
  return (
    states.length > 0 &&
    overallMastery(states) >= MASTERED &&
    states.every(state => state.pKnown >= STRENGTH)
  );
}

export type AttemptRecord = {
  correct: boolean;
  difficulty: 1 | 2 | 3;
  responseMs: number | null;
  misconception: string | null;
};

const EXPECTED_MS: Record<1 | 2 | 3, number> = { 1: 30_000, 2: 45_000, 3: 70_000 };

/**
 * Learning speed from real response data: how long the student takes
 * relative to an expected time per difficulty, combined with accuracy
 * (fast-and-wrong is not "fast learning"). Needs enough evidence first.
 */
export function learningSpeed(attempts: AttemptRecord[]): LearningSpeed {
  const timed = attempts.filter(
    attempt => attempt.responseMs !== null && attempt.responseMs > 0
  );
  if (timed.length < 5) return "unknown";
  const ratios = timed
    .map(attempt => attempt.responseMs! / EXPECTED_MS[attempt.difficulty])
    .sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const accuracy = timed.filter(attempt => attempt.correct).length / timed.length;
  if (accuracy < 0.35 || median > 1.4) return "slow";
  if (median < 0.75 && accuracy >= 0.7) return "fast";
  return "normal";
}

export type RecurringError = { key: string; label: string; count: number };

/** A misconception counts as recurring once it shows up at least twice. */
export function recurringErrors(
  lesson: Lesson,
  attempts: AttemptRecord[]
): RecurringError[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    if (!attempt.correct && attempt.misconception) {
      counts.set(attempt.misconception, (counts.get(attempt.misconception) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => ({
      key,
      // AI-graded answers store a free-text misconception instead of a key.
      label: lesson.misconceptions[key] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/** All misconceptions observed at least once — used right after placement. */
export function observedErrors(
  lesson: Lesson,
  attempts: AttemptRecord[]
): RecurringError[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    if (!attempt.correct && attempt.misconception) {
      counts.set(attempt.misconception, (counts.get(attempt.misconception) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: lesson.misconceptions[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);
}

export function skillName(lesson: Lesson, skillKey: string): string {
  return lesson.skills.find(skill => skill.key === skillKey)?.name ?? skillKey;
}

export function strengths(lesson: Lesson, states: SkillState[]) {
  return states
    .filter(state => state.attempts > 0 && state.pKnown >= STRENGTH)
    .sort((a, b) => b.pKnown - a.pKnown)
    .map(state => ({ skill: state.skill, name: skillName(lesson, state.skill), mastery: state.pKnown }));
}

export function weaknesses(lesson: Lesson, states: SkillState[]) {
  return states
    .filter(state => state.pKnown < WEAKNESS)
    .sort((a, b) => a.pKnown - b.pKnown)
    .map(state => ({ skill: state.skill, name: skillName(lesson, state.skill), mastery: state.pKnown }));
}

/**
 * Recommendation engine: the next skills to teach. A skill is a candidate
 * when it isn't mastered and every prerequisite is at least "ready" —
 * otherwise the weak prerequisite itself is taught first (walking back
 * down the graph). Weaker students get fewer focus skills at once.
 */
export function recommendFocusSkills(
  lesson: Lesson,
  states: SkillState[],
  tier: Tier
): string[] {
  const mastery = new Map(states.map(state => [state.skill, state.pKnown]));
  const known = (key: string) => mastery.get(key) ?? PRIOR_KNOWN;
  const ready = (key: string) =>
    (lesson.skills.find(skill => skill.key === key)?.prerequisites ?? []).every(
      prerequisite => known(prerequisite) >= PREREQUISITE_READY
    );
  const limit = tier === "weak" ? 1 : tier === "intermediate" ? 2 : 3;
  const candidates = lesson.skills
    .filter(skill => known(skill.key) < MASTERED && ready(skill.key))
    .sort((a, b) => known(a.key) - known(b.key));
  return candidates.slice(0, limit).map(skill => skill.key);
}

/** Target item difficulty for a skill — just above what the student can do now. */
export function targetDifficulty(pKnown: number): 1 | 2 | 3 {
  if (pKnown < 0.4) return 1;
  if (pKnown < 0.7) return 2;
  return 3;
}

export type PlanStep = {
  skill: string;
  name: string;
  mastery: number;
  status: "mastered" | "focus" | "next" | "locked";
  action: string;
};

const ACTIONS: Record<Tier, string> = {
  weak: "شرح مبسط خطوة بخطوة، أمثلة سهلة، ثم تمارين سهلة",
  intermediate: "شرح متوسط مع أمثلة متنوعة وتمارين متدرجة",
  advanced: "شرح معمق، تمارين صعبة ومسائل مركبة",
};

export function learningPlan(
  lesson: Lesson,
  states: SkillState[],
  tier: Tier
): PlanStep[] {
  const focus = new Set(recommendFocusSkills(lesson, states, tier));
  const mastery = new Map(states.map(state => [state.skill, state.pKnown]));
  return lesson.skills.map(skill => {
    const pKnown = mastery.get(skill.key) ?? PRIOR_KNOWN;
    const prerequisitesReady = skill.prerequisites.every(
      prerequisite => (mastery.get(prerequisite) ?? PRIOR_KNOWN) >= PREREQUISITE_READY
    );
    const status: PlanStep["status"] =
      pKnown >= MASTERED
        ? "mastered"
        : focus.has(skill.key)
          ? "focus"
          : prerequisitesReady
            ? "next"
            : "locked";
    const action =
      status === "mastered"
        ? "متقن — مراجعة سريعة فقط"
        : status === "locked"
          ? `بعد إتقان: ${skill.prerequisites.map(key => skillName(lesson, key)).join("، ")}`
          : ACTIONS[tier];
    return { skill: skill.key, name: skill.name, mastery: pKnown, status, action };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
