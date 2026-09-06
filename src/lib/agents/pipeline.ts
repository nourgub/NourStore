import type { AgentStep, CurriculumDocument, GeneratedQuestion } from "../types";
import { AVAILABLE_MATH_TOPICS, generateMathQuestion } from "./mockContent";

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
 * Each function below stands in for a specialized agent. Today they run
 * mock/templated content synchronously; the seam to plug in real model
 * calls (e.g. the Claude API) is `generateMathQuestion` in mockContent.ts
 * plus the "curriculum compliance" note built by the reviewer step here.
 */
export function runMathAgentPipeline(input: PipelineInput): PipelineOutput {
  const steps: AgentStep[] = [];

  // 1) Curriculum Analyzer Agent
  const requestedTopics = input.topics.length > 0 ? input.topics : AVAILABLE_MATH_TOPICS.slice(0, 3);
  const styleNote = input.document?.styleNotes?.trim();
  steps.push(
    step(
      "محلّل المنهج",
      "تحليل المنهج وأسلوب الأستاذ",
      input.document
        ? `تم تحليل الوثيقة "${input.document.fileName}" (${input.document.gradeLevel}) واستخراج ${input.document.topics.length} محور(محاور).` +
            (styleNote ? ` ملاحظات الأسلوب المعتمدة: "${styleNote}".` : "")
        : `لا توجد وثيقة منهج مرفوعة لهذا الطلب — تم الاعتماد على المحاور المُدخلة يدويًا: ${requestedTopics.join("، ")}.`,
    ),
  );

  // 2) Exam Writer Agent
  const totalPoints = 20;
  const pointsPerQuestion = Math.round((totalPoints / input.numQuestions) * 10) / 10;
  const questions: GeneratedQuestion[] = [];
  for (let i = 0; i < input.numQuestions; i++) {
    const topic = requestedTopics[i % requestedTopics.length];
    const difficulty = pickDifficulty(input.difficultyMix, i, input.numQuestions);
    questions.push(generateMathQuestion(topic, difficulty, pointsPerQuestion));
  }
  steps.push(
    step(
      "واضع الأسئلة",
      "صياغة أسئلة الامتحان",
      `تمت صياغة ${questions.length} سؤال(أسئلة) موزعة على المحاور: ${requestedTopics.join("، ")}.`,
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
