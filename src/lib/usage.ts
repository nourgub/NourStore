import { getUsageCount, reserveUsageAtomic, releaseUsageAtomic, reserveFreeTrialAtomic } from "./db";
import { featureLabel, PLANS } from "./plans";
import { SUBSCRIPTION_PERIOD_DAYS } from "./billing";
import type { Teacher, UsageFeature } from "./types";

export class UsageLimitError extends Error {}

// The quota cycle is anchored to the teacher's OWN subscription cycle, not
// the calendar month — a teacher who subscribes on the 20th must get a full
// SUBSCRIPTION_PERIOD_DAYS before their quota resets, not just the handful
// of days left until the 1st (and a teacher subscribing on the 1st shouldn't
// get a "free" top-up on the 1st of next month either). billing.ts always
// extends subscriptionExpiresAt by exactly SUBSCRIPTION_PERIOD_DAYS on each
// renewal, so the current cycle's start is simply
// `expiresAt - SUBSCRIPTION_PERIOD_DAYS` — no separate "cycle start" column
// to keep in sync, and it moves forward automatically on each renewal. A
// teacher with no expiry at all (a never-expiring account predating this
// field) falls back to a calendar-month period, since there is no cycle to
// anchor to.
function currentPeriodStart(teacher: Teacher): Date {
  if (teacher.subscriptionExpiresAt) {
    const cycleStartMs =
      new Date(teacher.subscriptionExpiresAt).getTime() - SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    return new Date(cycleStartMs);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function currentPeriod(teacher: Teacher): string {
  if (teacher.subscriptionExpiresAt) {
    return currentPeriodStart(teacher).toISOString().slice(0, 10);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// The server-side subscription gate: a plan id alone is not proof of a live
// subscription (it stays set after expiry/rejection — only subscriptionStatus
// and subscriptionExpiresAt change), so every paid-feature check must verify
// both explicitly here rather than trusting the caller already did. Never
// called for a teacher with no plan at all — that path is the free trial,
// gated separately below.
function assertSubscriptionActive(teacher: Teacher): void {
  const expired =
    teacher.subscriptionExpiresAt !== null && new Date(teacher.subscriptionExpiresAt).getTime() <= Date.now();
  if (teacher.subscriptionStatus !== "active" || expired) {
    throw new UsageLimitError(
      teacher.subscriptionStatus === "rejected"
        ? "تم رفض طلب اشتراكك الأخير — راجع الإدارة أو أرسل وصل دفع جديدًا من صفحة الاشتراك."
        : "اشتراكك غير نشط حاليًا (منتهٍ أو بانتظار التفعيل) — يجب تجديده لمتابعة استعمال هذه الميزة.",
    );
  }
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

  assertSubscriptionActive(teacher);

  const plan = PLANS[teacher.planId];
  if (!plan.features[feature]) {
    throw new UsageLimitError(
      `باقتك الحالية "${plan.displayName}" لا تشمل ميزة ${featureLabel(feature)}. يمكنك الترقية من صفحة الاشتراك.`,
    );
  }

  const period = currentPeriod(teacher);
  const limit = plan.limits[feature];
  const reserved = reserveUsageAtomic(operationId, teacher.id, period, feature, limit);
  if (!reserved) {
    const used = getUsageCount(teacher.id, period, feature);
    throw new UsageLimitError(
      `لقد بلغت حد ميزة ${featureLabel(feature)} ضمن باقتك "${plan.displayName}" لهذه الدورة (${used}/${limit}). ` +
        renewalHint(teacher) +
        " أو يمكنك الترقية لباقة أعلى.",
    );
  }
  return { release: () => releaseUsageAtomic(operationId) };
}

function renewalHint(teacher: Teacher): string {
  if (!teacher.subscriptionExpiresAt) return "سيتجدد الحد في بداية الشهر القادم.";
  return `سيتجدد الحد مع دورة اشتراكك القادمة بتاريخ ${new Date(teacher.subscriptionExpiresAt).toLocaleDateString("ar")}.`;
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
  assertSubscriptionActive(teacher);
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
  const period = currentPeriod(teacher);
  return features.map((feature) => ({
    feature,
    label: featureLabel(feature),
    enabled: plan.features[feature],
    used: plan.features[feature] ? getUsageCount(teacher.id, period, feature) : 0,
    limit: plan.limits[feature],
  }));
}
