// Regression test for the exact bug a teacher reported from a live demo-mode
// run: selecting an "ثانوي"/BAC-level topic like "النهايات والاستمرارية" or
// "الاشتقاق والدراسة التامة للدوال" (both defined in mathCurriculum.ts across
// most secondary streams) produced the generic "لا يغطي محور" fallback
// notice on every single question, because mockContent.ts's template bank
// didn't implement them. This checks the three newly added templates are
// actually wired up and never trigger that fallback, and that their rubric
// still sums exactly to the requested points budget.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMathQuestion, AVAILABLE_MATH_TOPICS } from "../src/lib/agents/mockContent";

const NEW_TOPICS = ["النهايات والاستمرارية", "الاشتقاق والدراسة التامة للدوال", "الدوال اللوغاريتمية والأسية"];

for (const topic of NEW_TOPICS) {
  test(`"${topic}" is a known topic with no demo-mode fallback notice`, () => {
    assert.ok(AVAILABLE_MATH_TOPICS.includes(topic));
    for (const difficulty of ["سهل", "متوسط", "صعب"] as const) {
      const q = generateMathQuestion(topic, difficulty, 4);
      assert.ok(!q.prompt.includes("لا يغطي محور"), `fallback notice leaked for ${topic}/${difficulty}`);
      assert.equal(q.topic, topic);
      assert.ok(q.prompt.length > 0);
      assert.ok(q.solution.length > 0);
    }
  });

  test(`"${topic}" rubric sums exactly to the requested points budget`, () => {
    for (const pointsBudget of [2, 3.34, 4, 6.67]) {
      const q = generateMathQuestion(topic, "متوسط", pointsBudget);
      const sum = Math.round(q.rubric.reduce((s, c) => s + c.points, 0) * 100) / 100;
      assert.equal(sum, pointsBudget);
      assert.ok(q.rubric.every((c) => c.id.startsWith(q.id)));
    }
  });
}

test("an unknown/unimplemented topic still falls back with the honest notice (regression guard)", () => {
  const q = generateMathQuestion("محور غير موجود إطلاقًا", "متوسط", 4);
  assert.ok(q.prompt.includes("لا يغطي محور"));
});
