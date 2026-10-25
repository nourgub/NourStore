// Unit tests for the deterministic, code-computed structural/points check —
// distinct from Gemini's pedagogical review. No DB, no network: pure
// function over a GeneratedQuestion[] shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStructuralReview } from "../src/lib/examStructuralReview";

function baseExam() {
  return {
    numQuestions: 2,
    questions: [
      {
        id: "q1",
        topic: "الدوال",
        difficulty: "متوسط" as const,
        points: 12,
        prompt: "سؤال أول",
        solution: "حل أول",
        rubric: [
          { id: "q1_c1", criterion: "معيار أول", points: 8 },
          { id: "q1_c2", criterion: "معيار ثانٍ", points: 4 },
        ],
      },
      {
        id: "q2",
        topic: "الهندسة",
        difficulty: "سهل" as const,
        points: 8,
        prompt: "سؤال ثانٍ",
        solution: "حل ثانٍ",
        rubric: [{ id: "q2_c1", criterion: "معيار وحيد", points: 8 }],
      },
    ],
  };
}

test("a well-formed exam passes every structural check", () => {
  const review = computeStructuralReview(baseExam());
  assert.equal(review.passed, true);
  assert.equal(review.totalPoints, 20);
  assert.ok(review.checks.every((c) => c.passed));
});

test("an exam with no questions fails has_questions", () => {
  const review = computeStructuralReview({ numQuestions: 0, questions: [] });
  assert.equal(review.passed, false);
  const check = review.checks.find((c) => c.id === "has_questions")!;
  assert.equal(check.passed, false);
});

test("duplicate question ids are caught", () => {
  const exam = baseExam();
  exam.questions[1] = { ...exam.questions[1], id: "q1" };
  const review = computeStructuralReview(exam);
  assert.equal(review.checks.find((c) => c.id === "unique_question_ids")!.passed, false);
  assert.equal(review.passed, false);
});

test("duplicate criterion ids within one question are caught", () => {
  const exam = baseExam();
  exam.questions[0].rubric[1] = { ...exam.questions[0].rubric[1], id: "q1_c1" };
  const review = computeStructuralReview(exam);
  assert.equal(review.checks.find((c) => c.id === "unique_criterion_ids")!.passed, false);
});

test("a criteria sum that doesn't exactly match the question's points is caught (exact arithmetic, not float-tolerant)", () => {
  const exam = baseExam();
  exam.questions[0].rubric[1] = { ...exam.questions[0].rubric[1], points: 4.01 }; // sums to 12.01, not 12
  const review = computeStructuralReview(exam);
  const check = review.checks.find((c) => c.id === "criteria_sum_matches_question_points")!;
  assert.equal(check.passed, false);
  assert.match(check.detail, /12\.01/);
});

test("an empty prompt or solution is caught", () => {
  const exam = baseExam();
  exam.questions[0] = { ...exam.questions[0], solution: "   " };
  const review = computeStructuralReview(exam);
  assert.equal(review.checks.find((c) => c.id === "no_empty_prompt_or_solution")!.passed, false);
});

test("a zero or negative criterion point is caught", () => {
  const exam = baseExam();
  exam.questions[1].rubric[0] = { ...exam.questions[1].rubric[0], points: 0 };
  const review = computeStructuralReview(exam);
  assert.equal(review.checks.find((c) => c.id === "no_empty_or_nonpositive_criterion_points")!.passed, false);
});

test("an actual question count different from numQuestions is caught", () => {
  const exam = { ...baseExam(), numQuestions: 5 };
  const review = computeStructuralReview(exam);
  assert.equal(review.checks.find((c) => c.id === "question_count_matches_requested")!.passed, false);
});
