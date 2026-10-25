// Privacy requirement: "اسمح باستخدام معرّفات بدل الأسماء المرسلة لمزود
// الذكاء الاصطناعي" — the student's real name must never be sent to
// Claude or Gemini during grading. Both calls (gradeStudentPaper,
// reviewStudentPaperWithGemini) go through one shared builder
// (buildIndependentGradeCallInput) specifically so this can never drift
// between the two call sites. No network calls here — pure function test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndependentGradeCallInput, pseudonymizeStudent } from "../src/lib/grading";
import { emptyExamReview } from "../src/lib/types";
import type { GenerationRequest, StudentPaper } from "../src/lib/types";

function makeExam(): GenerationRequest {
  return {
    id: "exam1",
    teacherId: "t1",
    subjectId: "math",
    documentId: null,
    examTitle: "اختبار",
    gradeLevel: "السنة الأولى ثانوي",
    topics: ["الدوال"],
    numQuestions: 1,
    difficultyMix: "متوازن",
    status: "done",
    failureReason: null,
    steps: [],
    questions: [
      { id: "q1", topic: "الدوال", difficulty: "متوسط", points: 5, prompt: "س", solution: "ح", rubric: [] },
    ],
    rubricVersion: 1,
    review: emptyExamReview(),
    files: {},
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    approvedRubricVersion: 1,
    approvedAt: new Date().toISOString(),
  };
}

function makePaper(studentName: string): StudentPaper {
  return {
    id: "paper_abc123456789",
    sessionId: "sess1",
    teacherId: "t1",
    studentName,
    imagePaths: ["/tmp/page-1.jpg"],
    status: "grading",
    failureReason: null,
    examVersion: 1,
    claudeModel: null,
    geminiReviewStatus: "not_configured",
    geminiModel: null,
    geminiFailureReason: null,
    questionResults: [],
    needsReview: false,
    draftTotal: null,
    approvedTotal: null,
    overrideHistory: [],
    teacherCorrectedTranscriptions: [],
    createdAt: new Date().toISOString(),
    gradedAt: null,
    approvedAt: null,
  };
}

test("pseudonymizeStudent is stable for the same paper id and differs across papers", () => {
  const a = pseudonymizeStudent("paper_abc123456789");
  const b = pseudonymizeStudent("paper_abc123456789");
  const c = pseudonymizeStudent("paper_xyz987654321");
  assert.equal(a, b, "the same paper must always get the same pseudonym across retries/re-grades");
  assert.notEqual(a, c, "different papers must get different pseudonyms");
});

test("buildIndependentGradeCallInput never includes the student's real name anywhere in the payload", () => {
  const realName = "محمد الأمين بوزيدي";
  const paper = makePaper(realName);
  const exam = makeExam();

  const input = buildIndependentGradeCallInput(paper, exam);

  assert.equal(input.studentName, pseudonymizeStudent(paper.id));
  assert.notEqual(input.studentName, realName);

  const serialized = JSON.stringify(input);
  assert.ok(!serialized.includes(realName), "the real student name must not appear anywhere in the AI call payload");
});

test("buildIndependentGradeCallInput still forwards corrected transcriptions and questions untouched", () => {
  const paper = { ...makePaper("اسم"), teacherCorrectedTranscriptions: [{ questionId: "q1", text: "نص مصحَّح" }] };
  const exam = makeExam();
  const input = buildIndependentGradeCallInput(paper, exam);
  assert.deepEqual(input.knownTranscriptions, [{ questionId: "q1", text: "نص مصحَّح" }]);
  assert.deepEqual(input.questions, exam.questions);
});
