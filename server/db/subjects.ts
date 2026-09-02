import {
  eq,
} from "drizzle-orm";
import {
  courses,
  skills,
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

export type DeleteSubjectResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "in_use" };

/**
 * Real delete — unlike setSubjectActive (a soft toggle), this removes the
 * row outright. Refuses when any course or skill still references the
 * subject's slug (both store it as a plain string, not a foreign key — see
 * the comment on `subjects` above — so a stale reference would otherwise
 * silently survive the subject's own deletion). The admin is expected to
 * reassign or archive that content first; this never cascades.
 */
export async function deleteSubject(id: number): Promise<DeleteSubjectResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select({ slug: subjects.slug })
    .from(subjects)
    .where(eq(subjects.id, id))
    .limit(1);
  const subject = rows[0];
  if (!subject) return { ok: false, reason: "not_found" };
  const [courseRows, skillRows] = await Promise.all([
    db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.subject, subject.slug))
      .limit(1),
    db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.subject, subject.slug))
      .limit(1),
  ]);
  if (courseRows.length || skillRows.length) return { ok: false, reason: "in_use" };
  await db.delete(subjects).where(eq(subjects.id, id));
  return { ok: true };
}
