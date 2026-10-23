// BAC philosophy (الفلسفة), Algerian 3AS programme: the essay method, then
// the problematics, as multiple-choice items on positions, authors,
// arguments and their limits (essays themselves go to a teacher).
import type { Lesson } from "../../curriculum";
import { methodLesson } from "./method";
import { psycheLesson } from "./psyche";
import { languageLesson } from "./language";
import { ethicsLesson } from "./ethics";
import { scienceLesson } from "./science";
import { PHILOSOPHY_DIALOGUES } from "./dialogues";

export const PHILOSOPHY_LESSONS: Lesson[] = [methodLesson, psycheLesson, languageLesson, ethicsLesson, scienceLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of PHILOSOPHY_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= PHILOSOPHY_DIALOGUES[lesson.key]?.[skill.key];
}
