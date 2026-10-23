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
import { GERMAN_EDITIONS, GERMAN_MISCONCEPTIONS, GERMAN_PROMPTS, GERMAN_REMEDIES } from "./deutsch";

export const GERMAN_LESSONS: Lesson[] = [tensesLesson, sentencesLesson, casesLesson, verbsLesson, textLesson];

// Every skill teaches by dialogue too (./dialogues.ts), and has its German
// edition for the teacher speaking German (./deutsch.ts).
for (const lesson of GERMAN_LESSONS) {
  lesson.titleTaught ??= GERMAN_EDITIONS[lesson.key]?.title;
  const keys = Object.keys(lesson.misconceptions);
  lesson.misconceptionsTaught ??= Object.fromEntries(keys.filter(key => GERMAN_MISCONCEPTIONS[key]).map(key => [key, GERMAN_MISCONCEPTIONS[key]]));
  lesson.remediesTaught ??= Object.fromEntries(keys.filter(key => GERMAN_REMEDIES[key]).map(key => [key, GERMAN_REMEDIES[key]]));
  for (const skill of lesson.skills) {
    skill.dialogue ??= GERMAN_DIALOGUES[lesson.key]?.[skill.key];
    skill.taught ??= GERMAN_EDITIONS[lesson.key]?.skills[skill.key];
  }
  for (const question of lesson.bank) question.promptTaught ??= GERMAN_PROMPTS[question.id];
}
