// Pure unit tests — no network, no DB, no mocked services. Covers
// acceptance criteria #1 and #2 (exact point distribution for N=3,6,7 and
// per-question rubric sums).
import { test } from "node:test";
import assert from "node:assert/strict";
import { distributeEqualPoints, distributeWeightedPoints, toHundredths } from "../src/lib/points";

test("distributeEqualPoints(20, 3) sums to exactly 20", () => {
  const shares = distributeEqualPoints(20, 3);
  assert.equal(shares.length, 3);
  const sum = shares.reduce((s, x) => s + x, 0);
  assert.equal(Math.round(sum * 100) / 100, 20);
});

test("distributeEqualPoints(20, 6) sums to exactly 20", () => {
  const shares = distributeEqualPoints(20, 6);
  const sum = shares.reduce((s, x) => s + x, 0);
  assert.equal(Math.round(sum * 100) / 100, 20);
});

test("distributeEqualPoints(20, 7) sums to exactly 20", () => {
  const shares = distributeEqualPoints(20, 7);
  const sum = shares.reduce((s, x) => s + x, 0);
  assert.equal(Math.round(sum * 100) / 100, 20);
});

test("distributeEqualPoints never produces the old 6.7x3=20.1 bug", () => {
  // The bug this replaces: Math.round((20/3)*10)/10 = 6.7, and 6.7*3 = 20.1.
  const shares = distributeEqualPoints(20, 3);
  const naiveBuggyShare = Math.round((20 / 3) * 10) / 10;
  assert.notEqual(shares.reduce((s, x) => s + x, 0), naiveBuggyShare * 3);
  assert.equal(shares.reduce((s, x) => s + x, 0), 20);
});

test("distributeWeightedPoints sums to exactly the question's points regardless of weights", () => {
  const weights = [2, 2, 1]; // proportional, like a raw model-proposed rubric
  const shares = distributeWeightedPoints(6.67, weights);
  const sum = Math.round(shares.reduce((s, x) => s + x, 0) * 100) / 100;
  assert.equal(sum, 6.67);
});

test("distributeWeightedPoints with 7 uneven weights still sums exactly", () => {
  const weights = [1, 3, 2, 5, 1, 1, 4];
  const total = 20;
  const shares = distributeWeightedPoints(total, weights);
  const sum = Math.round(shares.reduce((s, x) => s + x, 0) * 100) / 100;
  assert.equal(sum, total);
});

test("toHundredths rounds to the nearest integer cent", () => {
  assert.equal(toHundredths(6.666666), 667);
  assert.equal(toHundredths(6.664), 666);
});
