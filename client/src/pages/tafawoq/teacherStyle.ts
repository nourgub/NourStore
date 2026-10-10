// How the teacher speaks — Fusha or Algerian Darja (server/tafawoq/darja.ts),
// or German in the German lessons (server/tafawoq/deutsch.ts).
// A per-device preference, so it lives in localStorage; the page works the
// same (Fusha) when storage is unavailable.
import { useState } from "react";
import { foreignLanguageOfLesson } from "@shared/spokenArabic";

export type TeacherStyle = "fusha" | "darja" | "deutsch";

const KEY = "tfq-teacher-style";

function read(): TeacherStyle {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "darja" || stored === "deutsch" ? stored : "fusha";
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

/** The styles a lesson offers: German only in the German lessons. */
export function stylesFor(lessonKey: string | null | undefined): TeacherStyle[] {
  return foreignLanguageOfLesson(lessonKey) === "de" ? ["fusha", "darja", "deutsch"] : ["fusha", "darja"];
}

/** The chosen style where it applies: "deutsch" outside a German lesson is Fusha. */
export function styleIn(style: TeacherStyle, lessonKey: string | null | undefined): TeacherStyle {
  return stylesFor(lessonKey).includes(style) ? style : "fusha";
}

/** Chat suggestions in German (the teacher speaking German). */
export function germanSuggestions(focus?: string): string[] {
  return ["Frag mich", focus ? `Bring mir ${focus} im Dialog bei` : "Im Dialog", "Ein Beispiel bitte", "Warum mache ich Fehler?"];
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
