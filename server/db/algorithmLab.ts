import {
  and,
  desc,
  eq,
} from "drizzle-orm";
import {
  AlgorithmExercise,
  algorithmAttempts,
  algorithmExercises,
} from "../../drizzle/schema";
import { getDb } from "./shared";
import { awardPoints, checkAndAwardBadges } from "./gamification";
import {
  outputsMatch,
  parseInputString,
  runPseudocode,
} from "../../shared/pseudocodeInterpreter";

/**
 * Strips `hiddenCases` from testCasesJson before an exercise is sent to a
 * public-facing query. Without this, defining hidden test cases (so a
 * student can't just hardcode output matching the one case they can see)
 * would be pointless — the "hidden" cases would still be sitting in the
 * network response for anyone to read in devtools.
 */
function stripHiddenCases(exercise: AlgorithmExercise): AlgorithmExercise {
  try {
    const parsed = JSON.parse(exercise.testCasesJson);
    if (!("hiddenCases" in parsed)) return exercise;
    const { hiddenCases: _hiddenCases, ...publicRules } = parsed;
    return { ...exercise, testCasesJson: JSON.stringify(publicRules) };
  } catch {
    return exercise;
  }
}

export async function getAlgorithmExerciseBySlug(
  slug: string
): Promise<AlgorithmExercise | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(algorithmExercises)
    .where(
      and(
        eq(algorithmExercises.slug, slug),
        eq(algorithmExercises.isPublished, 1)
      )
    )
    .limit(1);
  return result[0] ? stripHiddenCases(result[0]) : undefined;
}

export async function getAlgorithmExerciseById(
  id: number
): Promise<AlgorithmExercise | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(algorithmExercises)
    .where(eq(algorithmExercises.id, id))
    .limit(1);
  return result[0];
}

export async function getPublishedAlgorithmExercises() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: algorithmExercises.id,
      slug: algorithmExercises.slug,
      difficulty: algorithmExercises.difficulty,
      titleAr: algorithmExercises.titleAr,
      titleFr: algorithmExercises.titleFr,
      titleEn: algorithmExercises.titleEn,
    })
    .from(algorithmExercises)
    .where(eq(algorithmExercises.isPublished, 1))
    .orderBy(algorithmExercises.createdAt);
}

export async function getAllAlgorithmExercises() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(algorithmExercises)
    .orderBy(desc(algorithmExercises.createdAt));
}

export async function createAlgorithmExercise(input: {
  slug: string;
  difficulty: "starter" | "easy" | "medium" | "hard";
  titleAr: string;
  titleFr: string;
  titleEn: string;
  statementAr: string;
  statementFr: string;
  statementEn: string;
  starterCode: string;
  testCasesJson: string;
  hintsJson?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(algorithmExercises).values({ ...input, isPublished: 0 });
}

export async function setAlgorithmExercisePublished(
  id: number,
  isPublished: boolean
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(algorithmExercises)
    .set({ isPublished: isPublished ? 1 : 0 })
    .where(eq(algorithmExercises.id, id));
  return true;
}

type DisplayCase = { input: string; output: string };

function parseDisplayCases(testCasesJson: string): DisplayCase[] {
  try {
    const data = JSON.parse(testCasesJson);
    return Array.isArray(data.displayCases) ? data.displayCases : [];
  } catch {
    return [];
  }
}

/**
 * Optional hidden test cases — same {input, output} shape as displayCases,
 * but never sent to the client (stripHiddenCases above strips them before
 * any public-facing query returns the exercise). Grading includes them in
 * the pass/fail total, but the per-case feedback for a hidden case omits
 * its input/expected/actual — otherwise the "hidden" case's real values
 * would just leak straight back out through the submit response instead.
 * Without this, defining hidden cases at all would be pointless: a learner
 * could hardcode output matching only the one case they can see.
 */
function parseHiddenCases(testCasesJson: string): DisplayCase[] {
  try {
    const data = JSON.parse(testCasesJson);
    return Array.isArray(data.hiddenCases) ? data.hiddenCases : [];
  } catch {
    return [];
  }
}

export type GradedAttempt = {
  status: "passed" | "failed" | "syntax_error" | "timeout";
  passedTests: number;
  totalTests: number;
  feedback: (
    | { hidden: false; input: string; expected: string; actual: string; passed: boolean }
    | { hidden: true; passed: boolean }
  )[];
  error: string | null;
};

/**
 * The single source of truth for grading: actually runs the learner's
 * pseudocode against every test case, server-side, using the real
 * interpreter (shared/pseudocodeInterpreter.ts) — not the previous
 * regex/substring pattern check, and not anything the client claims.
 */
export function gradeAlgorithmAttempt(
  exercise: AlgorithmExercise,
  code: string
): GradedAttempt {
  const visibleCases = parseDisplayCases(exercise.testCasesJson);
  const hiddenCases = parseHiddenCases(exercise.testCasesJson);
  const allCases = [
    ...visibleCases.map(c => ({ ...c, hidden: false as const })),
    ...hiddenCases.map(c => ({ ...c, hidden: true as const })),
  ];
  if (allCases.length === 0) {
    // No real test cases configured for this exercise yet — nothing to
    // execute against. Honest "failed" rather than a false "passed".
    return {
      status: "failed",
      passedTests: 0,
      totalTests: 0,
      feedback: [],
      error: "لا توجد حالات اختبار مُعرَّفة لهذا التمرين بعد.",
    };
  }

  const feedback: GradedAttempt["feedback"] = [];
  let runtimeError: string | null = null;
  let sawTimeout = false;

  for (const c of allCases) {
    let inputs: number[];
    let passed = false;
    let actual = "";
    try {
      inputs = parseInputString(c.input);
      const result = runPseudocode(code, inputs);
      if (!result.ok) {
        runtimeError = result.error;
        if (result.error && result.error.includes("حلقة لا نهائية")) sawTimeout = true;
      } else {
        actual = result.output.join(", ");
        passed = outputsMatch(result.output, c.output);
      }
    } catch {
      // parseInputString failed — treat as a failed case, not a crash.
    }
    feedback.push(
      c.hidden
        ? { hidden: true, passed }
        : { hidden: false, input: c.input, expected: c.output, actual, passed }
    );
  }

  const passedTests = feedback.filter(f => f.passed).length;
  const totalTests = allCases.length;
  const status: GradedAttempt["status"] =
    runtimeError && sawTimeout
      ? "timeout"
      : runtimeError
        ? "syntax_error"
        : passedTests === totalTests
          ? "passed"
          : "failed";

  return { status, passedTests, totalTests, feedback, error: runtimeError };
}

export async function saveAlgorithmAttempt(input: {
  exerciseId: number;
  userId: number;
  code: string;
  status: "passed" | "failed" | "syntax_error" | "timeout";
  passedTests: number;
  totalTests: number;
  feedbackJson?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(algorithmAttempts).values(input);
  if (input.status === "passed") {
    await awardPoints({
      userId: input.userId,
      reason: "algorithm_lab_passed",
      refId: input.exerciseId,
    });
    await checkAndAwardBadges(input.userId);
  }
  return result;
}

export async function getAlgorithmAttemptsForUser(
  userId: number,
  exerciseId?: number
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = exerciseId
    ? and(
        eq(algorithmAttempts.userId, userId),
        eq(algorithmAttempts.exerciseId, exerciseId)
      )
    : eq(algorithmAttempts.userId, userId);
  return db
    .select({
      id: algorithmAttempts.id,
      exerciseId: algorithmAttempts.exerciseId,
      status: algorithmAttempts.status,
      passedTests: algorithmAttempts.passedTests,
      totalTests: algorithmAttempts.totalTests,
      createdAt: algorithmAttempts.createdAt,
      exerciseSlug: algorithmExercises.slug,
      exerciseTitleAr: algorithmExercises.titleAr,
      exerciseTitleFr: algorithmExercises.titleFr,
      exerciseTitleEn: algorithmExercises.titleEn,
    })
    .from(algorithmAttempts)
    .leftJoin(
      algorithmExercises,
      eq(algorithmExercises.id, algorithmAttempts.exerciseId)
    )
    .where(conditions)
    .orderBy(desc(algorithmAttempts.createdAt))
    .limit(50);
}
