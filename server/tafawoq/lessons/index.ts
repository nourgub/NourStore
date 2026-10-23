// BAC mathematics (Algerian curriculum), in teaching order. Each file is
// one lesson: skill graph + misconceptions + parametric generators.
import type { Lesson } from "../curriculum";
import { limitsLesson } from "./limits";
import { sequencesLesson } from "./sequences";
import { exponentialLesson } from "./exponential";
import { logarithmLesson } from "./logarithm";
import { complexLesson } from "./complex";
import { integralsLesson } from "./integrals";
import { probabilityLesson } from "./probability";
import { spaceGeometryLesson } from "./spaceGeometry";
import { arithmeticLesson } from "./arithmetic";
import { statisticsLesson } from "./statistics";
import { differentialEquationsLesson } from "./differentialEquations";

export const BAC_LESSONS: Lesson[] = [
  limitsLesson,
  exponentialLesson,
  logarithmLesson,
  sequencesLesson,
  complexLesson,
  integralsLesson,
  probabilityLesson,
  spaceGeometryLesson,
  arithmeticLesson,
  statisticsLesson,
  differentialEquationsLesson,
  // Lessons still being written have no skills yet and are not offered.
].filter(lesson => lesson.skills.length > 0);
