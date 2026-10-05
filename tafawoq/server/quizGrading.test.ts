import { describe, expect, it } from "vitest";
import { gradeAnswers, summarizeGrading } from "./quizGrading";

describe("quiz grading", () => {
  it("auto-grades choice and true_false questions against answerKey", () => {
    const graded = gradeAnswers(
      [
        { id: 1, questionType: "choice", answerKey: "B" },
        { id: 2, questionType: "true_false", answerKey: "true" },
      ],
      { "0": "B", "1": "false" }
    );
    expect(graded[0].isCorrect).toBe(true);
    expect(graded[1].isCorrect).toBe(false);
  });

  it("never compares open questions to answerKey — always leaves them pending review", () => {
    const graded = gradeAnswers(
      [
        {
          id: 3,
          questionType: "open",
          answerKey: "the exact expected essay text",
        },
      ],
      { "0": "the exact expected essay text" } // even an exact match to answerKey
    );
    expect(graded[0].isCorrect).toBeNull();
  });

  it("never compares code questions to answerKey — always leaves them pending review", () => {
    const graded = gradeAnswers(
      [{ id: 4, questionType: "code", answerKey: "def solve(): return 42" }],
      { "0": "def solve(): return 42" }
    );
    expect(graded[0].isCorrect).toBeNull();
  });

  it("marks the attempt pending_review and not passed while any answer is ungraded, regardless of score", () => {
    const graded = gradeAnswers(
      [
        { id: 1, questionType: "choice", answerKey: "A" },
        { id: 2, questionType: "open", answerKey: null },
      ],
      { "0": "A", "1": "anything" }
    );
    const summary = summarizeGrading(graded, 50);
    expect(summary.hasPending).toBe(true);
    expect(summary.status).toBe("pending_review");
    expect(summary.passed).toBe(false);
  });

  it("grades and can pass once every answer has a verdict (no pending questions)", () => {
    const graded = gradeAnswers(
      [
        { id: 1, questionType: "choice", answerKey: "A" },
        { id: 2, questionType: "true_false", answerKey: "true" },
      ],
      { "0": "A", "1": "true" }
    );
    const summary = summarizeGrading(graded, 60);
    expect(summary.status).toBe("graded");
    expect(summary.score).toBe(100);
    expect(summary.passed).toBe(true);
  });
});
