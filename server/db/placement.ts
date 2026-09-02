import {
  desc,
  eq,
} from "drizzle-orm";
import {
  placementAttempts,
  placementQuestions,
  placementTests,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function getPlacementTestsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(placementTests)
    .orderBy(desc(placementTests.createdAt));
}

export async function createPlacementTest(input: {
  subject: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  isPublished?: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(placementTests)
    .values({ ...input, isPublished: input.isPublished ? 1 : 0 });
  return result;
}

export async function createPlacementQuestion(input: {
  testId: number;
  promptAr: string;
  promptFr: string;
  promptEn: string;
  optionsJson?: string;
  answerKey?: string;
  skill: string;
  difficulty: "starter" | "easy" | "medium" | "hard";
  orderIndex: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(placementQuestions).values(input);
}

export async function getPlacementTestWithQuestions() {
  const db = await getDb();
  if (!db) return { test: undefined, questions: [] };
  const testRows = await db
    .select()
    .from(placementTests)
    .where(eq(placementTests.isPublished, 1))
    .limit(1);
  const test = testRows[0];
  if (!test) return { test: undefined, questions: [] };
  const questions = await db
    .select()
    .from(placementQuestions)
    .where(eq(placementQuestions.testId, test.id))
    .orderBy(placementQuestions.orderIndex);
  return { test, questions };
}

export async function getPlacementTestForPublic() {
  const db = await getDb();
  if (!db) return { test: undefined, questions: [] };
  const testRows = await db
    .select()
    .from(placementTests)
    .where(eq(placementTests.isPublished, 1))
    .limit(1);
  const test = testRows[0];
  if (!test) return { test: undefined, questions: [] };
  const questions = await db
    .select({
      id: placementQuestions.id,
      testId: placementQuestions.testId,
      promptAr: placementQuestions.promptAr,
      promptFr: placementQuestions.promptFr,
      promptEn: placementQuestions.promptEn,
      optionsJson: placementQuestions.optionsJson,
      skill: placementQuestions.skill,
      difficulty: placementQuestions.difficulty,
      orderIndex: placementQuestions.orderIndex,
    })
    .from(placementQuestions)
    .where(eq(placementQuestions.testId, test.id))
    .orderBy(placementQuestions.orderIndex);
  return { test, questions };
}

export async function savePlacementAttempt(input: {
  testId: number;
  userId: number;
  score: number;
  recommendedLevel:
    | "starter"
    | "foundation"
    | "intermediate"
    | "advanced"
    | "exam";
  answersJson?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(placementAttempts).values(input);
  return result;
}
