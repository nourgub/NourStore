// BAC history geography (التاريخ والجغرافيا): the Cold War, the Algerian
// revolution and the Third World, then the world economy and the Algerian
// economy with the answering method, as multiple-choice items on dates,
// figures, terms and documents (written answers go to a teacher).
import type { Lesson } from "../../curriculum";
import { coldWarLesson } from "./coldwar";
import { algeriaLesson } from "./algeria";
import { thirdWorldLesson } from "./thirdWorld";
import { economyLesson } from "./economy";
import { algeriaGeoLesson } from "./algeriaGeo";
import { HISTORY_GEOGRAPHY_DIALOGUES } from "./dialogues";

export const HISTORY_GEOGRAPHY_LESSONS: Lesson[] = [coldWarLesson, algeriaLesson, thirdWorldLesson, economyLesson, algeriaGeoLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of HISTORY_GEOGRAPHY_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= HISTORY_GEOGRAPHY_DIALOGUES[lesson.key]?.[skill.key];
}
