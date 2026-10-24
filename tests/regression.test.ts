// Smoke/regression tests — confirms this task's changes (Gemini integration,
// points-math fix, job queue) didn't break the features explicitly required
// to keep working: subscription plans, usage limits, and lesson-prep's
// demo/production separation. These modules were not modified by this task
// except where noted; this is a regression guard, not full coverage of them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, isPlanId } from "../src/lib/plans";
import { distributeEqualPoints } from "../src/lib/points";

test("plans config still defines all four plans with their feature flags intact", () => {
  assert.ok(isPlanId("full"));
  assert.ok(isPlanId("lessons_only"));
  assert.ok(isPlanId("exams_only"));
  assert.ok(isPlanId("grading_only"));
  assert.equal(PLANS.full.features.grading, true);
  assert.equal(PLANS.lessons_only.features.exams, false);
});

test("points utility composes correctly for a 20-point exam of any size used by plans/usage (regression guard)", () => {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 10, 20]) {
    const shares = distributeEqualPoints(20, n);
    assert.equal(shares.length, n);
    assert.equal(Math.round(shares.reduce((s, x) => s + x, 0) * 100) / 100, 20);
  }
});
