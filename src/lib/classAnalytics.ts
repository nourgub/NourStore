import type { GeneratedQuestion, StudentPaper } from "./types";

// Pure computation over already-fetched data — no DB/network here, so this
// is trivially unit-testable and the grading session page can call it
// directly without an extra round trip. Only ever computed from APPROVED
// papers: a draft grade can still change, so it must never feed a "class
// average" the teacher might act on. MIN_PAPERS_FOR_ANALYTICS guards against
// inferring anything about the class, a question, or a skill from too few
// data points — a teacher's explicit, repeated request not to overstate
// confidence from insufficient data.
export const MIN_PAPERS_FOR_ANALYTICS = 3;

// A criterion counts as "needs support" only once its average award falls
// below this fraction of its max points, among papers where it was actually
// resolved (never inferred from an unreadable/missing answer).
const WEAK_CRITERION_THRESHOLD = 0.6;

export interface QuestionAnalytics {
  questionId: string;
  topic: string;
  maxPoints: number;
  averageAwardedPoints: number;
  averagePercent: number;
  sampleSize: number;
}

export interface CriterionAnalytics {
  questionId: string;
  criterionId: string;
  criterion: string;
  maxPoints: number;
  averageAwardedPoints: number;
  averagePercent: number;
  sampleSize: number;
}

export interface DistributionBucket {
  label: string;
  minPercent: number;
  maxPercent: number;
  count: number;
}

export interface ClassAnalytics {
  totalPapers: number;
  approvedPapers: number;
  sufficientData: boolean;
  minPapersRequired: number;
  totalPoints: number;
  average: number | null;
  min: number | null;
  max: number | null;
  distribution: DistributionBucket[];
  perQuestion: QuestionAnalytics[];
  weakestCriteria: CriterionAnalytics[];
}

function emptyBuckets(): DistributionBucket[] {
  const ranges = [
    [0, 20],
    [20, 40],
    [40, 60],
    [60, 80],
    [80, 100],
  ];
  return ranges.map(([min, max]) => ({
    label: max === 100 ? `${min}% - 100%` : `${min}% - ${max}%`,
    minPercent: min,
    maxPercent: max,
    count: 0,
  }));
}

export function computeClassAnalytics(
  allPapers: StudentPaper[],
  examQuestions: GeneratedQuestion[],
  totalPoints: number,
): ClassAnalytics {
  const approved = allPapers.filter((p) => p.status === "approved" && p.approvedTotal !== null);
  const sufficientData = approved.length >= MIN_PAPERS_FOR_ANALYTICS;

  const base: ClassAnalytics = {
    totalPapers: allPapers.length,
    approvedPapers: approved.length,
    sufficientData,
    minPapersRequired: MIN_PAPERS_FOR_ANALYTICS,
    totalPoints,
    average: null,
    min: null,
    max: null,
    distribution: emptyBuckets(),
    perQuestion: [],
    weakestCriteria: [],
  };

  if (!sufficientData || totalPoints <= 0) return base;

  const totals = approved.map((p) => p.approvedTotal!);
  const average = Math.round((totals.reduce((s, v) => s + v, 0) / totals.length) * 100) / 100;
  const min = Math.min(...totals);
  const max = Math.max(...totals);

  const buckets = emptyBuckets();
  for (const total of totals) {
    const pct = (total / totalPoints) * 100;
    const bucket = buckets.find((b) => (pct >= b.minPercent && pct < b.maxPercent) || (b.maxPercent === 100 && pct === 100));
    if (bucket) bucket.count++;
  }

  const perQuestion: QuestionAnalytics[] = examQuestions.map((q) => {
    const samples: number[] = [];
    for (const paper of approved) {
      const result = paper.questionResults.find((r) => r.questionId === q.id);
      if (result && result.awardedPoints !== null) samples.push(result.awardedPoints);
    }
    const avg = samples.length > 0 ? samples.reduce((s, v) => s + v, 0) / samples.length : 0;
    return {
      questionId: q.id,
      topic: q.topic,
      maxPoints: q.points,
      averageAwardedPoints: Math.round(avg * 100) / 100,
      averagePercent: q.points > 0 ? Math.round((avg / q.points) * 10000) / 100 : 0,
      sampleSize: samples.length,
    };
  });

  const criteriaAnalytics: CriterionAnalytics[] = [];
  for (const q of examQuestions) {
    for (const criterion of q.rubric) {
      const samples: number[] = [];
      for (const paper of approved) {
        const result = paper.questionResults.find((r) => r.questionId === q.id);
        const criterionResult = result?.criteriaResults.find((c) => c.criterionId === criterion.id);
        if (criterionResult && criterionResult.finalAwardedPoints !== null) {
          samples.push(criterionResult.finalAwardedPoints);
        }
      }
      if (samples.length === 0) continue;
      const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
      criteriaAnalytics.push({
        questionId: q.id,
        criterionId: criterion.id,
        criterion: criterion.criterion,
        maxPoints: criterion.points,
        averageAwardedPoints: Math.round(avg * 100) / 100,
        averagePercent: criterion.points > 0 ? Math.round((avg / criterion.points) * 10000) / 100 : 0,
        sampleSize: samples.length,
      });
    }
  }

  const weakestCriteria = criteriaAnalytics
    .filter((c) => c.averagePercent / 100 < WEAK_CRITERION_THRESHOLD)
    .sort((a, b) => a.averagePercent - b.averagePercent)
    .slice(0, 5);

  return { ...base, average, min, max, distribution: buckets, perQuestion, weakestCriteria };
}
