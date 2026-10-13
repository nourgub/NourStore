// BAC English (اللغة الإنجليزية), studied by every stream: grammar (tenses,
// passive / reported speech / relative clauses, conditionals / wishes /
// modals, linking words / word formation / pronunciation), then the text
// part (comprehension, vocabulary, writing). Explanations are in Arabic,
// the language itself in English.
import type { Lesson } from "../../curriculum";
import { tensesLesson } from "./tenses";
import { grammarLesson } from "./grammar";
import { structuresLesson } from "./structures";
import { linkingLesson } from "./linking";
import { textLesson } from "./text";
import { ENGLISH_DIALOGUES } from "./dialogues";
import { ENGLISH_EDITIONS, ENGLISH_MISCONCEPTIONS, ENGLISH_PROMPTS, ENGLISH_REMEDIES } from "./englishEdition";

export const ENGLISH_LESSONS: Lesson[] = [tensesLesson, grammarLesson, structuresLesson, linkingLesson, textLesson];

/** The entries of `labels` whose keys the lesson uses. */
const restrictedTo = (keys: string[], labels: Record<string, string>) =>
  Object.fromEntries(keys.filter(key => labels[key]).map(key => [key, labels[key]]));

// Every skill teaches by dialogue too (./dialogues.ts), and has its English
// edition for the teacher speaking English (./englishEdition.ts).
for (const lesson of ENGLISH_LESSONS) {
  lesson.titleTaught ??= ENGLISH_EDITIONS[lesson.key]?.title;
  for (const skill of lesson.skills) {
    skill.dialogue ??= ENGLISH_DIALOGUES[lesson.key]?.[skill.key];
    skill.taught ??= ENGLISH_EDITIONS[lesson.key]?.skills[skill.key];
  }
  for (const question of lesson.bank) question.promptTaught ??= ENGLISH_PROMPTS[question.id];
  lesson.misconceptionsTaught ??= restrictedTo(Object.keys(lesson.misconceptions), ENGLISH_MISCONCEPTIONS);
  lesson.remediesTaught ??= restrictedTo(Object.keys(lesson.remedies ?? {}), ENGLISH_REMEDIES);
}
