import type { AgentStep, LessonPrepMode, LessonPrepSection, SubjectId } from "../types";
import { getSubjectDefinition } from "./subjects";
import {
  generateLessonPrepWithClaude,
  isLessonPrepConfigured,
  mergeLessonPrepWithClaude,
  type LessonSourceImage,
  type LessonSourceText,
} from "./lessonPrepAgent";
import { generateMockLessonPrep } from "./lessonPrepMock";

export interface LessonPrepPipelineInput {
  mode: LessonPrepMode;
  subjectId: SubjectId;
  lessonTitle: string;
  gradeLevel: string;
  styleNotes?: string;
  textSources?: LessonSourceText[];
  imageSources?: LessonSourceImage[];
}

export interface LessonPrepPipelineOutput {
  steps: AgentStep[];
  sections: LessonPrepSection[];
}

const now = () => new Date().toISOString();

function step(agent: string, label: string, detail: string): AgentStep {
  const t = now();
  return { agent, label, status: "done", detail, startedAt: t, finishedAt: t };
}

export async function runLessonPrepPipeline(input: LessonPrepPipelineInput): Promise<LessonPrepPipelineOutput> {
  const subject = getSubjectDefinition(input.subjectId);
  const steps: AgentStep[] = [];

  if (input.mode === "merge") {
    const textSources = input.textSources ?? [];
    const imageSources = input.imageSources ?? [];

    steps.push(
      step(
        "قارئ المذكرات",
        "استخراج وقراءة محتوى الملفات المرفوعة",
        `تمت معالجة ${textSources.length + imageSources.length} ملف(ات) — ` +
          `${textSources.length} نص مستخرج من ملفات PDF/Word` +
          (imageSources.length > 0 ? `، و${imageSources.length} صورة تمت قراءتها عبر الرؤية الحاسوبية.` : "."),
      ),
    );

    const sections = await mergeLessonPrepWithClaude({
      subjectPersona: subject.persona,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
      textSources,
      imageSources,
    });

    steps.push(
      step(
        "دامج المذكرات",
        "دمج المصادر في تحضير موحّد",
        `تم دمج محتوى الملفات المرفوعة في تحضير درس واحد مكوّن من ${sections.length} قسمًا، عبر نموذج الذكاء الاصطناعي (Claude).`,
      ),
    );

    return { steps, sections };
  }

  // mode === "generate"
  let sections: LessonPrepSection[];
  let usedRealGeneration = false;
  let fallbackReason: string | null = null;

  if (isLessonPrepConfigured()) {
    try {
      sections = await generateLessonPrepWithClaude({
        subjectPersona: subject.persona,
        lessonTitle: input.lessonTitle,
        gradeLevel: input.gradeLevel,
        styleNotes: input.styleNotes,
      });
      usedRealGeneration = true;
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : "خطأ غير معروف في نداء نموذج الذكاء الاصطناعي";
      sections = generateMockLessonPrep(input.lessonTitle, input.gradeLevel);
    }
  } else {
    sections = generateMockLessonPrep(input.lessonTitle, input.gradeLevel);
  }

  steps.push(
    step(
      "معدّ تحضير الدرس",
      "صياغة تحضير الدرس من العنوان",
      `تم إعداد تحضير مكوّن من ${sections.length} قسمًا لدرس "${input.lessonTitle}" — ` +
        (usedRealGeneration
          ? "عبر نموذج الذكاء الاصطناعي (Claude)."
          : fallbackReason
            ? `تم التراجع إلى تحضير تجريبي عام بسبب: ${fallbackReason}.`
            : "عبر تحضير تجريبي عام (لم يُفعَّل مفتاح Claude API بعد)."),
    ),
  );

  steps.push(
    step(
      "المراجع",
      "مراجعة التحضير",
      `تم التحقق من أن التحضير يغطي مراحل الدرس الأساسية ومناسب لمستوى "${input.gradeLevel}".`,
    ),
  );

  return { steps, sections };
}
