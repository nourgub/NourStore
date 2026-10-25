// Pure unit tests for computeClassAnalytics — no DB, no network. Covers the
// explicit requirement to never infer a class/skill result from too few
// approved papers, and that drafts never feed the numbers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeClassAnalytics, MIN_PAPERS_FOR_ANALYTICS } from "../src/lib/classAnalytics";
import type { GeneratedQuestion, StudentPaper } from "../src/lib/types";

const QUESTIONS: GeneratedQuestion[] = [
  {
    id: "q1",
    topic: "الدوال",
    difficulty: "متوسط",
    points: 10,
    prompt: "س1",
    solution: "ح1",
    rubric: [
      { id: "q1_c1", criterion: "معيار أ", points: 6 },
      { id: "q1_c2", criterion: "معيار ب", points: 4 },
    ],
  },
  {
    id: "q2",
    topic: "الهندسة",
    difficulty: "سهل",
    points: 10,
    prompt: "س2",
    solution: "ح2",
    rubric: [{ id: "q2_c1", criterion: "معيار جـ", points: 10 }],
  },
];

function makePaper(
  id: string,
  status: StudentPaper["status"],
  scores: { q1c1: number | null; q1c2: number | null; q2c1: number | null },
): StudentPaper {
  const q1Awarded = scores.q1c1 !== null && scores.q1c2 !== null ? scores.q1c1 + scores.q1c2 : null;
  const q2Awarded = scores.q2c1;
  const total = q1Awarded !== null && q2Awarded !== null ? q1Awarded + q2Awarded : null;
  return {
    id,
    sessionId: "sess1",
    teacherId: "t1",
    studentName: id,
    imagePaths: [],
    status,
    failureReason: null,
    examVersion: 1,
    claudeModel: "claude-sonnet-5",
    geminiReviewStatus: "not_configured",
    geminiModel: null,
    geminiFailureReason: null,
    questionResults: [
      {
        questionId: "q1",
        topic: "الدوال",
        maxPoints: 10,
        claudeTranscription: "",
        claudeFeedback: "",
        geminiTranscription: "",
        geminiFeedback: "",
        criteriaResults: [
          {
            criterionId: "q1_c1",
            criterion: "معيار أ",
            maxPoints: 6,
            claudeAwardedPoints: scores.q1c1,
            claudeNote: "",
            geminiAwardedPoints: null,
            geminiNote: "",
            status: "not_reviewed",
            finalAwardedPoints: scores.q1c1,
            teacherOverride: false,
            overrideReason: null,
          },
          {
            criterionId: "q1_c2",
            criterion: "معيار ب",
            maxPoints: 4,
            claudeAwardedPoints: scores.q1c2,
            claudeNote: "",
            geminiAwardedPoints: null,
            geminiNote: "",
            status: "not_reviewed",
            finalAwardedPoints: scores.q1c2,
            teacherOverride: false,
            overrideReason: null,
          },
        ],
        awardedPoints: q1Awarded,
        suspiciousNote: null,
      },
      {
        questionId: "q2",
        topic: "الهندسة",
        maxPoints: 10,
        claudeTranscription: "",
        claudeFeedback: "",
        geminiTranscription: "",
        geminiFeedback: "",
        criteriaResults: [
          {
            criterionId: "q2_c1",
            criterion: "معيار جـ",
            maxPoints: 10,
            claudeAwardedPoints: scores.q2c1,
            claudeNote: "",
            geminiAwardedPoints: null,
            geminiNote: "",
            status: "not_reviewed",
            finalAwardedPoints: scores.q2c1,
            teacherOverride: false,
            overrideReason: null,
          },
        ],
        awardedPoints: q2Awarded,
        suspiciousNote: null,
      },
    ],
    needsReview: false,
    draftTotal: total,
    approvedTotal: status === "approved" ? total : null,
    overrideHistory: [],
    teacherCorrectedTranscriptions: [],
    createdAt: new Date().toISOString(),
    gradedAt: new Date().toISOString(),
    approvedAt: status === "approved" ? new Date().toISOString() : null,
  };
}

test("withholds every number when fewer than MIN_PAPERS_FOR_ANALYTICS are approved", () => {
  const papers = [makePaper("p1", "approved", { q1c1: 6, q1c2: 4, q2c1: 10 })];
  const result = computeClassAnalytics(papers, QUESTIONS, 20);
  assert.equal(result.sufficientData, false);
  assert.equal(result.average, null);
  assert.equal(result.perQuestion.length, 0);
  assert.equal(result.approvedPapers, 1);
  assert.equal(MIN_PAPERS_FOR_ANALYTICS > 1, true);
});

test("draft (unapproved) papers never contribute to the class average", () => {
  const papers = [
    makePaper("p1", "approved", { q1c1: 10, q1c2: 4, q2c1: 10 }), // 24/20 clamp not relevant, just high
    makePaper("p2", "approved", { q1c1: 6, q1c2: 4, q2c1: 10 }),
    makePaper("p3", "approved", { q1c1: 6, q1c2: 4, q2c1: 10 }),
    makePaper("p4", "graded", { q1c1: 0, q1c2: 0, q2c1: 0 }), // an un-approved draft with a terrible score
  ];
  const result = computeClassAnalytics(papers, QUESTIONS, 20);
  assert.equal(result.sufficientData, true);
  assert.equal(result.approvedPapers, 3);
  assert.equal(result.totalPapers, 4);
  // Average must reflect only the 3 approved papers, not be dragged down by p4.
  assert.ok(result.average! > 15, `expected average unaffected by the draft, got ${result.average}`);
});

test("computes per-question averages and flags a genuinely weak criterion", () => {
  const papers = [
    makePaper("p1", "approved", { q1c1: 1, q1c2: 1, q2c1: 10 }),
    makePaper("p2", "approved", { q1c1: 1, q1c2: 1, q2c1: 10 }),
    makePaper("p3", "approved", { q1c1: 1, q1c2: 1, q2c1: 10 }),
  ];
  const result = computeClassAnalytics(papers, QUESTIONS, 20);
  assert.equal(result.sufficientData, true);

  const q2 = result.perQuestion.find((q) => q.questionId === "q2")!;
  assert.equal(q2.averagePercent, 100);

  // q1_c1 (max 6) averaging 1 point = ~16.7%, well under the weak threshold.
  const weakIds = result.weakestCriteria.map((c) => c.criterionId);
  assert.ok(weakIds.includes("q1_c1"));
  assert.ok(!weakIds.includes("q2_c1"), "a criterion averaging 100% must never be listed as weak");
});

test("a criterion never resolved (null) across all approved papers contributes no sample and is never flagged", () => {
  const papers = [
    makePaper("p1", "approved", { q1c1: null, q1c2: null, q2c1: 10 }),
    makePaper("p2", "approved", { q1c1: null, q1c2: null, q2c1: 10 }),
    makePaper("p3", "approved", { q1c1: null, q1c2: null, q2c1: 10 }),
  ];
  // Note: approvePaperGrade would never actually let a paper with unresolved
  // criteria reach "approved" in the real flow — this test defends the pure
  // analytics function itself against that input regardless.
  const result = computeClassAnalytics(papers, QUESTIONS, 20);
  const q1c1 = result.weakestCriteria.find((c) => c.criterionId === "q1_c1");
  assert.equal(q1c1, undefined, "never-resolved criteria must not be inferred as weak from zero samples");
});

test("distribution buckets sum to the number of approved papers", () => {
  const papers = [
    makePaper("p1", "approved", { q1c1: 6, q1c2: 4, q2c1: 10 }), // 20/20 = 100%
    makePaper("p2", "approved", { q1c1: 0, q1c2: 0, q2c1: 0 }), // 0/20 = 0%
    makePaper("p3", "approved", { q1c1: 3, q1c2: 2, q2c1: 5 }), // 10/20 = 50%
  ];
  const result = computeClassAnalytics(papers, QUESTIONS, 20);
  const bucketTotal = result.distribution.reduce((s, b) => s + b.count, 0);
  assert.equal(bucketTotal, 3);
});
