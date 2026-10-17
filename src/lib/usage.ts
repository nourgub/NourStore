import { getUsageCount, incrementUsageCount, markFreeTrialUsed } from "./db";
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

// Throws a clear Arabic error if the teacher's plan doesn't include this
// feature at all, or if they've already used up this month's allowance.
// A teacher with no plan but an unused free trial is let through once.
// Does not consume a usage slot by itself — call recordUsage after the
// feature's action actually runs (see createGeneration/createLessonPrep/
// submitStudentPaper call sites).
export function assertFeatureAllowed(teacher: Teacher, feature: UsageFeature): void {
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

  const limit = plan.limits[feature];
  const used = getUsageCount(teacher.id, currentPeriod(), feature);
  if (used >= limit) {
    throw new UsageLimitError(
      `لقد بلغت الحد الشهري لميزة ${featureLabel(feature)} ضمن باقتك "${plan.displayName}" (${used}/${limit}). ` +
        `سيتجدد الحد في بداية الشهر القادم، أو يمكنك الترقية لباقة أعلى.`,
    );
  }
}

// Call once the feature's action actually succeeds. A teacher still on
// their free trial (no plan yet) has that trial marked used instead of
// incrementing a monthly counter that doesn't apply to them yet.
export function recordUsage(teacher: Teacher, feature: UsageFeature): void {
  if (!teacher.planId) {
    markFreeTrialUsed(teacher.id);
    return;
  }
  incrementUsageCount(teacher.id, currentPeriod(), feature);
}

// Checks plan inclusion only, without touching the monthly cap — for
// prerequisite actions (starting a grading session, uploading a lesson-prep
// template) that don't themselves consume a usage slot. Same free-trial
// carve-out as assertFeatureAllowed.
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
