import { withDb } from "./db";
import type { CurriculumDocument, SubjectId } from "./types";

export interface CreateDocumentInput {
  teacherId: string;
  subjectId: SubjectId;
  fileName: string;
  gradeLevel: string;
  topics: string[];
  styleNotes: string;
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
    createdAt: new Date().toISOString(),
  };
  await withDb((db) => {
    db.documents.push(doc);
  });
  return doc;
}

export async function listDocumentsForTeacher(teacherId: string, subjectId: SubjectId): Promise<CurriculumDocument[]> {
  return withDb((db) =>
    db.documents
      .filter((d) => d.teacherId === teacherId && d.subjectId === subjectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
