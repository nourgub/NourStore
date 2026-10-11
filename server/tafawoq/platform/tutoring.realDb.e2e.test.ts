import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";
import { getDb } from "../../db/shared";
import { createEmailUser } from "../../db/usersAuth";
import { emailOpenId, hashPassword } from "../../_core/emailAuth";
import { notifications, tafawoqTutorSlots, users, type User } from "../../../drizzle/schema";

/**
 * REAL DATABASE run of sessions with a human teacher: an admin creates a
 * teacher profile linked to a teacher account, the teacher opens slots, a
 * subscribed student books one, the teacher confirms (video room), the
 * student cancels or the session is done — with every rule enforced.
 * SKIPPED (never faked as passing) without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const HOUR = 3_600_000;

function ctxFor(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

async function fixtureUser(label: string, role: User["role"] = "learner"): Promise<User> {
  const db = await getDb();
  const email = `${label}-${RUN}@tutor.test`;
  const openId = emailOpenId(email);
  const result = await createEmailUser({ openId, email, name: label, passwordHash: await hashPassword("a-long-test-password") });
  if (!result.ok) throw new Error(`fixture ${email}`);
  if (role !== "learner") await db!.update(users).set({ role }).where(eq(users.openId, openId));
  const [row] = await db!.select().from(users).where(eq(users.openId, openId)).limit(1);
  return row;
}

/** A sciences student with an active subscription. */
async function subscribedStudent(label: string, admin: User) {
  const user = await fixtureUser(label);
  const caller = appRouter.createCaller(ctxFor(user));
  await caller.tafawoq.register({ displayName: label, age: 17, schoolLevel: "bac" });
  await caller.bac.chooseStream({ stream: "sciences" });
  const request = await caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp" });
  await appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id });
  return { user, caller };
}

/** 90 minutes from now, to the minute. */
const soon = () => new Date(Math.ceil((Date.now() + 90 * 60_000) / 60_000) * 60_000);
/** Whole hours from now (MySQL keeps seconds). */
const at = (hours: number) => new Date(Math.ceil((Date.now() + hours * HOUR) / HOUR) * HOUR);

describe.skipIf(!HAS_DB || !!process.env.ANTHROPIC_API_KEY)("REAL DB — sessions with a human teacher", () => {
  let admin: User;
  let teacherUser: User;
  let otherTeacher: User;
  let tutorId: number;

  beforeAll(async () => {
    admin = await fixtureUser("admin", "admin");
    teacherUser = await fixtureUser("prof-physique", "teacher");
    otherTeacher = await fixtureUser("prof-autre", "teacher");
  });

  it("lets only an admin create a teacher profile, linked to a teacher account", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const learner = await fixtureUser("not-a-teacher");
    await expect(
      adminCaller.bacAdmin.saveTutor({ name: "Prof X", email: learner.email!, subjects: ["physics"], priceDa: 0, active: true })
    ).rejects.toMatchObject({ message: "NOT_A_TEACHER_ACCOUNT" });
    await expect(
      appRouter.createCaller(ctxFor(teacherUser)).bacAdmin.saveTutor({ name: "Prof X", subjects: ["physics"], priceDa: 0, active: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const saved = await adminCaller.bacAdmin.saveTutor({
      name: "الأستاذ كريم",
      email: teacherUser.email!,
      subjects: ["physics", "math"],
      bio: "أستاذ العلوم الفيزيائية، 10 سنوات خبرة",
      priceDa: 0,
      active: true,
    });
    tutorId = saved.id;
    // One profile per account.
    await expect(
      adminCaller.bacAdmin.saveTutor({ name: "Prof Y", email: teacherUser.email!, subjects: ["math"], priceDa: 0, active: true })
    ).rejects.toMatchObject({ message: "ACCOUNT_ALREADY_TUTOR" });
    const tutors = await adminCaller.bacAdmin.tutors();
    expect(tutors.find(entry => entry.id === tutorId)).toMatchObject({ email: teacherUser.email, subjects: ["physics", "math"], active: true });
  });

  it("lets the teacher open slots: future, within a month, never overlapping", async () => {
    const teacher = appRouter.createCaller(ctxFor(teacherUser));
    await expect(teacher.bacTutor.addSlots({ startsAt: [new Date(Date.now() - HOUR)], durationMin: 45 })).rejects.toMatchObject({ message: "SLOT_IN_PAST" });
    await expect(teacher.bacTutor.addSlots({ startsAt: [at(24 * 40)], durationMin: 45 })).rejects.toMatchObject({ message: "SLOT_TOO_FAR" });
    expect(await teacher.bacTutor.addSlots({ startsAt: [at(48), at(72), at(96), at(120), soon()], durationMin: 45 })).toEqual({ added: 5 });
    await expect(teacher.bacTutor.addSlots({ startsAt: [new Date(at(48).getTime() + 30 * 60_000)], durationMin: 45 })).rejects.toMatchObject({
      message: "SLOT_OVERLAP",
    });
    // A teacher account without a profile manages nothing.
    await expect(appRouter.createCaller(ctxFor(otherTeacher)).bacTutor.addSlots({ startsAt: [at(50)], durationMin: 45 })).rejects.toMatchObject({
      message: "NOT_A_TUTOR",
    });
    const page = await teacher.bacTutor.dashboard();
    expect(page.tutor?.name).toBe("الأستاذ كريم");
    expect(page.slots.filter(slot => slot.status === "open")).toHaveLength(5);
  });

  it("books, confirms with a video room, and never lets two students take one slot", async () => {
    const amine = await subscribedStudent("amine", admin);
    const lina = await subscribedStudent("lina", admin);
    const offer = await amine.caller.bac.tutors();
    const tutor = offer.tutors.find(entry => entry.id === tutorId)!;
    // Only subjects of the student's stream; slots at least 2 h ahead.
    expect(tutor.subjects).toEqual(["physics", "math"]);
    expect(tutor.slots).toHaveLength(4); // the slot 90 minutes ahead is too soon to book
    const slot = tutor.slots[0];

    await expect(amine.caller.bac.bookSession({ slotId: slot.id, subject: "philosophy" })).rejects.toMatchObject({ message: "SUBJECT_NOT_ALLOWED" });
    const booked = await amine.caller.bac.bookSession({ slotId: slot.id, subject: "physics", note: "أريد مراجعة النواة" });
    await expect(lina.caller.bac.bookSession({ slotId: slot.id, subject: "physics" })).rejects.toMatchObject({ code: "CONFLICT", message: "SLOT_TAKEN" });

    // The teacher is told; the room exists only once confirmed.
    const db = await getDb();
    const told = await db!.select().from(notifications).where(eq(notifications.userId, teacherUser.id));
    expect(told.some(row => row.title === "طلب حصة جديد")).toBe(true);
    expect((await amine.caller.bac.myBookings())[0]).toMatchObject({ status: "requested", meetingUrl: null, canCancel: true });

    // Another teacher cannot answer it; this one confirms once.
    await expect(appRouter.createCaller(ctxFor(otherTeacher)).bacTutor.review({ bookingId: booked.id, action: "confirm" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const teacher = appRouter.createCaller(ctxFor(teacherUser));
    await teacher.bacTutor.review({ bookingId: booked.id, action: "confirm", note: "أحضر كراسك" });
    await expect(teacher.bacTutor.review({ bookingId: booked.id, action: "confirm" })).rejects.toMatchObject({ code: "CONFLICT" });
    const mine = (await amine.caller.bac.myBookings())[0];
    expect(mine.status).toBe("confirmed");
    expect(mine.tutorNote).toBe("أحضر كراسك");
    expect(mine.meetingUrl).toMatch(/^https:\/\/meet\.jit\.si\/Tafawoq-\d+-/);
    expect(mine.canJoin).toBe(false); // not yet: 48 h ahead
    const informed = await db!.select().from(notifications).where(eq(notifications.userId, amine.user.id));
    expect(informed.some(row => row.title === "تم تأكيد حصتك" && row.body.includes("أحضر كراسك"))).toBe(true);
    // Not done before it happened.
    await expect(teacher.bacTutor.review({ bookingId: booked.id, action: "done" })).rejects.toMatchObject({ message: "SESSION_NOT_STARTED" });

    // The student cancels in time: the slot is free again, and Lina takes it.
    await amine.caller.bac.cancelBooking({ bookingId: booked.id });
    expect((await amine.caller.bac.myBookings())[0].status).toBe("cancelled");
    const again = await lina.caller.bac.bookSession({ slotId: slot.id, subject: "math" });
    // Declined: the slot opens again.
    await teacher.bacTutor.review({ bookingId: again.id, action: "decline", note: "عندي ظرف طارئ" });
    const [row] = await db!.select().from(tafawoqTutorSlots).where(eq(tafawoqTutorSlots.id, slot.id));
    expect(row.status).toBe("open");
  });

  it("limits a student to three sessions to come, and refuses one without a subscription", async () => {
    const sami = await subscribedStudent("sami", admin);
    const slots = (await sami.caller.bac.tutors()).tutors.find(entry => entry.id === tutorId)!.slots;
    expect(slots.length).toBeGreaterThanOrEqual(4);
    for (const slot of slots.slice(0, 3)) await sami.caller.bac.bookSession({ slotId: slot.id, subject: "physics" });
    await expect(sami.caller.bac.bookSession({ slotId: slots[3].id, subject: "physics" })).rejects.toMatchObject({ message: "TOO_MANY_SESSIONS" });

    const nour = await fixtureUser("nour");
    const caller = appRouter.createCaller(ctxFor(nour));
    await caller.tafawoq.register({ displayName: "nour", age: 17, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "sciences" });
    const offer = await caller.bac.tutors();
    expect(offer.subscriptionActive).toBe(false);
    await expect(caller.bac.bookSession({ slotId: slots[3].id, subject: "physics" })).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });
  });

  it("refuses a cancellation less than 12 hours before, and lets an admin see and answer every booking", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    // A slot 3 h ahead: bookable (≥ 2 h), no longer cancellable by the student (< 12 h).
    await adminCaller.bacAdmin.addTutorSlots({ tutorId, startsAt: [at(6)], durationMin: 30 });
    const late = await subscribedStudent("late", admin);
    const slot = (await late.caller.bac.tutors()).tutors.find(entry => entry.id === tutorId)!.slots.find(entry => entry.startsAt.getTime() === at(6).getTime())!;
    const booking = await late.caller.bac.bookSession({ slotId: slot.id, subject: "math" });
    await expect(late.caller.bac.cancelBooking({ bookingId: booking.id })).rejects.toMatchObject({ message: "CANCEL_TOO_LATE" });
    expect((await adminCaller.bacAdmin.bookings({ status: "requested" })).some(entry => entry.id === booking.id)).toBe(true);
    await adminCaller.bacAdmin.reviewBooking({ bookingId: booking.id, action: "confirm" });
    // Someone else's booking is invisible.
    await expect(appRouter.createCaller(ctxFor(otherTeacher)).bacTutor.review({ bookingId: booking.id, action: "cancel" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
