// Tafawoq BAC platform — the teacher's quick requests, answered in the
// platform's fixed message format:
//
//   العنوان / الشرح / العملية أو القانون / مثال / سؤال للطالب
//
// One idea per message, the law written on its own (shown step by step in
// the interface), a short question that makes the student think, and a
// check that they understood. Darja may colour the explanation and the
// question; it never touches a formula. Deterministic: built from the
// curriculum (explanations, discovery dialogues, generated examples).
import type { TeacherAction, TeacherMessage } from "@shared/bacPlatform";
import type { Lesson, Skill } from "../curriculum";
import type { StudentContext } from "../context";
import { inStyle, type TeacherStyle } from "../darja";
import type { ForeignLang } from "@shared/taughtLanguages";
import { taughtLanguage, teacherWords } from "../foreign";
import { generatedExamples } from "../templates";

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.:؟!])\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function ruleOf(skill: Skill): string {
  return skill.dialogue?.rule ?? sentences(skill.explanation)[0] ?? skill.explanation;
}

function exampleFor(lesson: Lesson, skill: Skill, tier: StudentContext["tier"], seed: number) {
  return generatedExamples(lesson, skill.key, tier, seed)?.[0] ?? skill.example;
}

/** The skill the request is about: the one asked for, else the most useful one now. */
export function pickSkill(lesson: Lesson, context: StudentContext, skillKey?: string | null): Skill | undefined {
  return (
    lesson.skills.find(skill => skill.key === skillKey) ??
    lesson.skills.find(skill => skill.key === context.focusSkills[0]?.key) ??
    lesson.skills.find(skill => skill.key === [...context.skills].sort((a, b) => a.mastery - b.mastery)[0]?.key) ??
    lesson.skills[0]
  );
}

export function teacherMessage(input: {
  action: TeacherAction;
  lesson: Lesson;
  context: StudentContext;
  skill: Skill;
  style?: TeacherStyle;
  seed: number;
  /** The question of a similar exercise (action "similar"). */
  exercisePrompt?: string;
}): TeacherMessage {
  const { action, lesson, context, skill, seed } = input;
  const taught = taughtLanguage(input.style, lesson);
  if (taught && skill.taught) return foreignTeacherMessage(taught, input);
  const say = (text: string) => inStyle(text, input.style);
  const understood = say("هل فهمت هذه الخطوة؟");
  switch (action) {
    case "simpler": {
      const parts = sentences(skill.explanation);
      const example = exampleFor(lesson, skill, "weak", seed);
      return {
        title: `${skill.name} — بطريقة أبسط`,
        explanation: say(`لنأخذ فكرة واحدة فقط: ${parts[0] ?? skill.explanation}`),
        formula: [ruleOf(skill)],
        example,
        question: skill.dialogue?.steps[0]?.ask
          ? `${say(skill.dialogue.steps[0].ask)}\n${understood}`
          : understood,
      };
    }
    case "example": {
      const example = exampleFor(lesson, skill, context.tier, seed);
      return {
        title: `مثال محلول — ${skill.name}`,
        explanation: say("نطبّق القاعدة على مثال، خطوة بخطوة. لاحظ كيف نستعمل القانون في كل خطوة."),
        formula: [ruleOf(skill)],
        example,
        question: say("ما هي أول خطوة قمنا بها في هذا المثال، ولماذا؟"),
      };
    }
    case "stepHelp": {
      const example = exampleFor(lesson, skill, "weak", seed);
      return {
        title: `الحل خطوة بخطوة — ${skill.name}`,
        explanation: say("لا بأس. سنفصّل الحل: كل خطوة وحدها، ولا ننتقل إلى التالية حتى تتضح."),
        formula: example.steps.map((step, index) => `${index + 1}) ${step}`),
        example: { problem: example.problem, steps: [], answer: example.answer },
        question: say("أي خطوة لم تفهمها؟ اكتب رقمها وسأشرحها لك وحدها."),
      };
    }
    case "similar":
      return {
        title: `تمرين مشابه — ${skill.name}`,
        explanation: say("جرّب بنفسك أولاً. لن أعطيك الحل مباشرة: أرسل جوابك وسأصححه وأشرح لك."),
        formula: [ruleOf(skill)],
        question: input.exercisePrompt ?? say("حل التمرين الموالي ثم أرسل جوابك."),
      };
    case "summary": {
      const focus = context.focusSkills.slice(0, 3);
      const skills = (focus.length ? focus : context.skills.slice(0, 3))
        .map(entry => lesson.skills.find(candidate => candidate.key === entry.key))
        .filter((entry): entry is Skill => !!entry);
      const weakest = skills[0] ?? skill;
      return {
        title: `ملخص — ${lesson.title}`,
        explanation: say(
          context.strengths.length
            ? `تتقن: ${context.strengths.map(entry => entry.name).join("، ")}. نركز الآن على: ${skills.map(entry => entry.name).join("، ")}.`
            : `نركز الآن على: ${skills.map(entry => entry.name).join("، ")}.`
        ),
        formula: skills.map(ruleOf),
        question: weakest.dialogue?.steps[0]?.ask
          ? say(`سؤال قصير للتأكد: ${weakest.dialogue.steps[0].ask}`)
          : say(`سؤال قصير للتأكد: ما القاعدة الأساسية في «${weakest.name}»؟`),
      };
    }
  }
}

/** The same requests answered in the taught language (language lessons, teacher speaking it). */
function foreignTeacherMessage(lang: ForeignLang, input: Parameters<typeof teacherMessage>[0]): TeacherMessage {
  const { action, lesson, context, skill } = input;
  const w = teacherWords(lang).msg;
  const taught = skill.taught!;
  const rule = (entry: Skill) => entry.taught?.dialogue.rule ?? ruleOf(entry);
  switch (action) {
    case "simpler":
      return {
        title: w.simplerTitle(taught.name),
        explanation: w.oneIdea(sentences(taught.explanation)[0] ?? taught.explanation),
        formula: [rule(skill)],
        example: taught.example,
        question: `${taught.dialogue.steps[0].ask}\n${w.understood}`,
      };
    case "example":
      return {
        title: w.exampleTitle(taught.name),
        explanation: w.exampleExplanation,
        formula: [rule(skill)],
        example: taught.example,
        question: w.exampleQuestion,
      };
    case "stepHelp":
      return {
        title: w.stepTitle(taught.name),
        explanation: w.stepExplanation,
        formula: taught.example.steps.map((step, index) => `${index + 1}) ${step}`),
        example: { problem: taught.example.problem, steps: [], answer: taught.example.answer },
        question: w.stepQuestion,
      };
    case "similar":
      return {
        title: w.similarTitle(taught.name),
        explanation: w.similarExplanation,
        formula: [rule(skill)],
        // The exercise itself is shown below the message.
        question: w.similarQuestion,
      };
    case "summary": {
      const pick = (entries: StudentContext["skills"]) =>
        entries
          .map(entry => lesson.skills.find(candidate => candidate.key === entry.key))
          .filter((entry): entry is Skill => !!entry);
      const focus = context.focusSkills.slice(0, 3);
      const skills = pick(focus.length ? focus : context.skills.slice(0, 3));
      const strong = pick(context.strengths);
      const weakest = skills[0] ?? skill;
      const names = (list: Skill[]) => list.map(entry => entry.taught?.name ?? entry.name).join(", ");
      return {
        title: w.summaryTitle(lesson.titleTaught ?? lesson.title),
        explanation: strong.length ? `${w.canAlready(names(strong))} ${w.focusNow(names(skills))}` : w.focusNow(names(skills)),
        formula: skills.map(rule),
        question: w.check(weakest.taught?.dialogue.steps[0].ask ?? weakest.dialogue?.steps[0]?.ask ?? weakest.name),
      };
    }
  }
}

/** The same message as plain text (history for the model, fallback rendering). */
export function teacherMessageText(message: TeacherMessage): string {
  return [
    `العنوان: ${message.title}`,
    `الشرح: ${message.explanation}`,
    `العملية أو القانون:\n${message.formula.join("\n")}`,
    message.example
      ? `مثال: ${message.example.problem}${message.example.steps.length ? `\n${message.example.steps.join("\n")}` : ""}\n✔ ${message.example.answer}`
      : null,
    `سؤال للطالب: ${message.question}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
