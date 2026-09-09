import { and, desc, eq } from "drizzle-orm";
import { secondaryTimetables } from "../../drizzle/schema";
import { getDb } from "./shared";

// Persistence for secondary-school timetables (جدول التوقيت في الثانوي).
// The rules themselves live in shared/secondaryTimetable.ts; this module
// only stores and retrieves, and enforces one thing of its own: a
// timetable belongs to the staff member who created it, and only that
// person or an admin may read or change it.

export type TimetableRole = "institution" | "admin";

export type StoredTimetable = {
  id: number;
  ownerId: number;
  name: string;
  schoolYear: string;
  status: "draft" | "published";
  config: string;
  sessions: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Rows the caller is allowed to see: their own, or all of them for an admin. */
export async function listTimetables(userId: number, role: TimetableRole) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: secondaryTimetables.id,
      ownerId: secondaryTimetables.ownerId,
      name: secondaryTimetables.name,
      schoolYear: secondaryTimetables.schoolYear,
      status: secondaryTimetables.status,
      notes: secondaryTimetables.notes,
      createdAt: secondaryTimetables.createdAt,
      updatedAt: secondaryTimetables.updatedAt,
    })
    .from(secondaryTimetables)
    .where(
      role === "admin" ? undefined : eq(secondaryTimetables.ownerId, userId)
    )
    .orderBy(desc(secondaryTimetables.updatedAt));
}

/**
 * One timetable with its full payload. Returns null rather than the row
 * when it belongs to somebody else, so a wrong id and a foreign id are
 * indistinguishable from outside.
 */
export async function getTimetable(
  id: number,
  userId: number,
  role: TimetableRole
): Promise<StoredTimetable | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(secondaryTimetables)
    .where(
      role === "admin"
        ? eq(secondaryTimetables.id, id)
        : and(
            eq(secondaryTimetables.id, id),
            eq(secondaryTimetables.ownerId, userId)
          )
    )
    .limit(1);
  return (rows[0] as StoredTimetable | undefined) ?? null;
}

export async function createTimetable(input: {
  ownerId: number;
  name: string;
  schoolYear: string;
  status: "draft" | "published";
  config: string;
  sessions: string;
  notes?: string;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(secondaryTimetables).values({
    ownerId: input.ownerId,
    name: input.name,
    schoolYear: input.schoolYear,
    status: input.status,
    config: input.config,
    sessions: input.sessions,
    notes: input.notes ?? null,
  });
  return (result as { insertId: number }).insertId;
}

/** Overwrites an existing timetable the caller owns (an admin, any). */
export async function updateTimetable(input: {
  id: number;
  userId: number;
  role: TimetableRole;
  name?: string;
  schoolYear?: string;
  status?: "draft" | "published";
  config?: string;
  sessions?: string;
  notes?: string | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await getTimetable(input.id, input.userId, input.role);
  if (!existing) return false;
  await db
    .update(secondaryTimetables)
    .set({
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.schoolYear != null ? { schoolYear: input.schoolYear } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      ...(input.config != null ? { config: input.config } : {}),
      ...(input.sessions != null ? { sessions: input.sessions } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    })
    .where(eq(secondaryTimetables.id, input.id));
  return true;
}

export async function deleteTimetable(
  id: number,
  userId: number,
  role: TimetableRole
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await getTimetable(id, userId, role);
  if (!existing) return false;
  await db.delete(secondaryTimetables).where(eq(secondaryTimetables.id, id));
  return true;
}
