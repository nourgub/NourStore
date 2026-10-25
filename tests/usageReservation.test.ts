// Tests the atomic usage-reservation system (src/lib/usage.ts's
// reserveUsage/releaseUsage, backed by db.ts's reserveUsageAtomic/
// releaseUsageAtomic/reserveFreeTrialAtomic). Replaces the old
// assertFeatureAllowed (check) + recordUsage (increment, called after an
// awaited AI call) pattern, which left a real race window: concurrent
// requests near the cap could all pass the check before any of them
// recorded usage. This also covers two explicit acceptance requirements:
// a failed operation must never permanently cost a quota slot, and a
// retried operation (same operationId) must never double-charge.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-usage-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let getUsageCount: typeof import("../src/lib/db").getUsageCount;
let reserveUsageAtomic: typeof import("../src/lib/db").reserveUsageAtomic;
let releaseUsageAtomic: typeof import("../src/lib/db").releaseUsageAtomic;
let reserveFreeTrialAtomic: typeof import("../src/lib/db").reserveFreeTrialAtomic;
let findTeacherById: typeof import("../src/lib/db").findTeacherById;
let reserveUsage: typeof import("../src/lib/usage").reserveUsage;
let releaseUsage: typeof import("../src/lib/usage").releaseUsage;
let UsageLimitError: typeof import("../src/lib/usage").UsageLimitError;

before(async () => {
  const db = await import("../src/lib/db");
  const usage = await import("../src/lib/usage");
  insertTeacher = db.insertTeacher;
  getUsageCount = db.getUsageCount;
  reserveUsageAtomic = db.reserveUsageAtomic;
  releaseUsageAtomic = db.releaseUsageAtomic;
  reserveFreeTrialAtomic = db.reserveFreeTrialAtomic;
  findTeacherById = db.findTeacherById;
  reserveUsage = usage.reserveUsage;
  releaseUsage = usage.releaseUsage;
  UsageLimitError = usage.UsageLimitError;
});

function makeTeacher(id: string, planId: "full" | "grading_only" | null = "full") {
  return {
    id,
    fullName: "أستاذ تجريبي",
    email: `${id}@test.local`,
    passwordHash: "x",
    passwordSalt: "y",
    subscriptionStatus: "active" as const,
    planId,
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
}

test("reserveUsageAtomic never allows more successful reservations than the limit, under rapid repeated attempts", () => {
  const teacherId = "t_usage_cap";
  insertTeacher(makeTeacher(teacherId));
  const limit = 5;
  let successes = 0;
  for (let i = 0; i < 20; i++) {
    const ok = reserveUsageAtomic(`cap-op-${i}`, teacherId, "2026-01", "exams", limit);
    if (ok) successes++;
  }
  assert.equal(successes, limit);
  assert.equal(getUsageCount(teacherId, "2026-01", "exams"), limit);
});

test("reserving the same operationId twice never double-charges (idempotent retry)", () => {
  const teacherId = "t_usage_idempotent";
  insertTeacher(makeTeacher(teacherId));
  const limit = 3;
  const first = reserveUsageAtomic("retry-op-1", teacherId, "2026-01", "exams", limit);
  const second = reserveUsageAtomic("retry-op-1", teacherId, "2026-01", "exams", limit);
  assert.equal(first, true);
  assert.equal(second, true); // idempotent: reports success again, but...
  assert.equal(getUsageCount(teacherId, "2026-01", "exams"), 1); // ...only charged once
});

test("releasing a reservation refunds the slot — a failure never permanently costs quota", () => {
  const teacherId = "t_usage_release";
  insertTeacher(makeTeacher(teacherId));
  reserveUsageAtomic("op-to-fail", teacherId, "2026-01", "exams", 10);
  assert.equal(getUsageCount(teacherId, "2026-01", "exams"), 1);
  releaseUsageAtomic("op-to-fail");
  assert.equal(getUsageCount(teacherId, "2026-01", "exams"), 0);
});

test("releasing an operation that was never reserved, or already released, is a safe no-op", () => {
  const teacherId = "t_usage_double_release";
  insertTeacher(makeTeacher(teacherId));
  releaseUsageAtomic("never-reserved"); // must not throw
  reserveUsageAtomic("op-x", teacherId, "2026-01", "exams", 10);
  releaseUsageAtomic("op-x");
  releaseUsageAtomic("op-x"); // second release of the same op must not under-flow the counter
  assert.equal(getUsageCount(teacherId, "2026-01", "exams"), 0);
});

test("releaseUsageAtomic never drives the counter negative", () => {
  const teacherId = "t_usage_floor";
  insertTeacher(makeTeacher(teacherId));
  releaseUsageAtomic("op-never-existed-either");
  assert.equal(getUsageCount(teacherId, "2026-01", "exams"), 0);
});

test("the free trial is reserved atomically and is single-use", () => {
  const teacherId = "t_usage_trial";
  insertTeacher(makeTeacher(teacherId, null));
  const first = reserveFreeTrialAtomic("trial-op-1", teacherId);
  const second = reserveFreeTrialAtomic("trial-op-2", teacherId); // different op, same teacher
  assert.equal(first, true);
  assert.equal(second, false);
  assert.ok(findTeacherById(teacherId)!.freeTrialUsedAt);
});

test("releasing a failed free-trial operation restores the trial", () => {
  const teacherId = "t_usage_trial_release";
  insertTeacher(makeTeacher(teacherId, null));
  reserveFreeTrialAtomic("trial-op-fail", teacherId);
  assert.ok(findTeacherById(teacherId)!.freeTrialUsedAt);
  releaseUsageAtomic("trial-op-fail");
  assert.equal(findTeacherById(teacherId)!.freeTrialUsedAt, null);
  // And the trial can now genuinely be used again.
  assert.equal(reserveFreeTrialAtomic("trial-op-retry", teacherId), true);
});

test("usage.ts's reserveUsage throws UsageLimitError once the plan's monthly cap is reached", () => {
  const teacherId = "t_usage_policy_cap";
  insertTeacher(makeTeacher(teacherId, "grading_only")); // limit 110 for grading per plans.ts
  // Exhaust it directly at the db layer to avoid 110 real reserveUsage calls.
  for (let i = 0; i < 110; i++) {
    reserveUsageAtomic(`policy-op-${i}`, teacherId, currentPeriodForTest(), "grading", 110);
  }
  const teacher = makeTeacher(teacherId, "grading_only");
  assert.throws(() => reserveUsage(teacher, "grading", "policy-op-111"), UsageLimitError);
});

test("usage.ts's reserveUsage rejects a feature the plan doesn't include at all", () => {
  const teacher = makeTeacher("t_usage_policy_feature", "grading_only"); // exams: false
  assert.throws(() => reserveUsage(teacher, "exams", "feature-op-1"), UsageLimitError);
});

test("usage.ts's release() callback correctly refunds via reserveUsage's own reservation", () => {
  const teacherId = "t_usage_release_wrapper";
  insertTeacher(makeTeacher(teacherId, "full"));
  const teacher = makeTeacher(teacherId, "full");
  const { release } = reserveUsage(teacher, "exams", "wrapper-op-1");
  assert.equal(getUsageCount(teacherId, currentPeriodForTest(), "exams"), 1);
  release();
  assert.equal(getUsageCount(teacherId, currentPeriodForTest(), "exams"), 0);
  // And the standalone releaseUsage (used from a background job, far from
  // the original reserveUsage call) does the exact same thing by id alone.
  reserveUsage(teacher, "exams", "wrapper-op-2");
  releaseUsage("wrapper-op-2");
  assert.equal(getUsageCount(teacherId, currentPeriodForTest(), "exams"), 0);
});

function currentPeriodForTest(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
