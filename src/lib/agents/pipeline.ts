import type { AgentStep, CurriculumDocument, GeneratedQuestion, SubjectId } from "../types";
import { getSubjectDefinition } from "./subjects";
import { generateQuestionsWithClaude, isRealGenerationConfigured, type QuestionSpec } from "./realContent";

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
              : ` لم يتم استخراج نص من الملف (${input.document.extractionStatus === "unsupported" ? "نوع ملف غير مدعوم" : "تعذّر استخراج المحتوى"})، تم الاعتماد على المحاور المُدخلة يدويًا.`) +
            (styleNote ? ` ملاحظات الأسلوب المعتمدة: "${styleNote}".` : "")
        : `لا توجد وثيقة منهج مرفوعة لهذا الطلب — تم الاعتماد على المحاور المُدخلة يدويًا: ${requestedTopics.join("، ")}.`,
    ),
  );

  // 2) Exam Writer + Solution + Rubric agents (one Claude call covers all three
  // when configured, since they share the same generation request)
  const totalPoints = 20;
  const pointsPerQuestion = Math.round((totalPoints / input.numQuestions) * 10) / 10;
  const specs: QuestionSpec[] = Array.from({ length: input.numQuestions }, (_, i) => ({
    topic: requestedTopics[i % requestedTopics.length],
    difficulty: pickDifficulty(input.difficultyMix, i, input.numQuestions),
    pointsBudget: pointsPerQuestion,
  }));

  let questions: GeneratedQuestion[];
  let usedRealGeneration = false;
  let fallbackReason: string | null = null;

  if (isRealGenerationConfigured()) {
    try {
      questions = await generateQuestionsWithClaude({
        subjectPersona: subject.persona,
        examTitle: input.examTitle,
        gradeLevel: input.gradeLevel,
        styleNotes: styleNote,
        curriculumText,
        specs,
      });
      usedRealGeneration = true;
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : "خطأ غير معروف في نداء نموذج الذكاء الاصطناعي";
      questions = specs.map((s) => subject.generateMockQuestion(s.topic, s.difficulty, s.pointsBudget));
    }
  } else {
    questions = specs.map((s) => subject.generateMockQuestion(s.topic, s.difficulty, s.pointsBudget));
  }

  steps.push(
    step(
      "واضع الأسئلة",
      "صياغة أسئلة الامتحان",
      `تمت صياغة ${questions.length} سؤال(أسئلة) موزعة على المحاور: ${requestedTopics.join("، ")} — ` +
        (usedRealGeneration
          ? "عبر نموذج الذكاء الاصطناعي (Claude)."
          : fallbackReason
            ? `تم التراجع إلى بنك الأسئلة التجريبي بسبب: ${fallbackReason}.`
            : "عبر بنك الأسئلة التجريبي (لم يُفعَّل مفتاح Claude API بعد)."),
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

  // 5) Reviewer Agent
  steps.push(
    step(
      "المراجع",
      "التحقق من مطابقة المنهج والمستوى",
      `تم التحقق من أن جميع الأسئلة ضمن محاور "${input.gradeLevel}" المطلوبة، ولا تتجاوز المحاور المرفوعة.` +
        (styleNote ? ` روعي أسلوب الأستاذ في الصياغة حسب الملاحظة: "${styleNote}".` : ""),
    ),
  );

  return { steps, questions };
}
