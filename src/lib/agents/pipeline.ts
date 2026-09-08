import type { AgentStep, CurriculumDocument, GeneratedQuestion } from "../types";
import { AVAILABLE_MATH_TOPICS, generateMathQuestion } from "./mockContent";
import { generateMathQuestionsWithClaude, isRealGenerationConfigured, type QuestionSpec } from "./realContent";

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
 * Runs the Math subject's agent team over the given request.
 *
 * Question content comes from `generateMathQuestionsWithClaude` (real Claude
 * API call) whenever ANTHROPIC_API_KEY is configured, falling back to the
 * templated bank in mockContent.ts otherwise — or if the API call itself
 * fails, so a request never hard-fails just because generation had a hiccup.
 */
export async function runMathAgentPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const steps: AgentStep[] = [];

  // 1) Curriculum Analyzer Agent
  const requestedTopics = input.topics.length > 0 ? input.topics : AVAILABLE_MATH_TOPICS.slice(0, 3);
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
      questions = await generateMathQuestionsWithClaude({
        examTitle: input.examTitle,
        gradeLevel: input.gradeLevel,
        styleNotes: styleNote,
        curriculumText,
        specs,
      });
      usedRealGeneration = true;
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : "خطأ غير معروف في نداء نموذج الذكاء الاصطناعي";
      questions = specs.map((s) => generateMathQuestion(s.topic, s.difficulty, s.pointsBudget));
    }
  } else {
    questions = specs.map((s) => generateMathQuestion(s.topic, s.difficulty, s.pointsBudget));
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
