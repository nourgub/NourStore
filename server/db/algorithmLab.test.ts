import { describe, expect, it } from "vitest";
import type { AlgorithmExercise } from "../../drizzle/schema";
import { gradeAlgorithmAttempt, getAlgorithmExerciseBySlug } from "./algorithmLab";

function fakeExercise(testCasesJson: string): AlgorithmExercise {
  return {
    id: 1,
    slug: "sum-two-numbers",
    difficulty: "starter",
    titleAr: "ت",
    titleFr: "T",
    titleEn: "T",
    statementAr: "س",
    statementFr: "S",
    statementEn: "S",
    starterCode: "",
    testCasesJson,
    hintsJson: null,
    isPublished: 1,
    createdAt: new Date(),
  };
}

const SUM_CODE = `DEBUT\nREAD(A)\nREAD(B)\nSUM ← A + B\nWRITE(SUM)\nFIN`;
// Hardcodes the answer for the one visible case (2,3 -> 5) without real logic.
const CHEATING_CODE = `DEBUT\nREAD(A)\nREAD(B)\nWRITE(5)\nFIN`;

describe("gradeAlgorithmAttempt — hidden test cases", () => {
  it("grades against hidden cases even though they aren't shown to the learner", () => {
    const exercise = fakeExercise(
      JSON.stringify({
        displayCases: [{ input: "2, 3", output: "5" }],
        hiddenCases: [{ input: "10, 20", output: "30" }],
      })
    );
    const graded = gradeAlgorithmAttempt(exercise, SUM_CODE);
    expect(graded.status).toBe("passed");
    expect(graded.totalTests).toBe(2);
    expect(graded.passedTests).toBe(2);
  });

  it("catches a solution hardcoded to only the visible case via the hidden case", () => {
    const exercise = fakeExercise(
      JSON.stringify({
        displayCases: [{ input: "2, 3", output: "5" }],
        hiddenCases: [{ input: "10, 20", output: "30" }],
      })
    );
    const graded = gradeAlgorithmAttempt(exercise, CHEATING_CODE);
    // Passes the one case it can see...
    const visible = graded.feedback.find(f => !f.hidden);
    expect(visible?.passed).toBe(true);
    // ...but the hidden case exposes it, and the overall status must be "failed".
    expect(graded.status).toBe("failed");
    expect(graded.passedTests).toBe(1);
    expect(graded.totalTests).toBe(2);
  });

  it("never includes input/expected/actual for a hidden case in the feedback", () => {
    const exercise = fakeExercise(
      JSON.stringify({
        displayCases: [{ input: "2, 3", output: "5" }],
        hiddenCases: [{ input: "99, 1", output: "100" }],
      })
    );
    const graded = gradeAlgorithmAttempt(exercise, SUM_CODE);
    const hiddenEntry = graded.feedback.find(f => f.hidden);
    expect(hiddenEntry).toBeDefined();
    expect(hiddenEntry).not.toHaveProperty("input");
    expect(hiddenEntry).not.toHaveProperty("expected");
    expect(hiddenEntry).not.toHaveProperty("actual");
    // Structural proof, not just a TS-type check: the real hidden values
    // must not appear anywhere in the serialized feedback.
    const serialized = JSON.stringify(graded.feedback);
    expect(serialized).not.toContain("99, 1");
    expect(serialized).not.toContain('"100"');
  });

  it("grades correctly with only hidden cases and no visible ones", () => {
    const exercise = fakeExercise(
      JSON.stringify({ displayCases: [], hiddenCases: [{ input: "1, 1", output: "2" }] })
    );
    const graded = gradeAlgorithmAttempt(exercise, SUM_CODE);
    expect(graded.status).toBe("passed");
    expect(graded.totalTests).toBe(1);
  });

  it("works unchanged for exercises with no hiddenCases field at all (backward compatible)", () => {
    const exercise = fakeExercise(
      JSON.stringify({ displayCases: [{ input: "2, 3", output: "5" }] })
    );
    const graded = gradeAlgorithmAttempt(exercise, SUM_CODE);
    expect(graded.status).toBe("passed");
    expect(graded.totalTests).toBe(1);
    expect(graded.feedback.every(f => !f.hidden)).toBe(true);
  });
});

describe("getAlgorithmExerciseBySlug — hiddenCases never leak to a public caller", () => {
  it("returns undefined instead of throwing when no database is configured (contract-only mode)", async () => {
    await expect(getAlgorithmExerciseBySlug("anything")).resolves.toBeUndefined();
  });
});
