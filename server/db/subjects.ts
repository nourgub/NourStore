import {
  eq,
} from "drizzle-orm";
import {
  subjects,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function getActiveSubjects() {
    const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(subjects)
    .where(eq(subjects.isActive, 1))
    .orderBy(subjects.titleEn);
}

export async function getAllSubjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).orderBy(subjects.titleEn);
}

export async function createSubject(input: {
  slug: string;
  icon: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(eq(subjects.slug, input.slug))
    .limit(1);
  if (existing.length) return existing[0];
  return db.insert(subjects).values(input);
}

export async function setSubjectActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(subjects)
    .set({ isActive: isActive ? 1 : 0 })
    .where(eq(subjects.id, id));
  return true;
}
