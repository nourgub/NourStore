// The foreign languages taught as a BAC subject (the languages stream's
// third language, and French and English for every stream): their lessons
// are "de-…", "es-…", "it-…", "fr-…", "en-…". In those
// lessons the language itself is read by a voice of that language, and the
// student can choose to be taught in it (teacher style "foreign").
export const TAUGHT_LANGUAGES = {
  de: { subject: "german", bcp47: "de-DE", label: "Deutsch", question: "Frage", hint: "Tipp" },
  es: { subject: "spanish", bcp47: "es-ES", label: "Español", question: "Pregunta", hint: "Pista" },
  it: { subject: "italian", bcp47: "it-IT", label: "Italiano", question: "Domanda", hint: "Suggerimento" },
  fr: { subject: "french", bcp47: "fr-FR", label: "Français", question: "Question", hint: "Indice" },
  en: { subject: "english", bcp47: "en-GB", label: "English", question: "Question", hint: "Hint" },
} as const;

export type ForeignLang = keyof typeof TAUGHT_LANGUAGES;
export const FOREIGN_LANGS = Object.keys(TAUGHT_LANGUAGES) as ForeignLang[];

export function isForeignLang(value: unknown): value is ForeignLang {
  return typeof value === "string" && value in TAUGHT_LANGUAGES;
}

/** The language a subject teaches, if it is one. */
export function foreignLanguageOfSubject(subject: string | null | undefined): ForeignLang | null {
  return FOREIGN_LANGS.find(lang => TAUGHT_LANGUAGES[lang].subject === subject) ?? null;
}

/** The language a lesson teaches ("de-tenses" → "de"). */
export function foreignLanguageOfLesson(lessonKey: string | null | undefined): ForeignLang | null {
  const prefix = lessonKey?.split("-")[0];
  return isForeignLang(prefix) ? prefix : null;
}
