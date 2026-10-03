// Tafawoq AI Teacher — teaching by dialogue ("علّمني بالحوار").
//
// Understanding over memorising: the teacher does not hand over the rule.
// It asks a chain of small questions, each answerable from what the student
// already knows, nudges with a hint after a wrong answer (never the answer
// itself), reveals only after a second miss, and lets the student arrive at
// the rule — then names it. Free and deterministic: the dialogue is written
// per skill (Skill.dialogue) and answers are checked by mathematical
// equivalence or by key words.
//
// The dialogue keeps no state of its own: where we are is read back from the
// teacher's last message (each step is printed with a unique "❓ (i/n)"
// line), so it works the same in the chat, the live voice session and the
// phone call.
import type { Dialogue, DialogueStep, Lesson, Skill } from "./curriculum";
import type { StudentContext } from "./context";
import { answersMatch } from "./grading";
import { expressionsEquivalent, parseExpression } from "./mathExpr";
import { spokenToAnswer } from "./spokenAnswer";

/** Starts every message that closes a dialogue (the phone call looks for it). */
export const DIALOGUE_DONE = "🎯";

const PRAISE = ["✔ بالضبط!", "✔ نعم، أحسنت!", "✔ صحيح!", "✔ ممتاز!"];

const NON_WORD = new RegExp("[^\\p{L}\\p{N}]+", "gu");

function normalizeWords(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(NON_WORD, " ")
    .trim();
}

const hasLetters = (text: string) => /[؀-ۿ]|[a-z]{3,}/i.test(text);

const INFINITY_WORDS = /ما\s*لا\s*نهاي[ةه]|مالانهاي[ةه]|لا\s*نهاي[ةه]|l['’]?infini|infinity|infini|\binf\b/i;
const NEGATIVE_WORDS = /ناقص|سالب|moins|minus/i;

/** +1 / −1 for "+∞", "−∞", "ناقص ما لا نهاية"…; null when no infinity is named. */
export function infinitySign(text: string): 1 | -1 | null {
  const symbol = text.match(/([+−-]?)\s*∞/);
  if (symbol) return symbol[1] === "−" || symbol[1] === "-" ? -1 : 1;
  const words = text.match(INFINITY_WORDS);
  if (!words) return null;
  const before = text.slice(0, words.index);
  return NEGATIVE_WORDS.test(before) || /[−-]\s*$/.test(before) ? -1 : 1;
}

/** True when the student's reply (typed or spoken) gives this step's answer. */
export function dialogueAnswerMatches(step: DialogueStep, message: string): boolean {
  const forms = [step.answer, ...(step.accept ?? [])];
  const infinity = infinitySign(message);
  if (forms.some(form => /^\s*[+−-]?\s*∞\s*$/.test(form))) {
    return infinity !== null && forms.some(form => infinitySign(form) === infinity);
  }
  const converted = spokenToAnswer(message);
  const mathCandidates = [converted, converted.replace(/[؀-ۿ]+/g, " ").replace(/\s+/g, " ").trim(), message.trim()];
  const words = ` ${normalizeWords(message)} `;
  return forms.some(form => {
    if (!hasLetters(form) && parseExpression(form)) {
      return mathCandidates.some(
        candidate => candidate !== "" && (answersMatch(form, candidate) || expressionsEquivalent(form, candidate))
      );
    }
    const key = normalizeWords(form);
    return key.length >= 2 && words.includes(key.length <= 3 ? ` ${key} ` : key);
  });
}

function stepLine(dialogue: Dialogue, index: number): string {
  return `❓ (${index + 1}/${dialogue.steps.length}) ${dialogue.steps[index].ask}`;
}

export type DialogueState = { skill: Skill; dialogue: Dialogue; index: number; hinted: boolean };

/** Where the dialogue stands, read from the teacher's last message. */
export function dialogueState(lesson: Lesson, lastTutorMessage: string | null | undefined): DialogueState | null {
  if (!lastTutorMessage || !lastTutorMessage.includes("❓ (")) return null;
  for (const skill of lesson.skills) {
    const dialogue = skill.dialogue;
    if (!dialogue) continue;
    for (let index = dialogue.steps.length - 1; index >= 0; index -= 1) {
      if (lastTutorMessage.includes(stepLine(dialogue, index))) {
        return { skill, dialogue, index, hinted: lastTutorMessage.includes(`💡 ${dialogue.steps[index].hint}`) };
      }
    }
  }
  return null;
}

/** Skills that have a dialogue, weakest first (the student's focus first). */
export function dialogueSkills(lesson: Lesson, context: StudentContext): Skill[] {
  const mastery = new Map(context.skills.map(skill => [skill.key, skill.mastery]));
  const focus = context.focusSkills.map(skill => skill.key);
  return lesson.skills
    .filter(skill => skill.dialogue)
    .sort((a, b) => {
      const focusA = focus.includes(a.key) ? focus.indexOf(a.key) : 99;
      const focusB = focus.includes(b.key) ? focus.indexOf(b.key) : 99;
      return focusA - focusB || (mastery.get(a.key) ?? 0) - (mastery.get(b.key) ?? 0);
    });
}

/** Puts the current question back after an interruption ("مثال؟", "لماذا؟"). */
export function resumeLine(state: DialogueState): string {
  return `لنعد إلى سؤالنا:\n${stepLine(state.dialogue, state.index)}`;
}

export function startDialogue(skill: Skill): string {
  const dialogue = skill.dialogue!;
  return [
    `هيا نكتشف «${skill.name}» معاً بالحوار. لن أعطيك القاعدة جاهزة: أنت من سيصل إليها، خطوة صغيرة بعد خطوة.`,
    dialogue.opening,
    stepLine(dialogue, 0),
  ].join("\n\n");
}

function advance(state: DialogueState, name: string, lead: string): string {
  const { dialogue, index } = state;
  const step = dialogue.steps[index];
  const said = [lead, step.then].filter(Boolean).join(" ");
  if (index + 1 < dialogue.steps.length) return `${said}\n\n${stepLine(dialogue, index + 1)}`;
  return [
    said,
    `${DIALOGUE_DONE} رائع يا ${name}، لقد وصلت إلى القاعدة بنفسك:`,
    dialogue.rule,
    "قل «اختبرني» لأتأكد أنك فهمتها، أو «علّمني بالحوار» لنكتشف فكرة أخرى.",
  ].join("\n");
}

/**
 * One turn of the dialogue, or null when the message is not part of it
 * (a new request: the normal tutor answers and the dialogue pauses).
 */
export function dialogueReply(
  state: DialogueState,
  message: string,
  intent: string,
  name: string,
  seed: number
): string | null {
  const step = state.dialogue.steps[state.index];
  if (intent === "giveUp") {
    if (!state.hinted) return `لا بأس، فكّر معي.\n💡 ${step.hint}\n\n${stepLine(state.dialogue, state.index)}`;
    return advance(state, name, `الجواب: ${step.answer}.`);
  }
  if (dialogueAnswerMatches(step, message)) return advance(state, name, PRAISE[seed % PRAISE.length]);
  // A question or a request is not an attempt at the answer.
  if (intent !== "explain" || /[؟?]/.test(message)) return null;
  if (!state.hinted) return `ليس بعد، لكنك قريب.\n💡 ${step.hint}\n\n${stepLine(state.dialogue, state.index)}`;
  return advance(state, name, `ليس تماماً — الجواب: ${step.answer}.`);
}
