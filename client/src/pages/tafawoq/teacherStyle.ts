// How the teacher speaks — Fusha or Algerian Darja (server/tafawoq/darja.ts),
// or, in a language lesson, that language itself (server/tafawoq/foreign.ts).
// A per-device preference, so it lives in localStorage; the page works the
// same (Fusha) when storage is unavailable.
import { useState } from "react";
import { foreignLanguageOfLesson, type ForeignLang } from "@shared/taughtLanguages";

export type TeacherStyle = "fusha" | "darja" | "foreign";

const KEY = "tfq-teacher-style";

function read(): TeacherStyle {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "deutsch") return "foreign"; // the German-only name it had first
    return stored === "darja" || stored === "foreign" ? stored : "fusha";
  } catch {
    return "fusha";
  }
}

export function useTeacherStyle(): [TeacherStyle, (style: TeacherStyle) => void] {
  const [style, setStyle] = useState<TeacherStyle>(read);
  const update = (next: TeacherStyle) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: keep it for this visit only.
    }
    setStyle(next);
  };
  return [style, update];
}

/** The styles a lesson offers: its own language only in a language lesson. */
export function stylesFor(lessonKey: string | null | undefined): TeacherStyle[] {
  return foreignLanguageOfLesson(lessonKey) ? ["fusha", "darja", "foreign"] : ["fusha", "darja"];
}

/** The chosen style where it applies: "foreign" outside a language lesson is Fusha. */
export function styleIn(style: TeacherStyle, lessonKey: string | null | undefined): TeacherStyle {
  return stylesFor(lessonKey).includes(style) ? style : "fusha";
}

/** What the student says to a teacher speaking the taught language (understood by server/tafawoq/templates.ts). */
export const FOREIGN_REQUESTS: Record<
  ForeignLang,
  { quiz: string; dialogue: string; example: string; why: string; understood: string; notUnderstood: string; greeting: string }
> = {
  de: {
    quiz: "Frag mich",
    dialogue: "Im Dialog",
    example: "Ein Beispiel bitte",
    why: "Warum mache ich Fehler?",
    understood: "Verstanden, danke",
    notUnderstood: "Ich habe es nicht verstanden",
    greeting: "Ich bin jetzt bei dir. Frag mich alles zur Lektion, sag «Ein Beispiel», oder sag «Frag mich», dann stelle ich dir eine Frage.",
  },
  es: {
    quiz: "Pregúntame",
    dialogue: "En diálogo",
    example: "Un ejemplo, por favor",
    why: "¿Por qué me equivoco?",
    understood: "Entendido, gracias",
    notUnderstood: "No lo he entendido",
    greeting: "Estoy contigo. Pregúntame lo que quieras de la lección, di «Un ejemplo», o di «Pregúntame» y te hago una pregunta.",
  },
  it: {
    quiz: "Fammi una domanda",
    dialogue: "In dialogo",
    example: "Un esempio, per favore",
    why: "Perché sbaglio?",
    understood: "Ho capito, grazie",
    notUnderstood: "Non ho capito",
    greeting: "Sono qui con te. Chiedimi quello che vuoi sulla lezione, di' «Un esempio», oppure «Fammi una domanda» e ti faccio una domanda.",
  },
};

/** Chat suggestions in the taught language. */
export function foreignSuggestions(lang: ForeignLang): string[] {
  const requests = FOREIGN_REQUESTS[lang];
  return [requests.quiz, requests.dialogue, requests.example, requests.why];
}

/** Chat suggestions in Darja (what an Algerian student would type). */
export function darjaSuggestions(focus?: string): string[] {
  return ["سقسيني", focus ? `فهمني ${focus} بالحوار` : "فهمني بالحوار", "عطيني مثال", "علاش نغلط؟"];
}

/** Whose voice the teacher speaks with — a male or a female teacher (server/tafawoq/tts.ts). */
export type TeacherVoice = "male" | "female";

const VOICE_KEY = "tfq-teacher-voice";

export function readTeacherVoice(): TeacherVoice {
  try {
    return localStorage.getItem(VOICE_KEY) === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}

export function useTeacherVoice(): [TeacherVoice, (voice: TeacherVoice) => void] {
  const [voice, setVoice] = useState<TeacherVoice>(readTeacherVoice);
  const update = (next: TeacherVoice) => {
    try {
      localStorage.setItem(VOICE_KEY, next);
    } catch {
      // Private mode: keep it for this visit only.
    }
    setVoice(next);
  };
  return [voice, update];
}
