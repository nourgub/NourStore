import type { AgentStep, CurriculumDocument, GeneratedQuestion, SubjectId } from "../types";
import { distributeEqualPoints } from "../points";
import { getSubjectDefinition } from "./subjects";
import { generateQuestionsWithClaude, isRealGenerationConfigured, type QuestionSpec } from "./realContent";
import { generateQuestionsWithGemini, isGeminiRealGenerationConfigured } from "./geminiRealContent";
import { solveGivenExercises, isGivenExerciseGenerationConfigured, GivenExerciseError } from "./givenExerciseAgent";
import { importExamFromDocuments, isExamImportConfigured, ExamImportError } from "./examImportAgent";
import { solveGivenExercisesWithGemini, isGivenExerciseGenerationConfiguredGemini } from "./geminiGivenExerciseAgent";
import { importExamFromDocumentsWithGemini, isExamImportConfiguredGemini } from "./geminiExamImportAgent";

export interface PipelineInput {
  examTitle: string;
  gradeLevel: string;
  topics: string[];
  numQuestions: number;
  difficultyMix: "متوازن" | "سهل" | "صعب";
  document: CurriculumDocument | null;
}

export interface PipelineOutput {
  steps: AgentStep[];
  questions: GeneratedQuestion[];
}

const now = () => new Date().toISOString();

function step(agent: string, label: string, detail: string): AgentStep {
  const t = now();
  return { agent, label, status: "done", detail, startedAt: t, finishedAt: t };
}

function pickDifficulty(mix: PipelineInput["difficultyMix"], index: number, total: number): "سهل" | "متوسط" | "صعب" {
  if (mix === "سهل") return index < total * 0.7 ? "سهل" : "متوسط";
  if (mix === "صعب") return index < total * 0.3 ? "متوسط" : "صعب";
  // متوازن: سهل / متوسط / صعب بتوزيع تقريبي 30/40/30
  const ratio = index / total;
  if (ratio < 0.3) return "سهل";
  if (ratio < 0.7) return "متوسط";
  return "صعب";
}

/**
 * Runs a subject's agent team over the given request. The subject (its
 * topic bank, mock-fallback generator, and the persona used to open the
 * Claude prompt) is looked up from subjects.ts — this function itself
 * has no subject-specific logic.
 *
 * Question content comes from `generateQuestionsWithClaude` (real Claude
 * API call) whenever ANTHROPIC_API_KEY is configured, falling back to the
 * subject's templated mock bank otherwise — or if the API call itself
 * fails, so a request never hard-fails just because generation had a hiccup.
 */
export async function runAgentPipeline(subjectId: SubjectId, input: PipelineInput): Promise<PipelineOutput> {
  const subject = getSubjectDefinition(subjectId);
  const steps: AgentStep[] = [];

  // 1) Curriculum Analyzer Agent
  const requestedTopics = input.topics.length > 0 ? input.topics : subject.availableTopics.slice(0, 3);
  const styleNote = input.document?.styleNotes?.trim();
  const curriculumText = input.document?.extractionStatus === "extracted" ? input.document.extractedText : "";
  steps.push(
    step(
      "محلّل المنهج",
      "تحليل المنهج وأسلوب الأستاذ",
      input.document
        ? `تم تحليل الوثيقة "${input.document.fileName}" (${input.document.gradeLevel}).` +
            (curriculumText
              ? ` تم استخراج ${curriculumText.length} حرفًا من محتوى الملف الفعلي واعتمادها كسياق مرجعي.`
              : ` لم يتم استخراج نص من الملف (${
                  input.document.extractionStatus === "unsupported"
                    ? "نوع ملف غير مدعوم"
                    : input.document.extractionStatus === "scanned_no_text"
                      ? "الملف يبدو PDF ممسوحًا ضوئيًا بلا طبقة نص — يحتاج OCR أو رفع نسخة Word"
                      : "تعذّر استخراج المحتوى"
                })، تم الاعتماد على المحاور المُدخلة يدويًا.`) +
            (styleNote ? ` ملاحظات الأسلوب المعتمدة: "${styleNote}".` : "")
        : `لا توجد وثيقة منهج مرفوعة لهذا الطلب — تم الاعتماد على المحاور المُدخلة يدويًا: ${requestedTopics.join("، ")}.`,
    ),
  );

  // 2) Exam Writer + Solution + Rubric agents (one Claude call covers all three
  // when configured, since they share the same generation request). Points are
  // split in exact integer hundredths so N questions always sum to exactly
  // totalPoints (never e.g. 6.7×3 = 20.1 from independent per-question rounding).
  const totalPoints = 20;
  const pointsPerQuestion = distributeEqualPoints(totalPoints, input.numQuestions);
  const specs: QuestionSpec[] = Array.from({ length: input.numQuestions }, (_, i) => ({
    topic: requestedTopics[i % requestedTopics.length],
    difficulty: pickDifficulty(input.difficultyMix, i, input.numQuestions),
    pointsBudget: pointsPerQuestion[i],
  }));

  let questions: GeneratedQuestion[];
  let generationEngine: "claude" | "gemini" | "mock" = "mock";

  // Claude is used whenever it's configured (today's higher-quality engine
  // for this workload); otherwise Gemini — a real model with a genuine free
  // tier, never a mock — takes over as the primary generator. The mock bank
  // only ever runs when NEITHER key is configured (explicit demo mode). A
  // failed real call is a real failure of this generation, never silently
  // swapped for mock content reported as success.
  if (isRealGenerationConfigured()) {
    questions = await generateQuestionsWithClaude({
      subjectPersona: subject.persona,
      examTitle: input.examTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: styleNote,
      curriculumText,
      specs,
    });
    generationEngine = "claude";
  } else if (isGeminiRealGenerationConfigured()) {
    questions = await generateQuestionsWithGemini({
      subjectPersona: subject.persona,
      examTitle: input.examTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: styleNote,
      curriculumText,
      specs,
    });
    generationEngine = "gemini";
  } else {
    questions = specs.map((s) => subject.generateMockQuestion(s.topic, s.difficulty, s.pointsBudget));
  }

  const ENGINE_LABEL: Record<typeof generationEngine, string> = {
    claude: "عبر نموذج الذكاء الاصطناعي (Claude).",
    gemini: "عبر نموذج الذكاء الاصطناعي (Gemini).",
    mock: "عبر بنك الأسئلة التجريبي (وضع العرض التجريبي — لم يُفعَّل أي مفتاح API).",
  };
  steps.push(
    step(
      "واضع الأسئلة",
      "صياغة أسئلة الامتحان",
      `تمت صياغة ${questions.length} سؤال(أسئلة) موزعة على المحاور: ${requestedTopics.join("، ")} — ${ENGINE_LABEL[generationEngine]}`,
    ),
  );

  // 3) Solution Agent
  steps.push(
    step(
      "معدّ الحلول النموذجية",
      "بناء الحل النموذجي المفصّل",
      `تم إعداد حل مفصّل خطوة بخطوة لكل سؤال من الأسئلة الـ${questions.length}.`,
    ),
  );

  // 4) Rubric Agent
  steps.push(
    step(
      "مصمم شبكة التنقيط",
      "توزيع النقاط حسب معايير التصحيح",
      `تم توزيع ${totalPoints} نقطة على الأسئلة مع معايير تصحيح تفصيلية لكل سؤال.`,
    ),
  );

  // There is deliberately no "reviewer" step claiming topic/level conformance
  // was verified here — nothing in this pipeline actually checks that Claude
  // stayed within requestedTopics, so logging such a claim would be exactly
  // the kind of unearned "reviewed" message this project must never show
  // (the real, independently-run review is Gemini's, surfaced honestly with
  // its own not_reviewed/reviewing/failed states in ExamReviewPanel).

  return { steps, questions };
}

export interface GivenExercisesPipelineInput {
  subjectId: SubjectId;
  examTitle: string;
  gradeLevel: string;
  topic: string;
  // In page order as the teacher specified them — "exercise 1" is
  // exercises[0], regardless of the page numbers' own order.
  exercises: { pageNumber: number; promptText: string }[];
}

export { isGivenExerciseGenerationConfigured, GivenExerciseError };

/**
 * The second exam-generation path: every question's prompt is copied
 * verbatim from a specific page of a Word file the teacher uploaded — never
 * generated or rephrased — and the model is only asked to solve it and build
 * a grading rubric. There is no mock/demo fallback for this path: a mock
 * bank can only template *new* questions on a topic, it cannot solve
 * arbitrary teacher-supplied text — so it requires Claude or Gemini and
 * fails clearly (never silently) when neither is configured.
 */
export async function runGivenExercisesPipeline(input: GivenExercisesPipelineInput): Promise<PipelineOutput> {
  const subject = getSubjectDefinition(input.subjectId);
  const steps: AgentStep[] = [];

  steps.push(
    step(
      "محلّل المنهج",
      "استخراج التمارين من الملف المرفوع",
      `تم استخراج ${input.exercises.length} تمرين(تمارين) حرفيًا من الصفحات: ${input.exercises.map((e) => e.pageNumber).join("، ")} في ملف Word الذي رفعه الأستاذ.`,
    ),
  );

  const useClaude = isGivenExerciseGenerationConfigured();
  const useGemini = !useClaude && isGivenExerciseGenerationConfiguredGemini();
  if (!useClaude && !useGemini) {
    throw new GivenExerciseError(
      "هذا الوضع (تمارين محددة من ملف Word) يتطلب تفعيل مفتاح Claude API أو مفتاح Gemini API — لا يوجد بديل تجريبي لحل تمارين حقيقية معطاة.",
    );
  }

  const totalPoints = 20;
  const pointsPerExercise = distributeEqualPoints(totalPoints, input.exercises.length);
  const solveInput = {
    subjectPersona: subject.persona,
    examTitle: input.examTitle,
    gradeLevel: input.gradeLevel,
    topic: input.topic,
    exercises: input.exercises.map((ex, i) => ({
      pageNumber: ex.pageNumber,
      promptText: ex.promptText,
      pointsBudget: pointsPerExercise[i],
    })),
  };
  const questions = useClaude ? await solveGivenExercises(solveInput) : await solveGivenExercisesWithGemini(solveInput);

  steps.push(
    step(
      "معدّ الحلول النموذجية",
      "حل التمارين المعطاة وبناء شبكة التنقيط",
      `تم حل ${questions.length} تمرين(تمارين) كما وردت حرفيًا من الملف، مع بناء حل مفصّل وشبكة تصحيح لكل منها عبر نموذج الذكاء الاصطناعي (${useClaude ? "Claude" : "Gemini"}).`,
    ),
  );

  steps.push(
    step(
      "المراجع",
      "التحقق من مطابقة النقاط",
      `تم التحقق من أن مجموع نقاط التمارين يساوي ${totalPoints} بالضبط.`,
    ),
  );

  return { steps, questions };
}

export interface ExamImportPipelineInput {
  subjectId: SubjectId;
  examTitle: string;
  gradeLevel: string;
  topic: string;
  examText: string;
  correctionText: string;
}

export { isExamImportConfigured, ExamImportError };

/**
 * The third exam-source path: lets a teacher use grading entirely without
 * ever generating an exam through this platform — they upload an exam
 * document and its model-correction document, and this extracts both into
 * the same GeneratedQuestion[] shape the other two paths produce, so every
 * downstream feature (grading sessions, dual-model paper grading, approval,
 * docx export, editing) works unchanged. Like runGivenExercisesPipeline,
 * there is no mock/demo fallback — understanding two arbitrary uploaded
 * documents well enough to extract and solve their content needs a real
 * model call (Claude or, as a free-tier fallback, Gemini), not a template.
 */
export async function runExamImportPipeline(input: ExamImportPipelineInput): Promise<PipelineOutput> {
  const subject = getSubjectDefinition(input.subjectId);
  const steps: AgentStep[] = [];

  steps.push(
    step(
      "محلّل المنهج",
      "قراءة ملفي الامتحان والتصحيح المرفوعين",
      `تم استخراج نص ${input.examText.length.toLocaleString("ar")} حرفًا من ملف الامتحان، و${input.correctionText.length.toLocaleString("ar")} حرفًا من ملف التصحيح النموذجي.`,
    ),
  );

  const useClaude = isExamImportConfigured();
  const useGemini = !useClaude && isExamImportConfiguredGemini();
  if (!useClaude && !useGemini) {
    throw new ExamImportError(
      "هذا الوضع (استيراد امتحان جاهز للتصحيح) يتطلب تفعيل مفتاح Claude API أو مفتاح Gemini API — لا يوجد بديل تجريبي لفهم واستخراج أسئلة من ملفات حقيقية.",
    );
  }

  const importInput = {
    subjectPersona: subject.persona,
    examTitle: input.examTitle,
    gradeLevel: input.gradeLevel,
    topic: input.topic,
    examText: input.examText,
    correctionText: input.correctionText,
  };
  const questions = useClaude ? await importExamFromDocuments(importInput) : await importExamFromDocumentsWithGemini(importInput);

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  steps.push(
    step(
      "واضع الأسئلة",
      "استخراج الأسئلة وبناء شبكة التنقيط",
      `تم استخراج ${questions.length} سؤال(أسئلة) من ملف الامتحان ومطابقتها مع ملف التصحيح عبر نموذج الذكاء الاصطناعي (${useClaude ? "Claude" : "Gemini"}) — مجموع النقاط: ${totalPoints}.`,
    ),
  );

  // No fake "final verification" step here: nothing re-checks the extracted
  // questions against the uploaded files beyond what importExamFromDocuments
  // itself did, and the exam is NOT yet usable for grading — the teacher
  // must review and approve it first (see isExamApproved / ApproveExamButton).

  return { steps, questions };
}
