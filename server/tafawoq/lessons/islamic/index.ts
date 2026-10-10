// BAC Islamic sciences (العلوم الإسلامية), taken by all streams: belief and
// the Qur'an, the sources of legislation, the family, financial dealings,
// and values in society — as multiple-choice items with Arabic explanations.
import type { Lesson } from "../../curriculum";
import { faithLesson } from "./faith";
import { sourcesLesson } from "./sources";
import { familyLesson } from "./family";
import { economyLesson } from "./economy";
import { valuesLesson } from "./values";
import { ISLAMIC_DIALOGUES } from "./dialogues";

export const ISLAMIC_LESSONS: Lesson[] = [faithLesson, sourcesLesson, familyLesson, economyLesson, valuesLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of ISLAMIC_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= ISLAMIC_DIALOGUES[lesson.key]?.[skill.key];
}
