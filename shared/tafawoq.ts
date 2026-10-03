// Types shared between the Tafawoq AI Teacher server module
// (server/tafawoq/) and its client (client/src/pages/tafawoq/). Kept free
// of any server-only import so the browser bundle can use it directly.

export const SCHOOL_LEVELS = [
  "primary",
  "middle",
  "bem",
  "secondary",
  "bac",
] as const;
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

export const SCHOOL_LEVEL_LABELS_AR: Record<SchoolLevel, string> = {
  primary: "الابتدائي",
  middle: "المتوسط",
  bem: "السنة الرابعة متوسط (BEM)",
  secondary: "الثانوي",
  bac: "البكالوريا (BAC)",
};

/** Algerian BAC streams (الشعب). Only meaningful when schoolLevel is "bac". */
export const BAC_STREAMS = ["sciences", "math", "techmath", "gestion", "lettres", "langues"] as const;
export type BacStream = (typeof BAC_STREAMS)[number];

/** The three personalization tiers every generated artifact is shaped by. */
export const TIERS = ["weak", "intermediate", "advanced"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS_AR: Record<Tier, string> = {
  weak: "يحتاج إلى تأسيس",
  intermediate: "متوسط",
  advanced: "متفوق",
};

export type LearningSpeed = "slow" | "normal" | "fast" | "unknown";

export const LEARNING_SPEED_LABELS_AR: Record<LearningSpeed, string> = {
  slow: "يحتاج إلى وقت أطول",
  normal: "عادية",
  fast: "سريعة",
  unknown: "غير محددة بعد",
};

/** A question as the browser sees it — never carries the answer key. */
export type PublicQuestion = {
  id: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  type: "mcq" | "short";
  prompt: string;
  options?: string[];
};

export type LessonExample = {
  problem: string;
  steps: string[];
  answer: string;
};

export type LessonSection = {
  skill: string;
  heading: string;
  explanation: string;
  examples: LessonExample[];
  commonMistake?: string;
};

export type PersonalLesson = {
  title: string;
  intro: string;
  sections: LessonSection[];
  summary: string[];
  nextStep: string;
};

export type VideoVisual =
  | { kind: "title"; heading: string; subheading?: string }
  | { kind: "bullets"; heading: string; lines: string[] }
  | { kind: "formula"; heading: string; formula: string; caption?: string }
  | { kind: "example"; heading: string; problem: string; steps: string[] };

export type VideoScene = {
  narration: string;
  visual: VideoVisual;
};

export type VideoScript = {
  title: string;
  scenes: VideoScene[];
};

export type ContentSource = "ai" | "template";
