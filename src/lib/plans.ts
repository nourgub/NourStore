import type { PlanId, UsageFeature } from "./types";

export interface PlanDefinition {
  id: PlanId;
  displayName: string;
  priceLabel: string;
  features: Record<UsageFeature, boolean>;
  // Monthly caps. Only meaningful where the matching `features` flag is true.
  limits: Record<UsageFeature, number>;
}

// Pricing/caps derived from a per-teacher cost analysis against Claude Sonnet 5
// usage (see conversation with the platform owner): the comprehensive plan's
// caps keep gross margin positive even at the Algerian parallel-market USD/DZD
// rate; the specialized plans are priced for a teacher who only needs one
// pillar of the platform.
export const PLANS: Record<PlanId, PlanDefinition> = {
  full: {
    id: "full",
    displayName: "الباقة الشاملة",
    priceLabel: "2000 دج / شهريًا",
    features: { lessonPrep: true, exams: true, grading: true },
    limits: { lessonPrep: 50, exams: 10, grading: 100 },
  },
  lessons_only: {
    id: "lessons_only",
    displayName: "مذكرات فقط",
    priceLabel: "1000 دج / شهريًا",
    features: { lessonPrep: true, exams: false, grading: false },
    limits: { lessonPrep: 60, exams: 0, grading: 0 },
  },
  exams_only: {
    id: "exams_only",
    displayName: "امتحانات وتصحيح نموذجي فقط",
    priceLabel: "1000 دج / شهريًا",
    features: { lessonPrep: false, exams: true, grading: false },
    limits: { lessonPrep: 0, exams: 20, grading: 0 },
  },
  grading_only: {
    id: "grading_only",
    displayName: "تصحيح الأوراق فقط",
    priceLabel: "1000 دج / شهريًا",
    features: { lessonPrep: false, exams: false, grading: true },
    limits: { lessonPrep: 0, exams: 0, grading: 110 },
  },
};

export const PLAN_LIST: PlanDefinition[] = [
  PLANS.full,
  PLANS.lessons_only,
  PLANS.exams_only,
  PLANS.grading_only,
];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

const FEATURE_LABELS: Record<UsageFeature, string> = {
  lessonPrep: "تحضير الدرس",
  exams: "الامتحانات والتصحيح النموذجي",
  grading: "تصحيح أوراق التلاميذ",
};

export function featureLabel(feature: UsageFeature): string {
  return FEATURE_LABELS[feature];
}
