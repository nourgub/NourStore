// The "المدير الرئيسي" (main manager): pure code, no model call. Merges
// Claude's and Gemini's independent grading into the final per-criterion
// result the teacher reviews — comparing, flagging disagreement, and
// blocking an automatic final score wherever either model couldn't
// confidently read the answer. This file never calls an LLM.

import type {
  CriterionGradeResult,
  CriterionReviewStatus,
  GeneratedQuestion,
  QuestionGradeResult,
} from "../types";
import type { AnswerStatus, IndependentPaperGrade, IndependentQuestionGrade } from "./independentGradeTypes";

const POINTS_EPSILON = 0.005; // tolerance for float comparison after clamping to 2 decimals

function clamp(points: number, maxPoints: number): number {
  return Math.round(Math.max(0, Math.min(maxPoints, points)) * 100) / 100;
}

function findQuestionGrade(grade: IndependentPaperGrade | null, questionId: string): IndependentQuestionGrade | null {
  return grade?.questions.find((q) => q.questionId === questionId) ?? null;
}

export interface MergeInput {
  questions: GeneratedQuestion[];
  claude: IndependentPaperGrade | null;
  gemini: IndependentPaperGrade | null;
  /** Whether Gemini actually ran successfully for this paper — distinct from `gemini` being present/absent. */
  geminiAvailable: boolean;
}

export interface MergeOutput {
  questionResults: QuestionGradeResult[];
  needsReview: boolean;
  draftTotal: number | null;
}

export function mergePaperGrades(input: MergeInput): MergeOutput {
  let needsReview = false;
  const questionResults: QuestionGradeResult[] = [];

  for (const question of input.questions) {
    const claudeQ = findQuestionGrade(input.claude, question.id);
    const geminiQ = input.geminiAvailable ? findQuestionGrade(input.gemini, question.id) : null;

    if (!claudeQ) {
      // Claude hasn't graded this question yet (merge called before the
      // primary job finished) — leave everything unresolved.
      needsReview = true;
      questionResults.push({
        questionId: question.id,
        topic: question.topic,
        maxPoints: question.points,
        claudeTranscription: "",
        claudeFeedback: "",
        geminiTranscription: geminiQ?.transcription ?? "",
        geminiFeedback: geminiQ?.feedback ?? "",
        awardedPoints: null,
        suspiciousNote: geminiQ?.suspiciousInstructionNote ?? null,
        criteriaResults: question.rubric.map((c) => ({
          criterionId: c.id,
          criterion: c.criterion,
          maxPoints: c.points,
          claudeAwardedPoints: null,
          claudeNote: "",
          geminiAwardedPoints: null,
          geminiNote: "",
          status: "not_reviewed",
          finalAwardedPoints: null,
          teacherOverride: false,
          overrideReason: null,
        })),
      });
      continue;
    }

    const suspiciousNote = claudeQ.suspiciousInstructionNote ?? geminiQ?.suspiciousInstructionNote ?? null;
    if (suspiciousNote) needsReview = true;

    const effectiveGeminiStatus: AnswerStatus | null = geminiQ?.answerStatus ?? null;
    const statusesDisagree = effectiveGeminiStatus !== null && effectiveGeminiStatus !== claudeQ.answerStatus;

    const criteriaResults: CriterionGradeResult[] = question.rubric.map((criterion) => {
      const claudeAward = claudeQ.criteriaAwards.find((a) => a.criterionId === criterion.id) ?? null;
      const geminiAward = geminiQ?.criteriaAwards.find((a) => a.criterionId === criterion.id) ?? null;

      const claudePoints = claudeAward?.awardedPoints != null ? clamp(claudeAward.awardedPoints, criterion.points) : null;
      const geminiPoints = geminiAward?.awardedPoints != null ? clamp(geminiAward.awardedPoints, criterion.points) : null;

      let status: CriterionReviewStatus;
      let finalAwardedPoints: number | null;

      if (statusesDisagree) {
        // The two models disagree on whether/how the student answered at
        // all (e.g. one says "unreadable", the other "answered") — never
        // auto-resolved, however confident either model's own number is.
        status = "disagreed";
        finalAwardedPoints = null;
      } else if (claudeQ.answerStatus === "unreadable" || claudeQ.answerStatus === "missing_page") {
        status = claudeQ.answerStatus;
        finalAwardedPoints = null;
      } else if (claudeQ.answerStatus === "empty") {
        // Confidently, not just by default — both models agree nothing was
        // written (or only Claude ran and it's confident of that).
        status = "agreed";
        finalAwardedPoints = 0;
      } else if (!input.geminiAvailable || geminiPoints === null) {
        // Single-source grading (Gemini not configured, not yet done, or
        // failed) — informational, not blocking.
        status = "not_reviewed";
        finalAwardedPoints = claudePoints;
      } else if (claudePoints !== null && Math.abs(claudePoints - geminiPoints) <= POINTS_EPSILON) {
        status = "agreed";
        finalAwardedPoints = claudePoints;
      } else {
        status = "disagreed";
        finalAwardedPoints = null;
      }

      if (status === "disagreed" || status === "unreadable" || status === "missing_page") {
        needsReview = true;
      }

      return {
        criterionId: criterion.id,
        criterion: criterion.criterion,
        maxPoints: criterion.points,
        claudeAwardedPoints: claudePoints,
        claudeNote: claudeAward?.note ?? "",
        geminiAwardedPoints: geminiPoints,
        geminiNote: geminiAward?.note ?? "",
        status,
        finalAwardedPoints,
        teacherOverride: false,
        overrideReason: null,
      };
    });

    const anyUnresolved = criteriaResults.some((c) => c.finalAwardedPoints === null);
    const awardedPoints = anyUnresolved
      ? null
      : Math.round(criteriaResults.reduce((s, c) => s + (c.finalAwardedPoints ?? 0), 0) * 100) / 100;

    questionResults.push({
      questionId: question.id,
      topic: question.topic,
      maxPoints: question.points,
      claudeTranscription: claudeQ.transcription,
      claudeFeedback: claudeQ.feedback,
      geminiTranscription: geminiQ?.transcription ?? "",
      geminiFeedback: geminiQ?.feedback ?? "",
      criteriaResults,
      awardedPoints,
      suspiciousNote,
    });
  }

  const anyQuestionUnresolved = questionResults.some((q) => q.awardedPoints === null);
  const draftTotal = anyQuestionUnresolved
    ? null
    : Math.round(questionResults.reduce((s, q) => s + (q.awardedPoints ?? 0), 0) * 100) / 100;

  return { questionResults, needsReview, draftTotal };
}
