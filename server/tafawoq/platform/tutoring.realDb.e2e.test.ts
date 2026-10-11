import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";
import { getDb } from "../../db/shared";
import { createEmailUser } from "../../db/usersAuth";
import { emailOpenId, hashPassword } from "../../_core/emailAuth";
import { notifications, tafawoqBookings, tafawoqSubscriptions, tafawoqTutorSlots, users, type User } from "../../../drizzle/schema";

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
  await appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa });
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

  it("caps sessions to come and the month's allowance separately, and gives a session back when declined or cancelled", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await adminCaller.bacAdmin.addTutorSlots({ tutorId, startsAt: [at(144), at(168), at(192)], durationMin: 45 });
    // Sessions to come: at most 3 at once (the monthly allowance set high).
    await adminCaller.bacAdmin.setSettings({ sessionsPerMonth: 10, maxUpcomingSessions: 3 });
    const sami = await subscribedStudent("sami", admin);
    const slots = (await sami.caller.bac.tutors()).tutors.find(entry => entry.id === tutorId)!.slots;
    expect(slots.length).toBeGreaterThanOrEqual(5);
    const booked = [];
    for (const slot of slots.slice(0, 3)) booked.push(await sami.caller.bac.bookSession({ slotId: slot.id, subject: "physics" }));
    await expect(sami.caller.bac.bookSession({ slotId: slots[3].id, subject: "physics" })).rejects.toMatchObject({ message: "TOO_MANY_SESSIONS" });

    // The month's allowance: 3 used of 3, whatever the cap on sessions to come.
    await adminCaller.bacAdmin.setSettings({ sessionsPerMonth: 3, maxUpcomingSessions: 10 });
    expect((await sami.caller.bac.tutors()).allowance).toMatchObject({ used: 3, remaining: 0 });
    await expect(sami.caller.bac.bookSession({ slotId: slots[3].id, subject: "physics" })).rejects.toMatchObject({ message: "MONTHLY_SESSIONS_USED" });
    // Declined by the teacher: the session comes back, and the slot reopens.
    await appRouter.createCaller(ctxFor(teacherUser)).bacTutor.review({ bookingId: booked[0].id, action: "decline" });
    expect((await sami.caller.bac.tutors()).allowance).toMatchObject({ used: 2, remaining: 1 });
    const fourth = await sami.caller.bac.bookSession({ slotId: slots[3].id, subject: "physics" });
    // Cancelled in time by the student: given back too.
    await sami.caller.bac.cancelBooking({ bookingId: fourth.id });
    expect((await sami.caller.bac.tutors()).allowance).toMatchObject({ used: 2, remaining: 1 });
    // Allowance 0: sessions are not included at all.
    await adminCaller.bacAdmin.setSettings({ sessionsPerMonth: 0 });
    await expect(sami.caller.bac.bookSession({ slotId: slots[4].id, subject: "physics" })).rejects.toMatchObject({ message: "SESSIONS_NOT_INCLUDED" });
    // Back to the trial values; release Sami's sessions for the next tests.
    await adminCaller.bacAdmin.setSettings({ sessionsPerMonth: 2, maxUpcomingSessions: 3 });
    for (const { id } of booked.slice(1)) await sami.caller.bac.cancelBooking({ bookingId: id });

    const nour = await fixtureUser("nour");
    const caller = appRouter.createCaller(ctxFor(nour));
    await caller.tafawoq.register({ displayName: "nour", age: 17, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "sciences" });
    const offer = await caller.bac.tutors();
    expect(offer.subscriptionActive).toBe(false);
    expect(offer.allowance).toBeNull();
    await expect(caller.bac.bookSession({ slotId: slots[3].id, subject: "physics" })).rejects.toMatchObject({ message: "SUBSCRIPTION_REQUIRED" });
  });

  it("books atomically: two students at the same instant get one slot, a double click never passes the limits, no slot is left without its booking", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await adminCaller.bacAdmin.addTutorSlots({ tutorId, startsAt: [at(216), at(240), at(264)], durationMin: 45 });
    const [ali, sara, dina] = await Promise.all([subscribedStudent("ali", admin), subscribedStudent("sara", admin), subscribedStudent("dina", admin)]);
    const slotsFor = async () => (await ali.caller.bac.tutors()).tutors.find(entry => entry.id === tutorId)!.slots;
    const target = (await slotsFor()).find(slot => slot.startsAt.getTime() === at(216).getTime())!;
    const race = await Promise.allSettled([
      ali.caller.bac.bookSession({ slotId: target.id, subject: "physics" }),
      sara.caller.bac.bookSession({ slotId: target.id, subject: "physics" }),
    ]);
    expect(race.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(race.find(result => result.status === "rejected")).toMatchObject({ reason: { message: "SLOT_TAKEN" } });
    const db = await getDb();
    const onSlot = await db!.select().from(tafawoqBookings).where(eq(tafawoqBookings.slotId, target.id));
    expect(onSlot).toHaveLength(1);

    // Dina's double click on two slots with one session left this month (a
    // student who took no part in the race above).
    await adminCaller.bacAdmin.setSettings({ sessionsPerMonth: 1, maxUpcomingSessions: 10 });
    const others = (await slotsFor()).filter(slot => [at(240), at(264)].some(time => time.getTime() === slot.startsAt.getTime()));
    const clicks = await Promise.allSettled(others.map(slot => dina.caller.bac.bookSession({ slotId: slot.id, subject: "math" })));
    await adminCaller.bacAdmin.setSettings({ sessionsPerMonth: 2, maxUpcomingSessions: 3 });
    expect(clicks.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(clicks.find(result => result.status === "rejected")).toMatchObject({ reason: { message: "MONTHLY_SESSIONS_USED" } });
    // The refused click left its slot open: no "booked" slot without a live booking.
    const booked = await db!.select().from(tafawoqTutorSlots).where(and(eq(tafawoqTutorSlots.tutorId, tutorId), eq(tafawoqTutorSlots.status, "booked")));
    for (const slot of booked) {
      const live = await db!
        .select()
        .from(tafawoqBookings)
        .where(and(eq(tafawoqBookings.slotId, slot.id), inArray(tafawoqBookings.status, ["requested", "confirmed", "done"])));
      expect(live, `slot ${slot.id}`).toHaveLength(1);
    }
  });

  it("confirms a manual payment once, records what arrived, and never keeps two pending requests", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const user = await fixtureUser("payer");
    const caller = appRouter.createCaller(ctxFor(user));
    await caller.tafawoq.register({ displayName: "payer", age: 17, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "sciences" });
    // Double click on "request": one pending request only.
    const requests = await Promise.allSettled([
      caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp", paymentReference: "CCP-123" }),
      caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp", paymentReference: "CCP-123" }),
    ]);
    expect(requests.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(requests.find(result => result.status === "rejected")).toMatchObject({ reason: { message: "PENDING_EXISTS" } });
    const request = (requests.find(result => result.status === "fulfilled") as PromiseFulfilledResult<{ id: number; amountDa: number }>).value;
    // A different amount needs a written reason.
    await expect(adminCaller.bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa - 500 })).rejects.toMatchObject({
      message: "AMOUNT_MISMATCH_NOTE",
    });
    // Two admins (or a double click) confirming at once: activated once.
    const confirmations = await Promise.allSettled([
      adminCaller.bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa, paidReference: "RX-1" }),
      adminCaller.bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa, paidReference: "RX-1" }),
    ]);
    expect(confirmations.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(confirmations.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    const db = await getDb();
    const rows = await db!.select().from(tafawoqSubscriptions).where(eq(tafawoqSubscriptions.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "active", paidAmountDa: request.amountDa, paidReference: "RX-1", paymentReference: "CCP-123" });
    const log = await adminCaller.admin.auditLog({ limit: 100, action: "bac.subscription_confirmed" });
    const entry = log.find(row => row.targetId === String(request.id));
    expect(JSON.parse(entry!.detailsJson!)).toMatchObject({ expectedDa: request.amountDa, receivedDa: request.amountDa, receivedReference: "RX-1" });
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

  it("lets an admin grant the teacher role and reset a password, each recorded in the admin log", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const newcomer = await fixtureUser("future-teacher");
    // A non-admin can't, whatever the role asked for.
    await expect(
      appRouter.createCaller(ctxFor(teacherUser)).admin.updateUserRole({ userId: newcomer.id, role: "teacher" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await adminCaller.admin.updateUserRole({ userId: newcomer.id, role: "teacher" })).toBe(true);
    const db = await getDb();
    const [row] = await db!.select().from(users).where(eq(users.id, newcomer.id));
    expect(row.role).toBe("teacher");

    // Password reset: the old password stops working, the new one signs in.
    await adminCaller.admin.resetPassword({ userId: newcomer.id, newPassword: "a-new-password-2026" });
    const visitor = appRouter.createCaller(ctxFor(null));
    await expect(visitor.auth.loginWithEmail({ email: newcomer.email!, password: "a-long-test-password" })).rejects.toThrow();
    await expect(visitor.auth.loginWithEmail({ email: newcomer.email!, password: "a-new-password-2026" })).resolves.toBeTruthy();

    const log = await adminCaller.admin.auditLog({ limit: 50 });
    const mine = log.filter(entry => entry.targetId === String(newcomer.id)).map(entry => entry.action);
    expect(mine).toEqual(expect.arrayContaining(["update_user_role", "reset_password"]));
  });
});
