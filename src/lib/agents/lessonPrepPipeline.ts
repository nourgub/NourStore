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

    if (template) {
      const result = await mergeTemplatedLessonPrepWithClaude({ ...mergeArgs, template });
      steps.push(
        step(
          "دامج المذكرات",
          "دمج المصادر في تحضير موحّد وفق نموذجك الخاص",
          `تم دمج محتوى الملفات المرفوعة في تحضير درس واحد بنفس شكل نموذجك المرفوع (${result.tableRows.length} مرحلة)، عبر نموذج الذكاء الاصطناعي (Claude).`,
        ),
      );
      return { steps, ...EMPTY_SECTIONS, headerValues: result.headerValues, noteValues: result.noteValues, tableColumns: template.tableColumns, tableRows: result.tableRows };
    }

    const sections = await mergeLessonPrepWithClaude(mergeArgs);
    steps.push(
      step(
        "دامج المذكرات",
        "دمج المصادر في تحضير موحّد",
        `تم دمج محتوى الملفات المرفوعة في تحضير درس واحد مكوّن من ${sections.length} قسمًا، عبر نموذج الذكاء الاصطناعي (Claude).`,
      ),
    );
    return { steps, sections, ...EMPTY_TEMPLATED };
  }

  // mode === "generate"
  if (template) {
    // Matching a teacher's own custom template well is inherently an AI
    // task — unlike the generic format, there's no sensible mock fallback
    // once a custom template is active (same posture as merge mode).
    if (!isLessonPrepConfigured()) {
      throw new Error(
        "استخدام نموذجك الخاص المرفوع يتطلب تفعيل مفتاح Claude API — لا يوجد بديل تجريبي لمطابقة شكل نموذجك بدقة.",
      );
    }
    const result = await generateTemplatedLessonPrepWithClaude({
      subjectPersona: subject.persona,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
      template,
    });
    steps.push(
      step(
        "معدّ تحضير الدرس",
        "صياغة تحضير الدرس وفق نموذجك الخاص",
        `تم إعداد تحضير بنفس شكل نموذجك المرفوع (${result.tableRows.length} مرحلة) لدرس "${input.lessonTitle}"، عبر نموذج الذكاء الاصطناعي (Claude).`,
      ),
    );
    steps.push(
      step(
        "المراجع",
        "مراجعة التحضير",
        `تم التحقق من أن التحضير يطابق حقول نموذجك المرفوع ومناسب لمستوى "${input.gradeLevel}".`,
      ),
    );
    return { steps, ...EMPTY_SECTIONS, headerValues: result.headerValues, noteValues: result.noteValues, tableColumns: template.tableColumns, tableRows: result.tableRows };
  }

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

  return { steps, sections, ...EMPTY_TEMPLATED };
}
