// BAC arabic (اللغة العربية وآدابها): the three parts of the exam text
// questions — البناء الفكري، البناء اللغوي، التقويم النقدي — as lessons on
// grammar, morphology and rhetoric, prosody, literature and text analysis.
// Taught in Arabic only; studied by every stream.
import type { Lesson } from "../../curriculum";
import { grammarLesson } from "./grammar";
import { morphologyRhetoricLesson } from "./morphologyRhetoric";
import { prosodyLesson } from "./prosody";
import { literatureLesson } from "./literature";
import { textLesson } from "./text";
import { ARABIC_DIALOGUES } from "./dialogues";

export const ARABIC_LESSONS: Lesson[] = [grammarLesson, morphologyRhetoricLesson, prosodyLesson, literatureLesson, textLesson];

// Every skill teaches by dialogue too (./dialogues.ts).
for (const lesson of ARABIC_LESSONS) {
  for (const skill of lesson.skills) skill.dialogue ??= ARABIC_DIALOGUES[lesson.key]?.[skill.key];
}
