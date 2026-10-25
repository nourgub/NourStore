// Covers two explicitly-required fixes to the quota system:
// 1. "اشتراك منتهي يُرفض مباشرة من الخدمة" (a mandatory acceptance test) —
//    reserveUsage/assertFeatureEnabled must reject an expired, pending, or
//    rejected subscription directly, not just rely on a plan id still being
//    set (it stays set after expiry — only subscriptionStatus/expiresAt
//    change) or on a caller having already self-healed the status.
// 2. "وحّد دورة الحصص مع دورة الاشتراك" — the quota period must be anchored
//    to the teacher's own subscription cycle (subscriptionExpiresAt), not
//    the calendar month, so a mid-month subscriber gets a full cycle before
//    their quota resets, and renewing moves the cycle forward automatically.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-usage-cycle-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let reserveUsage: typeof import("../src/lib/usage").reserveUsage;
let assertFeatureEnabled: typeof import("../src/lib/usage").assertFeatureEnabled;
let UsageLimitError: typeof import("../src/lib/usage").UsageLimitError;
let getUsageSummary: typeof import("../src/lib/usage").getUsageSummary;
let SUBSCRIPTION_PERIOD_DAYS: typeof import("../src/lib/billing").SUBSCRIPTION_PERIOD_DAYS;

before(async () => {
  const db = await import("../src/lib/db");
  const usage = await import("../src/lib/usage");
  const billing = await import("../src/lib/billing");
  insertTeacher = db.insertTeacher;
  reserveUsage = usage.reserveUsage;
  assertFeatureEnabled = usage.assertFeatureEnabled;
  UsageLimitError = usage.UsageLimitError;
  getUsageSummary = usage.getUsageSummary;
  SUBSCRIPTION_PERIOD_DAYS = billing.SUBSCRIPTION_PERIOD_DAYS;
});

function makeTeacher(
  id: string,
  overrides: Partial<{
    subscriptionStatus: "pending" | "active" | "expired" | "rejected";
    subscriptionExpiresAt: string | null;
  }> = {},
) {
  return {
    id,
    fullName: "أستاذ تجريبي",
    email: `${id}@test.local`,
    passwordHash: "x",
    passwordSalt: "y",
    subscriptionStatus: "active" as const,
    planId: "full" as const,
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

test("reserveUsage rejects an expired subscription directly, even though planId is still set", () => {
  const teacherId = "t_cycle_expired";
  const teacher = makeTeacher(teacherId, { subscriptionStatus: "expired", subscriptionExpiresAt: daysFromNow(-1) });
  insertTeacher(teacher);
  assert.throws(() => reserveUsage(teacher, "exams", "op-expired-1"), UsageLimitError);
});

test("reserveUsage rejects a subscription whose status lapsed even if subscriptionExpiresAt looks unset", () => {
  const teacherId = "t_cycle_pending";
  const teacher = makeTeacher(teacherId, { subscriptionStatus: "pending" });
  insertTeacher(teacher);
  assert.throws(() => reserveUsage(teacher, "exams", "op-pending-1"), UsageLimitError);
});

test("reserveUsage rejects a rejected subscription with a distinct message", () => {
  const teacherId = "t_cycle_rejected";
  const teacher = makeTeacher(teacherId, { subscriptionStatus: "rejected" });
  insertTeacher(teacher);
  assert.throws(() => reserveUsage(teacher, "exams", "op-rejected-1"), (err: unknown) => {
    return err instanceof UsageLimitError && /رُفض|رفض/.test(err.message);
  });
});

test("assertFeatureEnabled also rejects an expired subscription (the prerequisite-check path)", () => {
  const teacherId = "t_cycle_prereq";
  const teacher = makeTeacher(teacherId, { subscriptionStatus: "expired", subscriptionExpiresAt: daysFromNow(-5) });
  insertTeacher(teacher);
  assert.throws(() => assertFeatureEnabled(teacher, "grading"), UsageLimitError);
});

test("a genuinely active, unexpired subscription is never blocked by the new check", () => {
  const teacherId = "t_cycle_active";
  const teacher = makeTeacher(teacherId, { subscriptionStatus: "active", subscriptionExpiresAt: daysFromNow(10) });
  insertTeacher(teacher);
  assert.doesNotThrow(() => reserveUsage(teacher, "exams", "op-active-1"));
});

test("two usage checks within the same subscription cycle share one quota period, independent of calendar month", () => {
  // Anchor the subscription so its cycle start falls a few days before
  // today's date, regardless of which calendar month "today" is in — the
  // whole point is that this must not depend on calendar-month boundaries.
  const expiresAt = daysFromNow(SUBSCRIPTION_PERIOD_DAYS - 3);
  const teacherId = "t_cycle_same_period";
  const teacher = makeTeacher(teacherId, { subscriptionExpiresAt: expiresAt });
  insertTeacher(teacher);

  reserveUsage(teacher, "exams", "cycle-op-1");
  reserveUsage(teacher, "exams", "cycle-op-2");

  const summary = getUsageSummary(teacher).find((e) => e.feature === "exams")!;
  assert.equal(summary.used, 2, "both reservations landed in the same subscription-cycle period");
});

test("renewing the subscription (a later subscriptionExpiresAt) starts a fresh quota period", () => {
  const teacherId = "t_cycle_renewed";
  const firstExpiry = daysFromNow(5);
  const teacherBeforeRenewal = makeTeacher(teacherId, { subscriptionExpiresAt: firstExpiry });
  insertTeacher(teacherBeforeRenewal);
  reserveUsage(teacherBeforeRenewal, "exams", "renew-op-old-cycle");

  const beforeSummary = getUsageSummary(teacherBeforeRenewal).find((e) => e.feature === "exams")!;
  assert.equal(beforeSummary.used, 1);

  // Simulate approvePaymentRequest extending the cycle by a full period.
  const teacherAfterRenewal = { ...teacherBeforeRenewal, subscriptionExpiresAt: daysFromNow(5 + SUBSCRIPTION_PERIOD_DAYS) };
  const afterSummary = getUsageSummary(teacherAfterRenewal).find((e) => e.feature === "exams")!;
  assert.equal(afterSummary.used, 0, "the new cycle starts with a clean quota, not carrying over the old cycle's usage");
});
