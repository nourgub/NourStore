// BAC Italian (اللغة الإيطالية), third language of the foreign-languages
// stream: grammar (tenses, articles and prepositions, moods, sentence
// building), then the text part (comprehension, vocabulary, writing).
// Explanations are in Arabic, the language itself in Italian.
import type { Lesson } from "../../curriculum";
import { tensesLesson } from "./tenses";
import { articlesLesson } from "./articles";
import { verbsLesson } from "./verbs";
import { sentencesLesson } from "./sentences";
import { textLesson } from "./text";
import { ITALIAN_DIALOGUES } from "./dialogues";
import { ITALIAN_EDITIONS, ITALIAN_MISCONCEPTIONS, ITALIAN_PROMPTS, ITALIAN_REMEDIES } from "./italiano";

export const ITALIAN_LESSONS: Lesson[] = [tensesLesson, articlesLesson, verbsLesson, sentencesLesson, textLesson];

/** The entries of `labels` for the given keys only. */
function restrictTo(labels: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.filter(key => labels[key]).map(key => [key, labels[key]]));
}

// Every skill teaches by dialogue too (./dialogues.ts), and has its Italian
// edition for the teacher speaking Italian (./italiano.ts).
for (const lesson of ITALIAN_LESSONS) {
  lesson.titleTaught ??= ITALIAN_EDITIONS[lesson.key]?.title;
  for (const skill of lesson.skills) {
    skill.dialogue ??= ITALIAN_DIALOGUES[lesson.key]?.[skill.key];
    skill.taught ??= ITALIAN_EDITIONS[lesson.key]?.skills[skill.key];
  }
  for (const question of lesson.bank) question.promptTaught ??= ITALIAN_PROMPTS[question.id];
  lesson.misconceptionsTaught ??= restrictTo(ITALIAN_MISCONCEPTIONS, Object.keys(lesson.misconceptions));
  lesson.remediesTaught ??= restrictTo(ITALIAN_REMEDIES, Object.keys(lesson.remedies ?? {}));
}
