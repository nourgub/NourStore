// The free trial lesson, open before an account or a profile exists: one
// fixed skill of the maths "limits" lesson (the one with no prerequisite),
// taught by its discovery dialogue, then one fixed exercise. Nothing is
// stored and nothing about other users is read; the answers are checked
// statelessly (the client says which attempt it is).
import { TRPCError } from "@trpc/server";
import { getLesson, type BankQuestion, type Lesson, type Skill } from "./curriculum";
import { dialogueAnswerMatches } from "./dialogue";
import { instantiate } from "./generators/instantiate";
import { gradeDeterministic } from "./grading";

const LESSON_KEY = "math-limits";
const SKILL_KEY = "poly_limits_infinity";
const SEED = 20261023;

let cached: { lesson: Lesson; skill: Skill; question: BankQuestion } | null = null;

function trialContent() {
  if (cached) return cached;
  const lesson = getLesson(LESSON_KEY);
  const skill = lesson?.skills.find(entry => entry.key === SKILL_KEY);
  const generator = lesson?.generators?.find(entry => entry.skill === SKILL_KEY && entry.difficulty === 1);
  if (!lesson || !skill?.dialogue || !generator) throw new TRPCError({ code: "NOT_FOUND", message: "TRIAL_UNAVAILABLE" });
  cached = { lesson, skill, question: instantiate(generator, SEED) };
  return cached;
}

/** What the visitor sees: no answers, only the questions. */
export function trialLesson() {
  const { lesson, skill, question } = trialContent();
  const dialogue = skill.dialogue!;
  return {
    lessonTitle: lesson.title,
    skillName: skill.name,
    opening: dialogue.opening,
    steps: dialogue.steps.map(step => ({ ask: step.ask })),
    question: { prompt: question.prompt, type: question.type, options: question.options ?? null },
  };
}

/**
 * One answer. A dialogue step: wrong once → its hint; wrong twice → the
 * answer, so the visitor is never stuck. The exercise: wrong → the
 * misconception it shows (when known) and the worked solution.
 */
export function trialCheck(input: { step: number | "exercise"; answer: string; attempt: number }) {
  const { lesson, skill, question } = trialContent();
  const dialogue = skill.dialogue!;
  if (input.step === "exercise") {
    const grade = gradeDeterministic(question, input.answer);
    const correct = grade.status === "correct";
    const misconception = grade.status === "incorrect" && grade.misconception ? lesson.misconceptions[grade.misconception] ?? null : null;
    return {
      correct,
      hint: null,
      then: null,
      misconception,
      answer: correct ? null : question.answer,
      steps: correct ? null : question.steps ?? null,
      rule: dialogue.rule,
    };
  }
  const step = dialogue.steps[input.step];
  if (!step) throw new TRPCError({ code: "BAD_REQUEST", message: "TRIAL_STEP" });
  const correct = dialogueAnswerMatches(step, input.answer);
  const last = input.step === dialogue.steps.length - 1;
  return {
    correct,
    hint: correct ? null : step.hint,
    then: correct ? step.then ?? null : null,
    misconception: null,
    answer: !correct && input.attempt >= 2 ? step.answer : null,
    steps: null,
    rule: (correct || input.attempt >= 2) && last ? dialogue.rule : null,
  };
}
