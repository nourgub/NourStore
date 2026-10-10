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
import { GERMAN_EDITIONS, GERMAN_PROMPTS } from "./deutsch";

export const GERMAN_LESSONS: Lesson[] = [tensesLesson, sentencesLesson, casesLesson, verbsLesson, textLesson];

// Every skill teaches by dialogue too (./dialogues.ts), and has its German
// edition for the teacher speaking German (./deutsch.ts).
for (const lesson of GERMAN_LESSONS) {
  lesson.titleDe ??= GERMAN_EDITIONS[lesson.key]?.title;
  for (const skill of lesson.skills) {
    skill.dialogue ??= GERMAN_DIALOGUES[lesson.key]?.[skill.key];
    skill.de ??= GERMAN_EDITIONS[lesson.key]?.skills[skill.key];
  }
  for (const question of lesson.bank) question.promptDe ??= GERMAN_PROMPTS[question.id];
}
