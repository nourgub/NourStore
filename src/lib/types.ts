export type SubjectId = "math";

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface Session {
  token: string;
  teacherId: string;
  createdAt: string;
  expiresAt: string;
}

export type ExtractionStatus = "none" | "extracted" | "unsupported" | "failed";

export interface CurriculumDocument {
  id: string;
  teacherId: string;
  subjectId: SubjectId;
  fileName: string;
  gradeLevel: string;
  topics: string[];
  styleNotes: string;
  extractionStatus: ExtractionStatus;
  extractedText: string;
  createdAt: string;
}

export type GenerationStatus = "queued" | "running" | "done" | "failed";

export interface AgentStep {
  agent: string;
  label: string;
  status: "pending" | "running" | "done";
  detail?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface GeneratedQuestion {
  id: string;
  topic: string;
  difficulty: "سهل" | "متوسط" | "صعب";
  points: number;
  prompt: string;
  solution: string;
  rubric: { criterion: string; points: number }[];
}

export interface GenerationRequest {
  id: string;
  teacherId: string;
  subjectId: SubjectId;
  documentId: string | null;
  examTitle: string;
  gradeLevel: string;
  topics: string[];
  numQuestions: number;
  difficultyMix: "متوازن" | "سهل" | "صعب";
  status: GenerationStatus;
  steps: AgentStep[];
  questions: GeneratedQuestion[];
  files: { examDocx?: string; solutionDocx?: string; rubricDocx?: string };
  createdAt: string;
  finishedAt?: string;
}

export interface DbShape {
  teachers: Teacher[];
  sessions: Session[];
  documents: CurriculumDocument[];
  requests: GenerationRequest[];
}
