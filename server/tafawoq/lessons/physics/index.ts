// BAC physical sciences (العلوم الفيزيائية), Algerian 3AS programme, in teaching order.
import type { Lesson } from "../../curriculum";
import { chemistryLesson } from "./chemistry";
import { nuclearLesson } from "./nuclear";
import { electricLesson } from "./electric";
import { mechanicsLesson } from "./mechanics";
import { PHYSICS_DIALOGUES } from "./dialogues";

export const PHYSICS_LESSONS: Lesson[] = [chemistryLesson, nuclearLesson, electricLesson, mechanicsLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of PHYSICS_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= PHYSICS_DIALOGUES[lesson.key]?.[skill.key];
}
