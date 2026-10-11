// Sessions with a human teacher — persistence (drizzle/0034_add_tafawoq_tutoring.sql).
// The rules live in server/tafawoq/platform/tutoring.ts; this file only
// reads and writes, with conditional updates where two requests could race
// (two students booking the same slot, a booking reviewed twice).
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { tafawoqBookings, tafawoqStudents, tafawoqTutorSlots, tafawoqTutors, users } from "../../drizzle/schema";
import { getDb } from "./shared";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database not configured" });
  return db;
}

export type Tutor = typeof tafawoqTutors.$inferSelect;
export type Slot = typeof tafawoqTutorSlots.$inferSelect;
export type Booking = typeof tafawoqBookings.$inferSelect;
export type BookingStatus = Booking["status"];

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

export async function listTutors(options: { activeOnly?: boolean } = {}) {
  const db = await requireDb();
  return db
    .select({ tutor: tafawoqTutors, email: users.email })
    .from(tafawoqTutors)
    .leftJoin(users, eq(users.id, tafawoqTutors.userId))
    .where(options.activeOnly ? eq(tafawoqTutors.active, 1) : undefined)
    .orderBy(asc(tafawoqTutors.displayName));
}

export async function getTutor(id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(tafawoqTutors).where(eq(tafawoqTutors.id, id)).limit(1);
  return row;
}

export async function getTutorByUser(userId: number) {
  const db = await requireDb();
  const [row] = await db.select().from(tafawoqTutors).where(eq(tafawoqTutors.userId, userId)).limit(1);
  return row;
}

export async function findUserByEmail(email: string) {
  const db = await requireDb();
  const [row] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email)).limit(1);
  return row;
}

export async function insertTutor(input: Omit<typeof tafawoqTutors.$inferInsert, "id" | "createdAt">) {
  const db = await requireDb();
  const [result] = await db.insert(tafawoqTutors).values(input);
  return result.insertId;
}

export async function updateTutor(id: number, input: Partial<Omit<typeof tafawoqTutors.$inferInsert, "id" | "createdAt">>) {
  const db = await requireDb();
  await db.update(tafawoqTutors).set(input).where(eq(tafawoqTutors.id, id));
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export async function insertSlots(rows: Array<{ tutorId: number; startsAt: Date; durationMin: number }>) {
  if (!rows.length) return;
  const db = await requireDb();
  await db.insert(tafawoqTutorSlots).values(rows);
}

/** The teacher's slots that overlap [from, to) and are not cancelled (no double slots). */
export async function overlappingSlots(tutorId: number, from: Date, to: Date) {
  const db = await requireDb();
  return db
    .select({ id: tafawoqTutorSlots.id })
    .from(tafawoqTutorSlots)
    .where(
      and(
        eq(tafawoqTutorSlots.tutorId, tutorId),
        inArray(tafawoqTutorSlots.status, ["open", "booked"]),
        sql`${tafawoqTutorSlots.startsAt} < ${to}`,
        sql`DATE_ADD(${tafawoqTutorSlots.startsAt}, INTERVAL ${tafawoqTutorSlots.durationMin} MINUTE) > ${from}`
      )
    );
}

/** Open slots from `after`, for the given teachers. */
export async function openSlots(tutorIds: number[], after: Date, limit = 300) {
  if (!tutorIds.length) return [];
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqTutorSlots)
    .where(and(inArray(tafawoqTutorSlots.tutorId, tutorIds), eq(tafawoqTutorSlots.status, "open"), gt(tafawoqTutorSlots.startsAt, after)))
    .orderBy(asc(tafawoqTutorSlots.startsAt))
    .limit(limit);
}

/** A teacher's own slots from `after` (any status), with the booking on each. */
export async function tutorSlots(tutorId: number, after: Date) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqTutorSlots)
    .where(and(eq(tafawoqTutorSlots.tutorId, tutorId), gt(tafawoqTutorSlots.startsAt, after)))
    .orderBy(asc(tafawoqTutorSlots.startsAt))
    .limit(300);
}

export async function getSlot(id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(tafawoqTutorSlots).where(eq(tafawoqTutorSlots.id, id)).limit(1);
  return row;
}

/** open → booked, only if still open: false when another student took it first. */
export async function takeSlot(id: number) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqTutorSlots)
    .set({ status: "booked" })
    .where(and(eq(tafawoqTutorSlots.id, id), eq(tafawoqTutorSlots.status, "open")));
  return result.affectedRows === 1;
}

export async function setSlotStatus(id: number, status: Slot["status"], from?: Slot["status"]) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqTutorSlots)
    .set({ status })
    .where(from ? and(eq(tafawoqTutorSlots.id, id), eq(tafawoqTutorSlots.status, from)) : eq(tafawoqTutorSlots.id, id));
  return result.affectedRows === 1;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function insertBooking(input: { slotId: number; tutorId: number; studentId: number; userId: number; subject: string; note: string | null }) {
  const db = await requireDb();
  const [result] = await db.insert(tafawoqBookings).values(input);
  return result.insertId;
}

export async function getBooking(id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(tafawoqBookings).where(eq(tafawoqBookings.id, id)).limit(1);
  return row;
}

/** Moves a booking on only from the expected statuses (a booking is reviewed once). */
export async function moveBooking(
  id: number,
  from: BookingStatus[],
  to: BookingStatus,
  extra: { meetingUrl?: string | null; tutorNote?: string | null; cancelledBy?: number | null } = {}
) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqBookings)
    .set({ status: to, updatedAt: new Date(), ...extra })
    .where(and(eq(tafawoqBookings.id, id), inArray(tafawoqBookings.status, from)));
  return result.affectedRows === 1;
}

const bookingColumns = {
  booking: tafawoqBookings,
  startsAt: tafawoqTutorSlots.startsAt,
  durationMin: tafawoqTutorSlots.durationMin,
  tutorName: tafawoqTutors.displayName,
  tutorUserId: tafawoqTutors.userId,
  studentName: tafawoqStudents.displayName,
};

function bookingsQuery(db: Awaited<ReturnType<typeof requireDb>>) {
  return db
    .select(bookingColumns)
    .from(tafawoqBookings)
    .innerJoin(tafawoqTutorSlots, eq(tafawoqTutorSlots.id, tafawoqBookings.slotId))
    .innerJoin(tafawoqTutors, eq(tafawoqTutors.id, tafawoqBookings.tutorId))
    .innerJoin(tafawoqStudents, eq(tafawoqStudents.id, tafawoqBookings.studentId));
}

export async function studentBookings(userId: number) {
  const db = await requireDb();
  return bookingsQuery(db).where(eq(tafawoqBookings.userId, userId)).orderBy(desc(tafawoqTutorSlots.startsAt)).limit(50);
}

export async function tutorBookings(tutorId: number) {
  const db = await requireDb();
  return bookingsQuery(db).where(eq(tafawoqBookings.tutorId, tutorId)).orderBy(desc(tafawoqTutorSlots.startsAt)).limit(200);
}

export async function allBookings(status?: BookingStatus) {
  const db = await requireDb();
  return bookingsQuery(db)
    .where(status ? eq(tafawoqBookings.status, status) : undefined)
    .orderBy(desc(tafawoqTutorSlots.startsAt))
    .limit(300);
}

/** The student's bookings still to come (requested or confirmed, not yet started). */
export async function upcomingCount(userId: number, now: Date) {
  const db = await requireDb();
  const [row] = await db
    .select({ value: sql<number>`count(*)` })
    .from(tafawoqBookings)
    .innerJoin(tafawoqTutorSlots, eq(tafawoqTutorSlots.id, tafawoqBookings.slotId))
    .where(and(eq(tafawoqBookings.userId, userId), inArray(tafawoqBookings.status, ["requested", "confirmed"]), gt(tafawoqTutorSlots.startsAt, now)));
  return Number(row?.value ?? 0);
}
