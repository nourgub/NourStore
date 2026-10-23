// BAC French (اللغة الفرنسية), first foreign language of every stream:
// grammar (tenses, passive / reported speech / relatives, logical
// relations and the subjunctive), then discourse (text types,
// argumentation, enunciation) and the text part (comprehension,
// vocabulary, writing). Explanations are in Arabic, the language itself in French.
import type { Lesson } from "../../curriculum";
import { tensesLesson } from "./tenses";
import { grammarLesson } from "./grammar";
import { logicLesson } from "./logic";
import { discourseLesson } from "./discourse";
import { textLesson } from "./text";
import { FRENCH_DIALOGUES } from "./dialogues";
import { FRENCH_EDITIONS, FRENCH_MISCONCEPTIONS, FRENCH_PROMPTS, FRENCH_REMEDIES } from "./francais";

export const FRENCH_LESSONS: Lesson[] = [tensesLesson, grammarLesson, logicLesson, discourseLesson, textLesson];

/** The entries of `labels` whose keys the lesson uses. */
const restrictedTo = (keys: string[], labels: Record<string, string>) =>
  Object.fromEntries(keys.filter(key => labels[key]).map(key => [key, labels[key]]));

// Every skill teaches by dialogue too (./dialogues.ts), and has its French
// edition for the teacher speaking French (./francais.ts).
for (const lesson of FRENCH_LESSONS) {
  lesson.titleTaught ??= FRENCH_EDITIONS[lesson.key]?.title;
  for (const skill of lesson.skills) {
    skill.dialogue ??= FRENCH_DIALOGUES[lesson.key]?.[skill.key];
    skill.taught ??= FRENCH_EDITIONS[lesson.key]?.skills[skill.key];
  }
  for (const question of lesson.bank) question.promptTaught ??= FRENCH_PROMPTS[question.id];
  lesson.misconceptionsTaught ??= restrictedTo(Object.keys(lesson.misconceptions), FRENCH_MISCONCEPTIONS);
  lesson.remediesTaught ??= restrictedTo(Object.keys(lesson.remedies ?? {}), FRENCH_REMEDIES);
}
