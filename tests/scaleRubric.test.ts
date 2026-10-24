// Pure unit test — no network, no DB. Covers acceptance criterion #2
// (criteria sums match the question's own points exactly) and the stable-id
// requirement (criterion ids are deterministic and unique per question).
import { test } from "node:test";
import assert from "node:assert/strict";
import { scaleRubricToBudget } from "../src/lib/agents/scaleRubric";

test("scaleRubricToBudget: criteria sum exactly equals the question's points", () => {
  const raw = [
    { criterion: "خطوة أولى", points: 2 },
    { criterion: "خطوة ثانية", points: 2 },
    { criterion: "النتيجة النهائية", points: 1 },
  ];
  const result = scaleRubricToBudget(raw, 6.67, "q_test1");
  const sum = Math.round(result.reduce((s, r) => s + r.points, 0) * 100) / 100;
  assert.equal(sum, 6.67);
});

test("scaleRubricToBudget: assigns stable, unique ids derived from the question id", () => {
  const raw = [
    { criterion: "أ", points: 1 },
    { criterion: "ب", points: 1 },
  ];
  const result = scaleRubricToBudget(raw, 4, "q_abc123");
  assert.equal(result[0].id, "q_abc123_c1");
  assert.equal(result[1].id, "q_abc123_c2");
  assert.notEqual(result[0].id, result[1].id);
});

test("scaleRubricToBudget: handles a single criterion without drift", () => {
  const result = scaleRubricToBudget([{ criterion: "فقط", points: 5 }], 3.33, "q_single");
  assert.equal(result.length, 1);
  assert.equal(result[0].points, 3.33);
});
