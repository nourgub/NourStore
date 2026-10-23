// BAC Spanish (اللغة الإسبانية), third language of the foreign-languages
// stream: grammar (tenses, ser / estar and pronouns, subjunctive and si
// clauses, sentence building), then the text part (comprehension,
// vocabulary, writing). Explanations are in Arabic, the language itself in Spanish.
import type { Lesson } from "../../curriculum";
import { tensesLesson } from "./tenses";
import { verbsLesson } from "./verbs";
import { subjunctiveLesson } from "./subjunctive";
import { sentencesLesson } from "./sentences";
import { textLesson } from "./text";
import { SPANISH_DIALOGUES } from "./dialogues";
import { SPANISH_EDITIONS, SPANISH_MISCONCEPTIONS, SPANISH_PROMPTS, SPANISH_REMEDIES } from "./espanol";

export const SPANISH_LESSONS: Lesson[] = [tensesLesson, verbsLesson, subjunctiveLesson, sentencesLesson, textLesson];

/** The entries of `labels` whose keys the lesson uses. */
const restrictedTo = (keys: string[], labels: Record<string, string>) =>
  Object.fromEntries(keys.filter(key => labels[key]).map(key => [key, labels[key]]));

// Every skill teaches by dialogue too (./dialogues.ts), and has its Spanish
// edition for the teacher speaking Spanish (./espanol.ts).
for (const lesson of SPANISH_LESSONS) {
  lesson.titleTaught ??= SPANISH_EDITIONS[lesson.key]?.title;
  for (const skill of lesson.skills) {
    skill.dialogue ??= SPANISH_DIALOGUES[lesson.key]?.[skill.key];
    skill.taught ??= SPANISH_EDITIONS[lesson.key]?.skills[skill.key];
  }
  for (const question of lesson.bank) question.promptTaught ??= SPANISH_PROMPTS[question.id];
  lesson.misconceptionsTaught ??= restrictedTo(Object.keys(lesson.misconceptions), SPANISH_MISCONCEPTIONS);
  lesson.remediesTaught ??= restrictedTo(Object.keys(lesson.remedies ?? {}), SPANISH_REMEDIES);
}
