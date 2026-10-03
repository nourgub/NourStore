// Builds the StudentContext every generator (AI or template) is given —
// one place that turns raw skill states + attempt history into the
// student model: tier, strengths, weaknesses, recurring errors, speed,
// focus skills and plan.
import type { LearningSpeed, SchoolLevel, Tier } from "@shared/tafawoq";
import { SUBJECTS, type Lesson } from "./curriculum";
import {
  learningPlan,
  learningSpeed,
  overallMastery,
  recommendFocusSkills,
  recurringErrors,
  skillName,
  strengths,
  tierFor,
  weaknesses,
  type AttemptRecord,
  type PlanStep,
  type RecurringError,
  type SkillState,
} from "./studentModel";

type SkillSummary = { key: string; name: string; mastery: number };

export type StudentContext = {
  name: string;
  age: number;
  schoolLevel: SchoolLevel;
  goals: string;
  lessonKey: string;
  lessonTitle: string;
  subjectName: string;
  mastery: number;
  tier: Tier;
  learningSpeed: LearningSpeed;
  skills: SkillSummary[];
  strengths: SkillSummary[];
  weaknesses: SkillSummary[];
  focusSkills: SkillSummary[];
  recurringErrors: RecurringError[];
  plan: PlanStep[];
};

export function buildStudentContext(input: {
  student: { displayName: string; age: number; schoolLevel: SchoolLevel; goals: string | null };
  lesson: Lesson;
  states: SkillState[];
  attempts: AttemptRecord[];
}): StudentContext {
  const { student, lesson, states, attempts } = input;
  const mastery = overallMastery(states);
  const tier = tierFor(mastery);
  const toSummary = (entry: { skill: string; name: string; mastery: number }) => ({
    key: entry.skill,
    name: entry.name,
    mastery: entry.mastery,
  });
  return {
    name: student.displayName,
    age: student.age,
    schoolLevel: student.schoolLevel,
    goals: student.goals ?? "",
    lessonKey: lesson.key,
    lessonTitle: lesson.title,
    subjectName: SUBJECTS[lesson.subject].name,
    mastery,
    tier,
    learningSpeed: learningSpeed(attempts),
    skills: states.map(state => ({
      key: state.skill,
      name: skillName(lesson, state.skill),
      mastery: state.pKnown,
    })),
    strengths: strengths(lesson, states).map(toSummary),
    weaknesses: weaknesses(lesson, states).map(toSummary),
    focusSkills: recommendFocusSkills(lesson, states, tier).map(key => ({
      key,
      name: skillName(lesson, key),
      mastery: states.find(state => state.skill === key)?.pKnown ?? 0,
    })),
    recurringErrors: recurringErrors(lesson, attempts),
    plan: learningPlan(lesson, states, tier),
  };
}
