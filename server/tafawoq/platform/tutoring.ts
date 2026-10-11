// Sessions with a human teacher (حجز حصة مع أستاذ).
//
// An admin creates teacher profiles (linked to a "teacher" account, so the
// teacher logs in and manages their own sessions) with the subjects they
// teach and a price per session (0 = included in the subscription). A
// teacher opens time slots; a subscribed student books one in one of their
// own subjects; the teacher (or an admin) confirms — which creates a free
// Jitsi video room — or declines; after the session it is marked done, with
// an optional note for the student. Every step notifies the other side.
//
// Rules, all enforced here: an active subscription; a subject of the
// student's own (stream, second subject, third language); at least
// MIN_NOTICE_H ahead; at most MAX_UPCOMING sessions to come; a slot is
// taken by one student only (conditional update); free cancellation until
// CANCEL_LIMIT_H before; each teacher sees and manages only their sessions.
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { BAC_SUBJECTS, isPlatformStream, type BacSubject, type PlatformStream } from "@shared/bacPlatform";
import * as db from "../../db/tutoring";
import * as bac from "../../db/bacPlatform";
import { logAdminAction } from "../../db/adminAudit";
import * as tafawoq from "../service";
import { hasActiveSubscription } from "./access";
import { allowedSubjects } from "./catalog";

export const MIN_NOTICE_H = 2;
export const CANCEL_LIMIT_H = 12;
export const MAX_UPCOMING = 3;
const HOUR = 60 * 60 * 1000;
/** How far ahead students see slots, and teachers may open them. */
const HORIZON_DAYS = 30;
/** The room opens this long before the session. */
const JOIN_EARLY_MIN = 15;

const SUBJECTS = BAC_SUBJECTS.filter(subject => subject !== "third_language");

function fail(code: "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string): never {
  throw new TRPCError({ code, message });
}

function parseSubjects(csv: string): BacSubject[] {
  return csv.split(",").filter((entry): entry is BacSubject => (SUBJECTS as readonly string[]).includes(entry));
}

/** "الأحد 12/10 · 18:00" in Algiers time. */
export function sessionTime(date: Date): string {
  return new Intl.DateTimeFormat("ar-DZ-u-nu-latn", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Algiers",
  }).format(date);
}

async function notify(userId: number | null | undefined, title: string, body: string) {
  if (!userId) return;
  await bac.insertNotifications([{ userId, type: "tafawoq_session", title, body }]);
}

async function bookingStudent(userId: number) {
  const student = await tafawoq.studentOrThrow(userId);
  if (!student.streamLockedAt || !isPlatformStream(student.stream)) fail("FORBIDDEN", "STREAM_REQUIRED");
  return student as typeof student & { stream: PlatformStream };
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

/** The teachers of the student's subjects, with their open slots. */
export async function tutorsForStudent(userId: number, now = new Date()) {
  const student = await bookingStudent(userId);
  const allowed = allowedSubjects(student.stream, student.secondSubject, student.thirdLanguage);
  const tutors = (await db.listTutors({ activeOnly: true }))
    .map(({ tutor }) => ({ tutor, subjects: parseSubjects(tutor.subjects).filter(subject => allowed.has(subject)) }))
    .filter(entry => entry.subjects.length);
  const slots = await db.openSlots(
    tutors.map(entry => entry.tutor.id),
    new Date(now.getTime() + MIN_NOTICE_H * HOUR)
  );
  const until = now.getTime() + HORIZON_DAYS * 24 * HOUR;
  return {
    subscriptionActive: await hasActiveSubscription(userId),
    rules: { minNoticeHours: MIN_NOTICE_H, cancelLimitHours: CANCEL_LIMIT_H, maxUpcoming: MAX_UPCOMING },
    tutors: tutors.map(({ tutor, subjects }) => ({
      id: tutor.id,
      name: tutor.displayName,
      bio: tutor.bio,
      priceDa: tutor.priceDa,
      subjects,
      slots: slots
        .filter(slot => slot.tutorId === tutor.id && slot.startsAt.getTime() <= until)
        .map(slot => ({ id: slot.id, startsAt: slot.startsAt, durationMin: slot.durationMin })),
    })),
  };
}

export async function bookSession(userId: number, input: { slotId: number; subject: BacSubject; note?: string | null }, now = new Date()) {
  const student = await bookingStudent(userId);
  if (!(await hasActiveSubscription(userId))) fail("FORBIDDEN", "SUBSCRIPTION_REQUIRED");
  if (!allowedSubjects(student.stream, student.secondSubject, student.thirdLanguage).has(input.subject)) fail("FORBIDDEN", "SUBJECT_NOT_ALLOWED");
  const slot = await db.getSlot(input.slotId);
  if (!slot || slot.status !== "open") fail("CONFLICT", "SLOT_TAKEN");
  const tutor = await db.getTutor(slot.tutorId);
  if (!tutor || !tutor.active || !parseSubjects(tutor.subjects).includes(input.subject)) fail("BAD_REQUEST", "TUTOR_SUBJECT");
  if (slot.startsAt.getTime() < now.getTime() + MIN_NOTICE_H * HOUR) fail("BAD_REQUEST", "SLOT_TOO_SOON");
  if ((await db.upcomingCount(userId, now)) >= MAX_UPCOMING) fail("BAD_REQUEST", "TOO_MANY_SESSIONS");
  // Two students clicking at once: only one takes the slot.
  if (!(await db.takeSlot(slot.id))) fail("CONFLICT", "SLOT_TAKEN");
  const note = input.note?.trim() ? input.note.trim() : null;
  const id = await db.insertBooking({ slotId: slot.id, tutorId: tutor.id, studentId: student.id, userId, subject: input.subject, note });
  await notify(tutor.userId, "طلب حصة جديد", `${student.displayName} يطلب حصة يوم ${sessionTime(slot.startsAt)}. أكّد الحصة أو اعتذر عنها من صفحة «حصصي».`);
  await bac.logEvent(userId, "session_booked", { bookingId: id, tutorId: tutor.id, subject: input.subject });
  return { id };
}

type BookingRow = Awaited<ReturnType<typeof db.studentBookings>>[number];

function view(row: BookingRow, now: Date) {
  const start = row.startsAt.getTime();
  const end = start + row.durationMin * 60_000;
  const live = row.booking.status === "requested" || row.booking.status === "confirmed";
  return {
    id: row.booking.id,
    status: row.booking.status,
    subject: row.booking.subject as BacSubject,
    note: row.booking.note,
    tutorNote: row.booking.tutorNote,
    tutorName: row.tutorName,
    studentName: row.studentName,
    startsAt: row.startsAt,
    durationMin: row.durationMin,
    // The room only once confirmed.
    meetingUrl: row.booking.status === "confirmed" || row.booking.status === "done" ? row.booking.meetingUrl : null,
    canJoin: row.booking.status === "confirmed" && now.getTime() >= start - JOIN_EARLY_MIN * 60_000 && now.getTime() <= end,
    canCancel: live && start - now.getTime() >= CANCEL_LIMIT_H * HOUR,
    past: end < now.getTime(),
  };
}

export async function myBookings(userId: number, now = new Date()) {
  return (await db.studentBookings(userId)).map(row => view(row, now));
}

export async function cancelMyBooking(userId: number, bookingId: number, now = new Date()) {
  const booking = await db.getBooking(bookingId);
  if (!booking || booking.userId !== userId) fail("NOT_FOUND", "BOOKING_NOT_FOUND");
  const slot = await db.getSlot(booking.slotId);
  if (!slot) fail("NOT_FOUND", "BOOKING_NOT_FOUND");
  if (slot.startsAt.getTime() - now.getTime() < CANCEL_LIMIT_H * HOUR) fail("BAD_REQUEST", "CANCEL_TOO_LATE");
  if (!(await db.moveBooking(booking.id, ["requested", "confirmed"], "cancelled", { cancelledBy: userId }))) fail("CONFLICT", "BOOKING_CLOSED");
  // The slot is free again for another student.
  await db.setSlotStatus(slot.id, "open", "booked");
  const tutor = await db.getTutor(booking.tutorId);
  await notify(tutor?.userId, "أُلغيت حصة", `ألغى التلميذ حصة يوم ${sessionTime(slot.startsAt)}، وعاد الموعد متاحاً.`);
  await bac.logEvent(userId, "session_cancelled", { bookingId });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Teacher (their own sessions) and admin (every teacher)
// ---------------------------------------------------------------------------

type Actor = { userId: number; admin: boolean };

async function ownTutor(actor: Actor) {
  const tutor = await db.getTutorByUser(actor.userId);
  if (!tutor) fail("FORBIDDEN", "NOT_A_TUTOR");
  return tutor;
}

/** The teacher's page: profile, slots to come, and bookings. */
export async function tutorDashboard(userId: number, now = new Date()) {
  const tutor = await db.getTutorByUser(userId);
  if (!tutor) return { tutor: null, slots: [], bookings: [] };
  const [slots, bookings] = await Promise.all([db.tutorSlots(tutor.id, new Date(now.getTime() - 24 * HOUR)), db.tutorBookings(tutor.id)]);
  return {
    tutor: { id: tutor.id, name: tutor.displayName, subjects: parseSubjects(tutor.subjects), priceDa: tutor.priceDa, active: tutor.active === 1 },
    slots: slots.map(slot => ({ id: slot.id, startsAt: slot.startsAt, durationMin: slot.durationMin, status: slot.status })),
    bookings: bookings.map(row => view(row, now)),
  };
}

/** Opens slots for a teacher: in the future, within the horizon, never overlapping one already open or booked. */
export async function addSlots(actor: Actor, input: { tutorId?: number; startsAt: Date[]; durationMin: number }, now = new Date()) {
  const tutor = actor.admin && input.tutorId ? await db.getTutor(input.tutorId) : await ownTutor(actor);
  if (!tutor) fail("NOT_FOUND", "TUTOR_NOT_FOUND");
  const rows: Array<{ tutorId: number; startsAt: Date; durationMin: number }> = [];
  const sorted = [...input.startsAt].sort((a, b) => a.getTime() - b.getTime());
  for (const startsAt of sorted) {
    if (startsAt.getTime() < now.getTime() + HOUR) fail("BAD_REQUEST", "SLOT_IN_PAST");
    if (startsAt.getTime() > now.getTime() + HORIZON_DAYS * 24 * HOUR) fail("BAD_REQUEST", "SLOT_TOO_FAR");
    const end = new Date(startsAt.getTime() + input.durationMin * 60_000);
    const previous = rows.at(-1);
    if (previous && previous.startsAt.getTime() + previous.durationMin * 60_000 > startsAt.getTime()) fail("BAD_REQUEST", "SLOT_OVERLAP");
    if ((await db.overlappingSlots(tutor.id, startsAt, end)).length) fail("BAD_REQUEST", "SLOT_OVERLAP");
    rows.push({ tutorId: tutor.id, startsAt, durationMin: input.durationMin });
  }
  await db.insertSlots(rows);
  if (actor.admin) await logAdminAction({ actorId: actor.userId, action: "bac.tutor_slots_added", targetType: "tafawoqTutor", targetId: tutor.id, details: { count: rows.length } });
  return { added: rows.length };
}

/** Removes a slot nobody has booked. */
export async function cancelSlot(actor: Actor, slotId: number) {
  const slot = await db.getSlot(slotId);
  if (!slot) fail("NOT_FOUND", "SLOT_NOT_FOUND");
  if (!actor.admin && (await ownTutor(actor)).id !== slot.tutorId) fail("FORBIDDEN", "NOT_YOUR_SLOT");
  if (!(await db.setSlotStatus(slot.id, "cancelled", "open"))) fail("CONFLICT", "SLOT_BOOKED");
  return { ok: true };
}

export type ReviewAction = "confirm" | "decline" | "cancel" | "done";

/** The teacher (or an admin) answers a booking. */
export async function reviewBooking(actor: Actor, input: { bookingId: number; action: ReviewAction; note?: string | null }, now = new Date()) {
  const booking = await db.getBooking(input.bookingId);
  if (!booking) fail("NOT_FOUND", "BOOKING_NOT_FOUND");
  if (!actor.admin && (await ownTutor(actor)).id !== booking.tutorId) fail("FORBIDDEN", "NOT_YOUR_BOOKING");
  const slot = (await db.getSlot(booking.slotId))!;
  const when = sessionTime(slot.startsAt);
  const note = input.note?.trim() ? input.note.trim() : null;
  switch (input.action) {
    case "confirm": {
      // A free video room: unguessable name, nothing to install for the student.
      const meetingUrl = `https://meet.jit.si/Tafawoq-${booking.id}-${nanoid(14)}`;
      if (!(await db.moveBooking(booking.id, ["requested"], "confirmed", { meetingUrl, tutorNote: note }))) fail("CONFLICT", "BOOKING_CLOSED");
      await notify(booking.userId, "تم تأكيد حصتك", `حصتك يوم ${when} مؤكدة. ادخل إليها من صفحة «حصة مع أستاذ» قبل الموعد بقليل.${note ? ` رسالة الأستاذ: ${note}` : ""}`);
      break;
    }
    case "decline":
      if (!(await db.moveBooking(booking.id, ["requested"], "declined", { tutorNote: note }))) fail("CONFLICT", "BOOKING_CLOSED");
      await db.setSlotStatus(slot.id, "open", "booked");
      await notify(booking.userId, "تعذّرت الحصة", `اعتذر الأستاذ عن حصة يوم ${when}. يمكنك حجز موعد آخر.${note ? ` رسالة الأستاذ: ${note}` : ""}`);
      break;
    case "cancel":
      if (!(await db.moveBooking(booking.id, ["confirmed"], "cancelled", { tutorNote: note, cancelledBy: actor.userId }))) fail("CONFLICT", "BOOKING_CLOSED");
      // The teacher is not available any more: the slot is withdrawn.
      await db.setSlotStatus(slot.id, "cancelled", "booked");
      await notify(booking.userId, "أُلغيت حصتك", `أُلغيت حصة يوم ${when}. نعتذر منك، ويمكنك حجز موعد آخر.${note ? ` رسالة الأستاذ: ${note}` : ""}`);
      break;
    case "done":
      if (slot.startsAt.getTime() > now.getTime()) fail("BAD_REQUEST", "SESSION_NOT_STARTED");
      if (!(await db.moveBooking(booking.id, ["confirmed"], "done", { tutorNote: note }))) fail("CONFLICT", "BOOKING_CLOSED");
      if (note) await notify(booking.userId, "ملاحظة الأستاذ بعد الحصة", note);
      break;
  }
  if (actor.admin) {
    await logAdminAction({ actorId: actor.userId, action: `bac.session_${input.action}`, targetType: "tafawoqBooking", targetId: booking.id });
  }
  await bac.logEvent(actor.userId, `session_${input.action}`, { bookingId: booking.id });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Admin: teacher profiles and every booking
// ---------------------------------------------------------------------------

export async function adminTutors() {
  return (await db.listTutors()).map(({ tutor, email }) => ({
    id: tutor.id,
    name: tutor.displayName,
    email,
    subjects: parseSubjects(tutor.subjects),
    bio: tutor.bio,
    priceDa: tutor.priceDa,
    active: tutor.active === 1,
  }));
}

/** The account a teacher profile is linked to: an existing "teacher" (or admin) account. */
async function teacherAccount(email: string | null | undefined) {
  if (!email?.trim()) return null;
  const user = await db.findUserByEmail(email.trim().toLowerCase());
  if (!user) fail("BAD_REQUEST", "USER_NOT_FOUND");
  if (user.role !== "teacher" && user.role !== "admin") fail("BAD_REQUEST", "NOT_A_TEACHER_ACCOUNT");
  return user.id;
}

export async function adminSaveTutor(
  adminId: number,
  input: { id?: number; name: string; email?: string | null; subjects: BacSubject[]; bio?: string | null; priceDa: number; active: boolean }
) {
  const subjects = input.subjects.filter(subject => (SUBJECTS as readonly string[]).includes(subject));
  if (!subjects.length) fail("BAD_REQUEST", "TUTOR_SUBJECT");
  const userId = await teacherAccount(input.email);
  if (userId) {
    const linked = await db.getTutorByUser(userId);
    if (linked && linked.id !== input.id) fail("CONFLICT", "ACCOUNT_ALREADY_TUTOR");
  }
  const values = {
    displayName: input.name.trim(),
    userId,
    subjects: subjects.join(","),
    bio: input.bio?.trim() || null,
    priceDa: input.priceDa,
    active: input.active ? 1 : 0,
  };
  let id = input.id;
  if (id) {
    if (!(await db.getTutor(id))) fail("NOT_FOUND", "TUTOR_NOT_FOUND");
    await db.updateTutor(id, values);
  } else {
    id = await db.insertTutor(values);
  }
  await logAdminAction({ actorId: adminId, action: input.id ? "bac.tutor_updated" : "bac.tutor_created", targetType: "tafawoqTutor", targetId: id });
  return { id };
}

export async function adminBookings(status?: db.BookingStatus, now = new Date()) {
  return (await db.allBookings(status)).map(row => view(row, now));
}

export async function adminTutorSlots(tutorId: number, now = new Date()) {
  return (await db.tutorSlots(tutorId, new Date(now.getTime() - 24 * HOUR))).map(slot => ({
    id: slot.id,
    startsAt: slot.startsAt,
    durationMin: slot.durationMin,
    status: slot.status,
  }));
}
