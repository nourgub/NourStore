// BAC German (اللغة الألمانية), third language of the foreign-languages
// stream: grammar (tenses, word order, cases, passive / modals /
// Konjunktiv II), then the text part (comprehension, vocabulary, writing).
// Explanations are in Arabic, the language itself in German.
import type { Lesson } from "../../curriculum";
import { tensesLesson } from "./tenses";
import { sentencesLesson } from "./sentences";
import { casesLesson } from "./cases";
import { verbsLesson } from "./verbs";
import { textLesson } from "./text";
import { GERMAN_DIALOGUES } from "./dialogues";

export const GERMAN_LESSONS: Lesson[] = [tensesLesson, sentencesLesson, casesLesson, verbsLesson, textLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of GERMAN_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= GERMAN_DIALOGUES[lesson.key]?.[skill.key];
}
