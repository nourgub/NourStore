import type {
  AgentStep,
  LessonPrepFieldValue,
  LessonPrepMode,
  LessonPrepSection,
  LessonPrepTableRow,
  LessonPrepTemplateSchema,
  SubjectId,
} from "../types";
import { getSubjectDefinition } from "./subjects";
import {
  generateLessonPrepWithClaude,
  generateTemplatedLessonPrepWithClaude,
  isLessonPrepConfigured,
  mergeLessonPrepWithClaude,
  mergeTemplatedLessonPrepWithClaude,
  type LessonSourceImage,
  type LessonSourceText,
} from "./lessonPrepAgent";
import {
  generateLessonPrepWithGemini,
  generateTemplatedLessonPrepWithGemini,
  isLessonPrepConfiguredGemini,
  mergeLessonPrepWithGemini,
  mergeTemplatedLessonPrepWithGemini,
} from "./geminiLessonPrepAgent";
import { generateMockLessonPrep } from "./lessonPrepMock";

export interface LessonPrepPipelineInput {
  mode: LessonPrepMode;
  subjectId: SubjectId;
  lessonTitle: string;
  gradeLevel: string;
  styleNotes?: string;
  textSources?: LessonSourceText[];
  imageSources?: LessonSourceImage[];
  // When set, output is shaped to match the teacher's own uploaded form
  // instead of the generic heading/body sections.
  template?: LessonPrepTemplateSchema;
}

export interface LessonPrepPipelineOutput {
  steps: AgentStep[];
  sections: LessonPrepSection[];
  headerValues: LessonPrepFieldValue[];
  noteValues: LessonPrepFieldValue[];
  tableColumns: string[];
  tableRows: LessonPrepTableRow[];
}

const now = () => new Date().toISOString();

function step(agent: string, label: string, detail: string): AgentStep {
  const t = now();
  return { agent, label, status: "done", detail, startedAt: t, finishedAt: t };
}

const EMPTY_TEMPLATED: Pick<LessonPrepPipelineOutput, "headerValues" | "noteValues" | "tableColumns" | "tableRows"> = {
  headerValues: [],
  noteValues: [],
  tableColumns: [],
  tableRows: [],
};

const EMPTY_SECTIONS: Pick<LessonPrepPipelineOutput, "sections"> = { sections: [] };

export async function runLessonPrepPipeline(input: LessonPrepPipelineInput): Promise<LessonPrepPipelineOutput> {
  const subject = getSubjectDefinition(input.subjectId);
  const steps: AgentStep[] = [];
  const template = input.template;

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

    const mergeArgs = {
      subjectPersona: subject.persona,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
      textSources,
      imageSources,
    };

    const mergeUseClaude = isLessonPrepConfigured();
    const mergeUseGemini = !mergeUseClaude && isLessonPrepConfiguredGemini();
    if (!mergeUseClaude && !mergeUseGemini) {
      throw new Error(
        "دمج المذكرات المرفوعة يتطلب تفعيل مفتاح Claude API أو مفتاح Gemini API — لا يوجد بديل تجريبي لقراءة ودمج محتوى ملفاتك الفعلية.",
      );
    }
    const mergeEngineLabel = mergeUseClaude ? "Claude" : "Gemini";

    if (template) {
      const result = mergeUseClaude
        ? await mergeTemplatedLessonPrepWithClaude({ ...mergeArgs, template })
        : await mergeTemplatedLessonPrepWithGemini({ ...mergeArgs, template });
      steps.push(
        step(
          "دامج المذكرات",
          "دمج المصادر في تحضير موحّد وفق نموذجك الخاص",
          `تم دمج محتوى الملفات المرفوعة في تحضير درس واحد بنفس شكل نموذجك المرفوع (${result.tableRows.length} مرحلة)، عبر نموذج الذكاء الاصطناعي (${mergeEngineLabel}).`,
        ),
      );
      return { steps, ...EMPTY_SECTIONS, headerValues: result.headerValues, noteValues: result.noteValues, tableColumns: template.tableColumns, tableRows: result.tableRows };
    }

    const sections = mergeUseClaude ? await mergeLessonPrepWithClaude(mergeArgs) : await mergeLessonPrepWithGemini(mergeArgs);
    steps.push(
      step(
        "دامج المذكرات",
        "دمج المصادر في تحضير موحّد",
        `تم دمج محتوى الملفات المرفوعة في تحضير درس واحد مكوّن من ${sections.length} قسمًا، عبر نموذج الذكاء الاصطناعي (${mergeEngineLabel}).`,
      ),
    );
    return { steps, sections, ...EMPTY_TEMPLATED };
  }

  // mode === "generate"
  if (template) {
    // Matching a teacher's own custom template well is inherently an AI
    // task — unlike the generic format, there's no sensible mock fallback
    // once a custom template is active (same posture as merge mode).
    const templatedUseClaude = isLessonPrepConfigured();
    const templatedUseGemini = !templatedUseClaude && isLessonPrepConfiguredGemini();
    if (!templatedUseClaude && !templatedUseGemini) {
      throw new Error(
        "استخدام نموذجك الخاص المرفوع يتطلب تفعيل مفتاح Claude API أو مفتاح Gemini API — لا يوجد بديل تجريبي لمطابقة شكل نموذجك بدقة.",
      );
    }
    const templatedArgs = {
      subjectPersona: subject.persona,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
      template,
    };
    const result = templatedUseClaude
      ? await generateTemplatedLessonPrepWithClaude(templatedArgs)
      : await generateTemplatedLessonPrepWithGemini(templatedArgs);
    steps.push(
      step(
        "معدّ تحضير الدرس",
        "صياغة تحضير الدرس وفق نموذجك الخاص",
        `تم إعداد تحضير بنفس شكل نموذجك المرفوع (${result.tableRows.length} مرحلة) لدرس "${input.lessonTitle}"، عبر نموذج الذكاء الاصطناعي (${templatedUseClaude ? "Claude" : "Gemini"}).`,
      ),
    );
    // No separate review step is logged here — nothing in this pipeline
    // actually re-checks the output against the template fields or grade
    // level after generation, so claiming a "مراجعة" ran would be an unearned
    // "reviewed" message. The teacher's own read of the result before export
    // is the real check.
    return { steps, ...EMPTY_SECTIONS, headerValues: result.headerValues, noteValues: result.noteValues, tableColumns: template.tableColumns, tableRows: result.tableRows };
  }

  // Claude is used whenever it's configured; otherwise Gemini (a real model
  // with a genuine free tier, never a mock) takes over. The mock generator
  // only ever runs when NEITHER key is configured (explicit demo mode). A
  // failed real call is a real failure of this request, never silently
  // swapped for demo content and reported as success.
  let sections: LessonPrepSection[];
  let generationEngine: "claude" | "gemini" | "mock" = "mock";

  if (isLessonPrepConfigured()) {
    sections = await generateLessonPrepWithClaude({
      subjectPersona: subject.persona,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
    });
    generationEngine = "claude";
  } else if (isLessonPrepConfiguredGemini()) {
    sections = await generateLessonPrepWithGemini({
      subjectPersona: subject.persona,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
    });
    generationEngine = "gemini";
  } else {
    sections = generateMockLessonPrep(input.lessonTitle, input.gradeLevel);
  }

  const ENGINE_LABEL: Record<typeof generationEngine, string> = {
    claude: "عبر نموذج الذكاء الاصطناعي (Claude).",
    gemini: "عبر نموذج الذكاء الاصطناعي (Gemini).",
    mock: "عبر تحضير تجريبي عام (وضع العرض التجريبي — لم يُفعَّل أي مفتاح API).",
  };
  steps.push(
    step(
      "معدّ تحضير الدرس",
      "صياغة تحضير الدرس من العنوان",
      `تم إعداد تحضير مكوّن من ${sections.length} قسمًا لدرس "${input.lessonTitle}" — ${ENGINE_LABEL[generationEngine]}`,
    ),
  );

  // Same reasoning as the templated branch above: no code here actually
  // re-checks the generated sections, so no "reviewed" step is logged.

  return { steps, sections, ...EMPTY_TEMPLATED };
}
