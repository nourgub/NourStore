// Covers the explicit requirement to log model usage, estimated cost,
// duration and page count per AI operation. Tests the DB-level
// insert/summary functions and the pricing estimator directly — no network
// calls (recordAiUsage never calls a provider, it only persists numbers
// already obtained elsewhere).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { estimateCostUsd } from "../src/lib/aiPricing";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-ai-usage-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let recordAiUsage: typeof import("../src/lib/aiUsageLog").recordAiUsage;
let getAiUsageCostSummary: typeof import("../src/lib/aiUsageLog").getAiUsageCostSummary;
let getPlatformAiUsageCostSummary: typeof import("../src/lib/aiUsageLog").getPlatformAiUsageCostSummary;

before(async () => {
  const db = await import("../src/lib/db");
  const aiUsageLog = await import("../src/lib/aiUsageLog");
  insertTeacher = db.insertTeacher;
  recordAiUsage = aiUsageLog.recordAiUsage;
  getAiUsageCostSummary = aiUsageLog.getAiUsageCostSummary;
  getPlatformAiUsageCostSummary = aiUsageLog.getPlatformAiUsageCostSummary;
});

function makeTeacher(id: string) {
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
  };
}

test("estimateCostUsd scales linearly with token counts for a known model", () => {
  const costFor1000 = estimateCostUsd("claude-sonnet-5", 1_000_000, 0);
  const costFor2000 = estimateCostUsd("claude-sonnet-5", 2_000_000, 0);
  assert.ok(costFor1000 > 0);
  assert.equal(Math.round(costFor2000 * 100) / 100, Math.round(costFor1000 * 2 * 100) / 100);
});

test("estimateCostUsd never returns zero for an unrecognized model (falls back to a known rate)", () => {
  const cost = estimateCostUsd("some-future-claude-model-xyz", 100_000, 50_000);
  assert.ok(cost > 0);
});

test("recordAiUsage persists a row readable via getAiUsageCostSummary, filtered to the right teacher", () => {
  const teacherId = "t_usage_log_1";
  const otherTeacherId = "t_usage_log_2";
  insertTeacher(makeTeacher(teacherId));
  insertTeacher(makeTeacher(otherTeacherId));

  recordAiUsage({
    teacherId,
    feature: "grading",
    operationId: "paper1",
    provider: "claude",
    model: "claude-sonnet-5",
    inputTokens: 2000,
    outputTokens: 500,
    durationMs: 3200,
    pageCount: 3,
  });
  recordAiUsage({
    teacherId: otherTeacherId,
    feature: "grading",
    operationId: "paper2",
    provider: "claude",
    model: "claude-sonnet-5",
    inputTokens: 2000,
    outputTokens: 500,
    durationMs: 1000,
  });

  const summary = getAiUsageCostSummary(teacherId, new Date(Date.now() - 60_000).toISOString());
  assert.equal(summary.totalCalls, 1, "must not include another teacher's usage");
  assert.ok(summary.totalCostUsd > 0);
  assert.equal(summary.totalDurationMs, 3200);
  assert.equal(summary.byFeature.length, 1);
  assert.equal(summary.byFeature[0].feature, "grading");
});

test("getAiUsageCostSummary excludes rows before the given date range", () => {
  const teacherId = "t_usage_log_range";
  insertTeacher(makeTeacher(teacherId));
  recordAiUsage({
    teacherId,
    feature: "grading",
    operationId: "paper_old",
    provider: "gemini",
    model: "gemini-flash-latest",
    inputTokens: 1000,
    outputTokens: 200,
    durationMs: 500,
  });

  const futureCutoff = new Date(Date.now() + 60_000).toISOString();
  const summary = getAiUsageCostSummary(teacherId, futureCutoff);
  assert.equal(summary.totalCalls, 0);
  assert.equal(summary.totalCostUsd, 0);
});

test("getPlatformAiUsageCostSummary aggregates across every teacher", () => {
  const teacherA = "t_usage_platform_a";
  const teacherB = "t_usage_platform_b";
  insertTeacher(makeTeacher(teacherA));
  insertTeacher(makeTeacher(teacherB));

  recordAiUsage({
    teacherId: teacherA,
    feature: "grading",
    operationId: "op_a",
    provider: "claude",
    model: "claude-sonnet-5",
    inputTokens: 1000,
    outputTokens: 200,
    durationMs: 100,
  });
  recordAiUsage({
    teacherId: teacherB,
    feature: "grading",
    operationId: "op_b",
    provider: "gemini",
    model: "gemini-flash-latest",
    inputTokens: 1000,
    outputTokens: 200,
    durationMs: 100,
  });

  const since = new Date(Date.now() - 60_000).toISOString();
  const before = getPlatformAiUsageCostSummary(new Date(Date.now() + 60_000).toISOString());
  const after = getPlatformAiUsageCostSummary(since);
  assert.equal(before.totalCalls, 0);
  assert.ok(after.totalCalls >= 2, "must include both teachers' usage");
});

test("recordAiUsage never throws even if called with implausible inputs (observability must never break the caller)", () => {
  assert.doesNotThrow(() =>
    recordAiUsage({
      teacherId: "t_does_not_exist_at_all",
      feature: "grading",
      operationId: "op_orphan",
      provider: "claude",
      model: "claude-sonnet-5",
      inputTokens: -5,
      outputTokens: 0,
      durationMs: 0,
    }),
  );
});
