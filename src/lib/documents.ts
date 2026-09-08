import { insertDocument, listDocuments } from "./db";
import type { CurriculumDocument, ExtractionStatus, SubjectId } from "./types";

export interface CreateDocumentInput {
  teacherId: string;
  subjectId: SubjectId;
  fileName: string;
  gradeLevel: string;
  topics: string[];
  styleNotes: string;
  extractionStatus?: ExtractionStatus;
  extractedText?: string;
}

export async function createDocument(input: CreateDocumentInput): Promise<CurriculumDocument> {
  const doc: CurriculumDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
    fileName: input.fileName,
    gradeLevel: input.gradeLevel,
    topics: input.topics,
    styleNotes: input.styleNotes,
    extractionStatus: input.extractionStatus ?? "none",
    extractedText: input.extractedText ?? "",
    createdAt: new Date().toISOString(),
  };
  insertDocument(doc);
  return doc;
}

export async function listDocumentsForTeacher(teacherId: string, subjectId: SubjectId): Promise<CurriculumDocument[]> {
  return listDocuments(teacherId, subjectId);
}
