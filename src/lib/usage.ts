import { getUsageCount, reserveUsageAtomic, releaseUsageAtomic, reserveFreeTrialAtomic } from "./db";
import { featureLabel, PLANS } from "./plans";
import type { Teacher, UsageFeature } from "./types";

export class UsageLimitError extends Error {}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// A teacher who never had a plan (never paid) gets exactly one free
// operation, any single feature, before the paywall applies.
export function hasFreeTrialAvailable(teacher: Teacher): boolean {
  return !teacher.planId && !teacher.freeTrialUsedAt;
}

// Atomically checks the plan/limit AND consumes one usage slot in the same
// step — call this BEFORE starting the feature's actual (often slow, async)
// work, never after. The old pattern (assertFeatureAllowed, await the work,
// then recordUsage on success) left a real race window: several concurrent
// requests near the monthly cap could all pass the check before any of them
// recorded usage, oversubscribing the plan. `operationId` must be a stable
// id for this specific operation (the exam-generation request id, the
// student-paper id, …) — calling this again with the same id is always
// a safe no-op, so a client retry can never double-charge.
//
// Returns a `release()` callback you MUST call if the operation ultimately
// fails (the service errored, the AI call failed) — this refunds the slot,
// per this project's "a failure must never cost a paid teacher their
// quota" rule. On success, simply don't call it.
export function reserveUsage(teacher: Teacher, feature: UsageFeature, operationId: string): { release: () => void } {
  if (!teacher.planId) {
    if (!reserveFreeTrialAtomic(operationId, teacher.id)) {
      throw new UsageLimitError(
        "اشتراكك غير مفعّل، وقد استعملت تجربتك المجانية الوحيدة بالفعل — يجب اختيار باقة وتفعيلها.",
      );
    }
    return { release: () => releaseUsageAtomic(operationId) };
  }

  const plan = PLANS[teacher.planId];
  if (!plan.features[feature]) {
    throw new UsageLimitError(
      `باقتك الحالية "${plan.displayName}" لا تشمل ميزة ${featureLabel(feature)}. يمكنك الترقية من صفحة الاشتراك.`,
    );
  }

  const period = currentPeriod();
  const limit = plan.limits[feature];
  const reserved = reserveUsageAtomic(operationId, teacher.id, period, feature, limit);
  if (!reserved) {
    const used = getUsageCount(teacher.id, period, feature);
    throw new UsageLimitError(
      `لقد بلغت الحد الشهري لميزة ${featureLabel(feature)} ضمن باقتك "${plan.displayName}" (${used}/${limit}). ` +
        `سيتجدد الحد في بداية الشهر القادم، أو يمكنك الترقية لباقة أعلى.`,
    );
  }
  return { release: () => releaseUsageAtomic(operationId) };
}

// Standalone release for code that only knows the operationId, far from
// where reserveUsage was originally called — e.g. a background grading job
// releasing a student paper's reservation once it permanently fails, long
// after the HTTP request that submitted it has returned. Same no-op-if-
// already-released/never-reserved safety as the release() reserveUsage
// returns (they're backed by the same releaseUsageAtomic).
export function releaseUsage(operationId: string): void {
  releaseUsageAtomic(operationId);
}

// Checks plan inclusion only, without touching the monthly cap — for
// prerequisite actions (starting a grading session, uploading a lesson-prep
// template) that don't themselves consume a usage slot. Same free-trial
// carve-out as reserveUsage.
export function assertFeatureEnabled(teacher: Teacher, feature: UsageFeature): void {
  if (!teacher.planId) {
    if (hasFreeTrialAvailable(teacher)) return;
    throw new UsageLimitError(
      "اشتراكك غير مفعّل، وقد استعملت تجربتك المجانية الوحيدة بالفعل — يجب اختيار باقة وتفعيلها.",
    );
  }
  const plan = PLANS[teacher.planId];
  if (!plan.features[feature]) {
    throw new UsageLimitError(
      `باقتك الحالية "${plan.displayName}" لا تشمل ميزة ${featureLabel(feature)}. يمكنك الترقية من صفحة الاشتراك.`,
    );
  }
}

export interface UsageSummaryEntry {
  feature: UsageFeature;
  label: string;
  enabled: boolean;
  used: number;
  limit: number;
}

export function getUsageSummary(teacher: Teacher): UsageSummaryEntry[] {
  const features: UsageFeature[] = ["lessonPrep", "exams", "grading"];
  if (!teacher.planId) {
    return features.map((feature) => ({ feature, label: featureLabel(feature), enabled: false, used: 0, limit: 0 }));
  }
  const plan = PLANS[teacher.planId];
  const period = currentPeriod();
  return features.map((feature) => ({
    feature,
    label: featureLabel(feature),
    enabled: plan.features[feature],
    used: plan.features[feature] ? getUsageCount(teacher.id, period, feature) : 0,
    limit: plan.limits[feature],
  }));
}
