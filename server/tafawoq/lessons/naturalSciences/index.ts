// BAC natural sciences (علوم الطبيعة والحياة): protein synthesis, enzymes,
// immunity, nerve communication and energy conversion, as multiple-choice
// items with Arabic explanations.
import type { Lesson } from "../../curriculum";
import { proteinsLesson } from "./proteins";
import { enzymesLesson } from "./enzymes";
import { immunityLesson } from "./immunity";
import { nerveLesson } from "./nerve";
import { energyLesson } from "./energy";
import { NATURAL_SCIENCES_DIALOGUES } from "./dialogues";

export const NATURAL_SCIENCES_LESSONS: Lesson[] = [proteinsLesson, enzymesLesson, immunityLesson, nerveLesson, energyLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of NATURAL_SCIENCES_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= NATURAL_SCIENCES_DIALOGUES[lesson.key]?.[skill.key];
}
