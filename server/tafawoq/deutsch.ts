// Tafawoq AI Teacher — the German teacher speaking German ("Deutsch").
//
// In a German lesson the student can choose to be taught in German: the
// greeting, the free tutor's answers, the discovery dialogue (./dialogue.ts),
// the oral quiz and the phone call are then in simple German (A2–B1), from
// each skill's German edition (lessons/german/deutsch.ts). Arabic stays as
// help where it matters most: an item's solution is shown "auf Arabisch".
// Deterministic and free, like the Arabic templates (./templates.ts).
import type { BankQuestion, Lesson, Skill } from "./curriculum";
import type { StudentContext } from "./context";
import type { TeacherStyle } from "./darja";
import { detectIntent, mentionedSkill } from "./templates";

/** The teacher speaks German: the student chose it, in a German lesson. */
export function speaksGerman(style: TeacherStyle | undefined, lesson: Pick<Lesson, "subject">): boolean {
  return style === "deutsch" && lesson.subject === "german";
}

/** The misconceptions of the German lessons, in German. */
export const GERMAN_MISCONCEPTIONS: Record<string, string> = {
  wrong_auxiliary: "das falsche Hilfsverb (haben statt sein oder umgekehrt)",
  participle_form: "eine falsche Form des Partizips II",
  irregular_as_regular: "ein unregelmäßiges Verb wie ein regelmäßiges konjugiert",
  tense_confusion: "die Zeiten verwechselt",
  conjugation_error: "die Verbform passt nicht zum Subjekt",
  verb_position: "das Verb an der falschen Position",
  connector_meaning: "die Bedeutung des Konnektors verwechselt",
  relative_pronoun: "das falsche Relativpronomen (Genus oder Kasus)",
  case_confusion: "Akkusativ und Dativ verwechselt",
  nominative_default: "den Artikel im Nominativ gelassen",
  gender_error: "das falsche Genus oder die falsche Zahl",
  preposition_case: "die Präposition mit dem falschen Kasus",
  passive_aux: "sein oder haben statt werden im Passiv",
  modal_meaning: "die Bedeutung der Modalverben verwechselt",
  modal_structure: "das Hauptverb nach dem Modalverb konjugiert",
  konjunktiv_form: "eine falsche Form des Konjunktivs II",
  comprehension_error: "eine Information im Text falsch verstanden",
  vocab_confusion: "ähnliche Wörter verwechselt",
  letter_convention: "eine falsche Anrede oder ein falscher Gruß im Brief",
  structure_error: "ein Fehler im Aufbau oder beim Konnektor",
};

/** How to fix them, in German. */
export const GERMAN_REMEDIES: Record<string, string> = {
  wrong_auxiliary: "Frag dich: Bewegt sich die Person von einem Ort zum anderen oder ändert sich ihr Zustand? Ja: sein (ist gegangen, ist aufgestanden). Nein: haben.",
  participle_form: "Regelmäßig ge…t, unregelmäßig ge…en, -ieren und be-/ver-/er- ohne ge, trennbare Verben: das Präfix vor ge.",
  verb_position: "Hauptsatz: das Verb auf Position 2 (nach deshalb oder trotzdem kommt das Subjekt danach). Nebensatz mit weil, dass, wenn, obwohl: das Verb am Ende.",
  connector_meaning: "weil und denn: Grund. deshalb: Folge. obwohl und trotzdem: Gegensatz.",
  case_confusion: "Direktes Objekt (was? wen?): Akkusativ, den und einen. Indirektes Objekt (wem?) und helfen, danken, gefallen: Dativ, dem, der, einem.",
  preposition_case: "mit, nach, bei, von, zu, aus, seit: Dativ. für, durch, gegen, ohne, um: Akkusativ. in, an, auf: wo? Dativ, wohin? Akkusativ.",
  passive_aux: "Passiv = werden: wird gebaut (Präsens), wurde gebaut (Präteritum).",
  modal_structure: "Das Modalverb ist konjugiert, das Hauptverb bleibt im Infinitiv am Ende: «Ich kann … sprechen».",
  comprehension_error: "Geh zurück in den Text: Such das Schlüsselwort der Frage und lies den ganzen Satz, bevor du antwortest.",
  letter_convention: "Freund: Lieber (maskulin) oder Liebe (feminin) … Viele Grüße. Formell: Sehr geehrter Herr oder Sehr geehrte Frau … Mit freundlichen Grüßen.",
};

const TIER_PLAN: Record<StudentContext["tier"], (focus: string) => string> = {
  weak: focus => `Wir beginnen mit «${focus}»: einfach erklärt, mit leichten Beispielen, und dann Schritt für Schritt weiter.`,
  intermediate: focus => `Wir konzentrieren uns auf «${focus}», mit verschiedenen Beispielen und Übungen.`,
  advanced: focus => `Wir vertiefen «${focus}» und lösen schwierigere Aufgaben.`,
};

function germanName(lesson: Lesson, key: string, fallback: string): string {
  return lesson.skills.find(skill => skill.key === key)?.de?.name ?? fallback;
}

function germanTitle(lesson: Lesson): string {
  return lesson.titleDe ?? lesson.title;
}

function errorLabel(error: { key: string; label: string }): string {
  return GERMAN_MISCONCEPTIONS[error.key] ?? error.label;
}

function exampleText(example: { problem: string; steps: string[]; answer: string }): string {
  return `${example.problem}\n${example.steps.map((step, index) => `${index + 1}) ${step}`).join("\n")}\n✔ ${example.answer}`;
}

/** The greeting that opens the German session (the Arabic one: templates.ts templateOpening). */
export function germanOpening(lesson: Lesson, context: StudentContext): string {
  const names = (skills: StudentContext["skills"]) => skills.map(skill => germanName(lesson, skill.key, skill.name)).join(", ");
  const focus = context.focusSkills[0];
  const parts = [`Hallo ${context.name}! Heute sprechen wir Deutsch.`];
  if (context.strengths.length) parts.push(`Ich sehe, du kannst ${names(context.strengths)} schon gut.`);
  if (context.weaknesses.length) parts.push(`Noch schwer für dich: ${names(context.weaknesses)}.`);
  if (context.recurringErrors.length) parts.push(`Ein Fehler kommt oft vor: ${errorLabel(context.recurringErrors[0])}.`);
  parts.push(focus ? TIER_PLAN[context.tier](germanName(lesson, focus.key, focus.name)) : "Du kannst diese Lektion schon! Jetzt kommen Extra-Aufgaben.");
  parts.push("Frag mich alles: «Ein Beispiel», «Einfacher», «Im Dialog» oder «Frag mich». Wenn du etwas nicht verstehst, helfe ich dir auch auf Arabisch.");
  return parts.join(" ");
}

function skillFor(lesson: Lesson, context: StudentContext, message: string): Skill | undefined {
  return (
    mentionedSkill(lesson, message) ??
    lesson.skills.find(entry => entry.key === context.focusSkills[0]?.key) ??
    lesson.skills.find(entry => entry.key === [...context.skills].sort((a, b) => a.mastery - b.mastery)[0]?.key)
  );
}

/** The free tutor in German (the Arabic one: templates.ts templateTutorReply). */
export function germanTutorReply(lesson: Lesson, context: StudentContext, message: string): string {
  const skill = skillFor(lesson, context, message);
  const de = skill?.de;
  if (!skill || !de) return `Sehr gut, ${context.name}! Mach jetzt die Übungen unter «تماريني».`;
  switch (detectIntent(message)) {
    case "thanks": {
      const next = context.focusSkills[0];
      return `Viel Erfolg, ${context.name}! ${next ? `Dein nächster Schritt: «${germanName(lesson, next.key, next.name)}». ` : ""}Ich bin immer für dich da.`;
    }
    case "mistake": {
      const error = context.recurringErrors[0];
      if (!error) {
        return `Ich sehe bei dir noch keinen Fehler, der oft vorkommt, ${context.name} 👍 Wenn du in einer Übung einen Fehler machst, schau die Korrektur Schritt für Schritt an.`;
      }
      const remedy = GERMAN_REMEDIES[error.key];
      return `Dieser Fehler kommt bei dir ${error.count}-mal vor: ${errorLabel(error)}.\n${remedy ? `✅ ${remedy}\n` : ""}\nSo geht es richtig:\n${exampleText(de.example)}`;
    }
    case "simpler": {
      const sentences = de.explanation.split(/(?<=[.:])\s+/).filter(Boolean);
      return `Kein Problem, Schritt für Schritt: «${de.name}»\n${sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n")}\n\nEin leichtes Beispiel:\n${exampleText(de.example)}\n\nIst es jetzt klar? Sag «Beispiel» für ein neues Beispiel, oder «Im Dialog».`;
    }
    case "challenge":
      return `Eine Herausforderung zu «${de.name}» 💪\n${exampleText(de.example)}\n\nSag jetzt «Frag mich», und ich prüfe dich.`;
    case "example":
      return `Ein gelöstes Beispiel zu «${de.name}»:\n${exampleText(de.example)}\n\nSag «Frag mich», dann versuchst du es selbst.`;
    default:
      return `«${de.name}»: ${de.explanation}\n\nBeispiel:\n${exampleText(de.example)}\n\nMöchtest du ein Beispiel, eine einfachere Erklärung oder einen Dialog?`;
  }
}

const GERMAN_LETTERS = ["A", "B", "C", "D"];

/** An oral quiz question in German; options are answered with A–D. */
export function germanOralQuestion(item: BankQuestion): string {
  const options =
    item.type === "mcq" && item.options
      ? "\n" + item.options.map((option, index) => `${GERMAN_LETTERS[index]}: ${option}`).join("\n") + "\nSag den Buchstaben (A, B, C oder D) oder die Antwort."
      : "\nSag oder schreib deine Antwort.";
  return `Frage: ${item.promptDe ?? item.prompt}${options}`;
}

/** The feedback on an oral answer in German; the solution stays in Arabic as help. */
export function germanOralFeedback(input: {
  name: string;
  correct: boolean;
  gaveUp: boolean;
  correctAnswer: string;
  misconceptionKey: string | undefined;
  explanation: string;
  progress: string;
}): string {
  if (input.correct) return `✔ Richtig, sehr gut, ${input.name}! Die Antwort: ${input.correctAnswer}.${input.progress}\nSag «Frag mich» für eine neue Frage.`;
  const key = input.misconceptionKey;
  return [
    input.gaveUp ? `Kein Problem. Die richtige Antwort: ${input.correctAnswer}.` : `Nicht ganz. Die richtige Antwort: ${input.correctAnswer}.`,
    key && GERMAN_MISCONCEPTIONS[key] ? `Der Fehler: ${GERMAN_MISCONCEPTIONS[key]}.` : null,
    key && GERMAN_REMEDIES[key] ? `✅ ${GERMAN_REMEDIES[key]}` : null,
    `Erklärung (auf Arabisch):\n${input.explanation}`,
    "Sag «Frag mich» für eine neue Frage.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The phone call's opening in German (the Arabic one: templates.ts callIntroText). */
export function germanCallIntro(lesson: Lesson, context: StudentContext): string {
  const focus = context.focusSkills[0] ?? [...context.skills].sort((a, b) => a.mastery - b.mastery)[0];
  const skill = lesson.skills.find(entry => entry.key === focus?.key) ?? lesson.skills[0];
  const de = skill.de;
  const error = context.recurringErrors[0];
  return [
    `Hallo ${context.name}! Hier ist dein Deutschlehrer. Wie geht es dir?`,
    `Heute arbeiten wir zusammen an «${de?.name ?? skill.name}» in der Lektion «${germanTitle(lesson)}».`,
    error ? `Ein Fehler kommt bei dir manchmal vor: ${errorLabel(error)}. Wir korrigieren ihn zusammen.` : "",
    "Ich gebe dir die Regel nicht fertig: Ich stelle dir kleine Fragen, und du findest sie selbst. Dann prüfe ich dich mit drei kurzen Fragen.",
    "Sag jederzeit «Wiederhole», dann sage ich es noch einmal, oder «Ich weiß es nicht», dann helfe ich dir.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The phone call's goodbye in German (the Arabic one: templates.ts callSummaryText). */
export function germanCallSummary(input: {
  name: string;
  correct: number;
  total: number;
  skillName: string | null;
  before: number | null;
  after: number | null;
  nextSkillName: string | null;
}): string {
  const { name, correct, total, skillName, before, after, nextSkillName } = input;
  const lines = [`Unsere Stunde ist zu Ende, ${name}.`];
  if (total) lines.push(`Du hast ${correct} von ${total} Fragen richtig beantwortet.`);
  if (skillName && total) {
    const rose = before !== null && after !== null && Math.round(after * 100) > Math.round(before * 100);
    if (rose && correct * 2 >= total) {
      lines.push(`Bei «${skillName}» bist du von ${Math.round(before! * 100)} % auf ${Math.round(after! * 100)} % gestiegen. Sehr gut!`);
    } else if (correct * 2 < total) {
      lines.push(`Wir wiederholen «${skillName}» noch einmal. Das ist normal: Aus jedem Fehler lernst du.`);
    }
  }
  if (total && correct === total) {
    lines.push(nextSkillName ? `Super! Beim nächsten Anruf kommt «${nextSkillName}».` : "Super! Du bist bereit für schwerere Übungen.");
  } else if (total) {
    lines.push("Mach bitte deine Übungen unter «تماريني» vor unserem nächsten Anruf.");
  }
  lines.push("Tschüss und viel Erfolg!");
  return lines.join(" ");
}

/** A skill's German name for the call summary, from the lesson. */
export function germanSkillName(lesson: Lesson, key: string | undefined, fallback: string | null): string | null {
  if (!key) return fallback;
  return germanName(lesson, key, fallback ?? key);
}
