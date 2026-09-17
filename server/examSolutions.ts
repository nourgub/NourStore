// Teacher assistant, module 3 — "التصحيح النموذجي وسلم التنقيط"
// (model solution + grading scale).
//
// The only module whose output is consumed by another call: module 4
// (server/paperGrader.ts) grades a student's paper against this JSON. So the
// JSON is parsed and validated HERE, once, rather than being trusted blindly
// downstream — a grading scale with a missing step or a non-numeric mark
// would otherwise surface as a silently wrong mark on a real student's paper.
//
// Prompt: server/prompts/mathExamSolutions.ts. Transport: server/claudeClient.ts.

import { z } from "zod";
import {
  askClaude,
  type ClaudeTextResult,
  type ClaudeUsage,
} from "./claudeClient";
import type { ExtractedAttachment } from "./attachments/extract";
import {
  EXAM_IN_ATTACHMENT,
  fillMathExamSolutionsPrompt,
  MATH_EXAM_SOLUTIONS_TRIGGER,
  type MathExamSolutionsContext,
} from "./prompts/mathExamSolutions";

/** One line of the grading scale: what earns marks, and how many. */
export const gradingStepSchema = z.object({
  الخطوة: z.string().min(1),
  النقاط: z.number(),
});

/** One question's model solution — the shape the prompt's output block asks for. */
export const examQuestionSolutionSchema = z.object({
  // Papers number questions "1", "2.a", "التمرين الأول" — accept a number or
  // a label rather than forcing a shape the exam itself may not use.
  رقم_السؤال: z.union([z.number(), z.string()]),
  الحل: z.string().min(1),
  سلم_التنقيط: z.array(gradingStepSchema).min(1),
  حلول_بديلة: z.string().default(""),
  أخطاء_متوقعة: z.array(z.string()).default([]),
});

export const examSolutionsSchema = z.array(examQuestionSolutionSchema).min(1);

export type ExamQuestionSolution = z.infer<typeof examQuestionSolutionSchema>;

export type ExamSolutionsResult =
  | {
      ok: true;
      /** Parsed and validated, or null when the answer could not be read as the agreed shape. */
      questions: ExamQuestionSolution[] | null;
      /** Always present: the JSON as returned, so nothing is lost when parsing fails. */
      json: string;
      /** Why `questions` is null — shown to the teacher, never swallowed. */
      parseError: string | null;
      /** Sum of every step's marks, so the teacher can check it against the paper's total. */
      totalPoints: number | null;
      model: string;
      truncated: boolean;
      /** What the call cost in tokens, for the usage record. */
      usage: ClaudeUsage;
    }
  | Extract<ClaudeTextResult, { ok: false }>;

/**
 * Pulls the JSON array out of a reply. Claude is asked for the bare array,
 * but a ```json fence or a line of preamble is the common, harmless
 * deviation — strip those rather than failing a perfectly good answer.
 */
export function extractJsonArray(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return body;
  return body.slice(start, end + 1);
}

export function sumGradingScale(questions: ExamQuestionSolution[]): number {
  return questions.reduce(
    (total, question) =>
      total +
      question["سلم_التنقيط"].reduce((sum, step) => sum + step["النقاط"], 0),
    0
  );
}

// The paper itself may be the attachment — a scanned exam, or a Word file —
// in which case the text field carries only what the teacher typed (often
// nothing beyond a title).
const SOLUTIONS_ATTACHMENT_NOTE =
  "نص الامتحان قد يكون في المرفقات أعلاه (صورة أو PDF أو ملف Word). اقرأ الأسئلة منها، ولا تفترض أسئلة غير موجودة فيها.";

/** Produces the model solution and grading scale for one exam paper. */
export async function solveMathExam(
  context: MathExamSolutionsContext,
  attachments: ExtractedAttachment[] = []
): Promise<ExamSolutionsResult> {
  const result = await askClaude({
    system: fillMathExamSolutionsPrompt({
      examText:
        context.examText.trim() ||
        (attachments.length ? EXAM_IN_ATTACHMENT : ""),
    }),
    user: attachments.length
      ? `${SOLUTIONS_ATTACHMENT_NOTE}\n\n${MATH_EXAM_SOLUTIONS_TRIGGER}`
      : MATH_EXAM_SOLUTIONS_TRIGGER,
    attachments,
  });
  if (!result.ok) return result;

  const json = extractJsonArray(result.text);
  let questions: ExamQuestionSolution[] | null = null;
  let parseError: string | null = null;
  try {
    const parsed = examSolutionsSchema.safeParse(JSON.parse(json));
    if (parsed.success) {
      questions = parsed.data;
    } else {
      parseError = `سلم التنقيط لا يطابق الشكل المتفق عليه: ${parsed.error.issues[0]?.message ?? "بنية غير متوقعة"}`;
    }
  } catch {
    parseError = result.truncated
      ? "الردّ طويل وتم قطعه قبل اكتمال JSON — قلّل عدد الأسئلة ثم أعد المحاولة."
      : "تعذّر قراءة الردّ كـ JSON صالح. راجعه يدوياً قبل استعماله في التصحيح.";
  }
  // Never throws the generated text away: a teacher who can fix the JSON by
  // hand should not lose a full model solution to a stray character.
  return {
    ok: true,
    questions,
    json,
    parseError,
    totalPoints: questions ? sumGradingScale(questions) : null,
    model: result.model,
    truncated: result.truncated,
    usage: result.usage,
  };
}

/**
 * Renders a parsed grading scale as something a human reads — the shape a
 * Word/PDF export needs. Falls back to the raw JSON when it could not be
 * parsed, so an export never silently loses content it could not format.
 */
export function formatSolutionsForExport(
  questions: ExamQuestionSolution[] | null,
  rawJson: string
): string {
  if (!questions || !questions.length) return rawJson;
  const blocks = questions.map(question => {
    const lines = [
      `## السؤال ${question["رقم_السؤال"]}`,
      "### الحل",
      question["الحل"],
      "### سلم التنقيط",
      ...question["سلم_التنقيط"].map(
        step => `- ${step["الخطوة"]} (${step["النقاط"]})`
      ),
    ];
    if (question["حلول_بديلة"]?.trim()) {
      lines.push("### حلول بديلة", question["حلول_بديلة"].trim());
    }
    if (question["أخطاء_متوقعة"]?.length) {
      lines.push(
        "### أخطاء متوقعة",
        ...question["أخطاء_متوقعة"].map(mistake => `- ${mistake}`)
      );
    }
    return lines.join("\n");
  });
  const total = sumGradingScale(questions);
  return `${blocks.join("\n\n")}\n\n## مجموع نقاط السلم\n${total}`;
}
