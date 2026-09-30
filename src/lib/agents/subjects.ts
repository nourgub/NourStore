import type { GeneratedQuestion, SubjectId } from "../types";
import { AVAILABLE_MATH_TOPICS, generateMathQuestion } from "./mockContent";
import { AVAILABLE_ARABIC_TOPICS, generateArabicQuestion } from "./arabicContent";

type Difficulty = "سهل" | "متوسط" | "صعب";

export interface SubjectDefinition {
  id: SubjectId;
  displayName: string;
  // Used to open the Claude prompt ("أنت <persona> تُعِدّ امتحانًا...").
  persona: string;
  availableTopics: string[];
  generateMockQuestion: (topic: string, difficulty: Difficulty, pointsBudget: number) => GeneratedQuestion;
}

export const SUBJECTS: Record<SubjectId, SubjectDefinition> = {
  math: {
    id: "math",
    displayName: "الرياضيات",
    persona: "أستاذ رياضيات خبير",
    availableTopics: AVAILABLE_MATH_TOPICS,
    generateMockQuestion: generateMathQuestion,
  },
  arabic: {
    id: "arabic",
    displayName: "اللغة العربية",
    persona: "أستاذ لغة عربية خبير",
    availableTopics: AVAILABLE_ARABIC_TOPICS,
    generateMockQuestion: generateArabicQuestion,
  },
};

export function getSubjectDefinition(subjectId: SubjectId): SubjectDefinition {
  return SUBJECTS[subjectId];
}
