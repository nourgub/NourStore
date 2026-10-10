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
import { toDarja } from "./darja";
import { foreignLanguageOfSubject, type ForeignLang } from "@shared/taughtLanguages";

/** Starts every message that closes a dialogue (the phone call looks for it). */
export const DIALOGUE_DONE = "🎯";

/** The language the dialogue is held in: Arabic, or a language lesson's own language (teacher speaking it). */
export type DialogueLang = "ar" | ForeignLang;

/** What the teacher says around the dialogue's own questions, in each language. */
const PHRASES: Record<
  DialogueLang,
  {
    praise: string[];
    start: (skillName: string) => string;
    done: (name: string) => string;
    next: string;
    resume: string;
    thinkWithMe: string;
    notYet: string;
    answer: (answer: string) => string;
    notQuite: (answer: string) => string;
  }
> = {
  ar: {
    praise: ["✔ بالضبط!", "✔ نعم، أحسنت!", "✔ صحيح!", "✔ ممتاز!"],
    start: skillName => `هيا نكتشف «${skillName}» معاً بالحوار. لن أعطيك القاعدة جاهزة: أنت من سيصل إليها، خطوة صغيرة بعد خطوة.`,
    done: name => `${DIALOGUE_DONE} رائع يا ${name}، لقد وصلت إلى القاعدة بنفسك:`,
    next: "قل «اختبرني» لأتأكد أنك فهمتها، أو «علّمني بالحوار» لنكتشف فكرة أخرى.",
    resume: "لنعد إلى سؤالنا:",
    thinkWithMe: "لا بأس، فكّر معي.",
    notYet: "ليس بعد، لكنك قريب.",
    answer: answer => `الجواب: ${answer}.`,
    notQuite: answer => `ليس تماماً — الجواب: ${answer}.`,
  },
  de: {
    praise: ["✔ Genau!", "✔ Ja, sehr gut!", "✔ Richtig!", "✔ Super!"],
    start: skillName => `Wir entdecken «${skillName}» zusammen im Dialog. Ich gebe dir die Regel nicht fertig: Du findest sie selbst, Schritt für Schritt.`,
    done: name => `${DIALOGUE_DONE} Super, ${name}! Du hast die Regel selbst gefunden:`,
    next: "Sag «Frag mich», dann prüfe ich, ob du sie verstanden hast, oder «Im Dialog», dann entdecken wir eine neue Idee.",
    resume: "Zurück zu unserer Frage:",
    thinkWithMe: "Kein Problem, denk mit mir nach.",
    notYet: "Noch nicht, aber du bist nah dran.",
    answer: answer => `Die Antwort: ${answer}.`,
    notQuite: answer => `Nicht ganz. Die Antwort: ${answer}.`,
  },
  es: {
    praise: ["✔ ¡Exacto!", "✔ ¡Sí, muy bien!", "✔ ¡Correcto!", "✔ ¡Genial!"],
    start: skillName => `Vamos a descubrir «${skillName}» juntos en diálogo. No te doy la regla hecha: tú la encuentras, paso a paso.`,
    done: name => `${DIALOGUE_DONE} ¡Genial, ${name}! Has encontrado la regla tú solo:`,
    next: "Di «Pregúntame» y compruebo si la has entendido, o «En diálogo» para descubrir otra idea.",
    resume: "Volvamos a nuestra pregunta:",
    thinkWithMe: "No pasa nada, piensa conmigo.",
    notYet: "Todavía no, pero estás cerca.",
    answer: answer => `La respuesta: ${answer}.`,
    notQuite: answer => `Casi. La respuesta: ${answer}.`,
  },
  it: {
    praise: ["✔ Esatto!", "✔ Sì, bravissimo!", "✔ Giusto!", "✔ Ottimo!"],
    start: skillName => `Scopriamo insieme «${skillName}» in dialogo. Non ti do la regola già pronta: la trovi tu, passo dopo passo.`,
    done: name => `${DIALOGUE_DONE} Ottimo, ${name}! Hai trovato la regola da solo:`,
    next: "Di' «Fammi una domanda» e controllo se l'hai capita, oppure «In dialogo» per scoprire un'altra idea.",
    resume: "Torniamo alla nostra domanda:",
    thinkWithMe: "Nessun problema, pensa con me.",
    notYet: "Non ancora, ma ci sei vicino.",
    answer: answer => `La risposta: ${answer}.`,
    notQuite: answer => `Non proprio. La risposta: ${answer}.`,
  },
  fr: {
    praise: ["✔ Exactement !", "✔ Oui, très bien !", "✔ C'est juste !", "✔ Excellent !"],
    start: skillName => `Découvrons ensemble «${skillName}» en dialogue. Je ne te donne pas la règle toute faite : tu la trouves toi-même, étape par étape.`,
    done: name => `${DIALOGUE_DONE} Bravo ${name}, tu as trouvé la règle tout seul :`,
    next: "Dis «Interroge-moi» pour que je vérifie que tu l'as comprise, ou «En dialogue» pour découvrir une autre idée.",
    resume: "Revenons à notre question :",
    thinkWithMe: "Pas de souci, réfléchis avec moi.",
    notYet: "Pas encore, mais tu es proche.",
    answer: answer => `La réponse : ${answer}.`,
    notQuite: answer => `Pas tout à fait. La réponse : ${answer}.`,
  },
  en: {
    praise: ["✔ Exactly!", "✔ Yes, well done!", "✔ That's right!", "✔ Excellent!"],
    start: skillName => `Let's discover «${skillName}» together in a dialogue. I won't give you the rule ready-made: you'll find it yourself, step by step.`,
    done: name => `${DIALOGUE_DONE} Great, ${name}! You found the rule yourself:`,
    next: "Say «Ask me» so I can check you've understood it, or «In dialogue» to discover another idea.",
    resume: "Let's go back to our question:",
    thinkWithMe: "No problem, think with me.",
    notYet: "Not yet, but you're close.",
    answer: answer => `The answer: ${answer}.`,
    notQuite: answer => `Not quite. The answer: ${answer}.`,
  },
};

/** The skill's dialogue in that language (a taught language only where the skill has its edition in it). */
export function dialogueIn(skill: Skill, lang: DialogueLang): Dialogue | undefined {
  return lang === "ar" ? skill.dialogue : skill.taught?.dialogue;
}

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

export type DialogueState = { skill: Skill; dialogue: Dialogue; index: number; hinted: boolean; lang: DialogueLang };

/** Where the dialogue stands, read from the teacher's last message. */
export function dialogueState(lesson: Lesson, lastTutorMessage: string | null | undefined): DialogueState | null {
  if (!lastTutorMessage || !lastTutorMessage.includes("❓ (")) return null;
  const taught = foreignLanguageOfSubject(lesson.subject);
  for (const lang of taught ? (["ar", taught] as const) : (["ar"] as const)) {
    for (const skill of lesson.skills) {
      const dialogue = dialogueIn(skill, lang);
      if (!dialogue) continue;
      for (let index = dialogue.steps.length - 1; index >= 0; index -= 1) {
        // The teacher may have said it in Fusha or in Darja (./darja.ts), or in German.
        const line = stepLine(dialogue, index);
        if (lastTutorMessage.includes(line) || lastTutorMessage.includes(toDarja(line))) {
          const hint = `💡 ${dialogue.steps[index].hint}`;
          return {
            skill,
            dialogue,
            index,
            hinted: lastTutorMessage.includes(hint) || lastTutorMessage.includes(toDarja(hint)),
            lang,
          };
        }
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
  return `${PHRASES[state.lang].resume}\n${stepLine(state.dialogue, state.index)}`;
}

/** Opens the skill's dialogue, in the taught language when asked and the skill has its edition in it. */
export function startDialogue(skill: Skill, lang: DialogueLang = "ar"): string {
  const taught = lang !== "ar" && skill.taught ? skill.taught : null;
  const dialogue = taught ? taught.dialogue : skill.dialogue!;
  return [PHRASES[taught ? lang : "ar"].start(taught ? taught.name : skill.name), dialogue.opening, stepLine(dialogue, 0)].join("\n\n");
}

function advance(state: DialogueState, name: string, lead: string): string {
  const { dialogue, index } = state;
  const phrases = PHRASES[state.lang];
  const step = dialogue.steps[index];
  const said = [lead, step.then].filter(Boolean).join(" ");
  if (index + 1 < dialogue.steps.length) return `${said}\n\n${stepLine(dialogue, index + 1)}`;
  return [said, phrases.done(name), dialogue.rule, phrases.next].join("\n");
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
  const phrases = PHRASES[state.lang];
  if (intent === "giveUp") {
    if (!state.hinted) return `${phrases.thinkWithMe}\n💡 ${step.hint}\n\n${stepLine(state.dialogue, state.index)}`;
    return advance(state, name, phrases.answer(step.answer));
  }
  if (dialogueAnswerMatches(step, message)) return advance(state, name, phrases.praise[seed % phrases.praise.length]);
  // A question or a request is not an attempt at the answer.
  if (intent !== "explain" || /[؟?]/.test(message)) return null;
  if (!state.hinted) return `${phrases.notYet}\n💡 ${step.hint}\n\n${stepLine(state.dialogue, state.index)}`;
  return advance(state, name, phrases.notQuite(step.answer));
}
