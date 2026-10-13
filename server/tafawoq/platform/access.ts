// Tafawoq BAC platform — the server-side gate in front of every lesson.
//
// Loads what the decision needs (the student's locked stream and second
// subject, their subscription, the admin's content switches) and asks
// ./catalog.ts for it. A refusal is a FORBIDDEN error whose message is one
// of ACCESS_ERRORS (translated by the client), and is recorded in the
// event log as "access_denied" — the interface hiding a link is never the
// only protection.
import { TRPCError } from "@trpc/server";
import { ACCESS_ERRORS } from "@shared/bacPlatform";
import * as bac from "../../db/bacPlatform";
import * as store from "../../db/tafawoq";
import { checkLessonAccess, checkSubjectAccess, type ContentSwitches } from "./catalog";

let cachedSwitches: { at: number; value: ContentSwitches } | null = null;
const SWITCHES_TTL_MS = 15_000;

/** The admin's content switches (cached briefly; cleared on every change). */
export async function contentSwitches(): Promise<ContentSwitches> {
  if (cachedSwitches && Date.now() - cachedSwitches.at < SWITCHES_TTL_MS) return cachedSwitches.value;
  const rows = await bac.getContentSettings();
  const value: ContentSwitches = { disabledSubjects: new Set(), disabledLessons: new Set() };
  for (const row of rows) {
    if (row.enabled) continue;
    if (row.contentKey.startsWith("subject:")) value.disabledSubjects.add(row.contentKey.slice(8));
    if (row.contentKey.startsWith("lesson:")) value.disabledLessons.add(row.contentKey.slice(7));
  }
  cachedSwitches = { at: Date.now(), value };
  return value;
}

export function clearContentSwitchesCache() {
  cachedSwitches = null;
}

/** Whether the user's subscription covers now (admins always pass). */
export async function hasActiveSubscription(userId: number) {
  const user = await bac.getUserBasic(userId);
  if (user?.role === "admin") return true;
  return Boolean(await bac.getCurrentSubscription(userId));
}

async function deny(userId: number, reason: string, details: Record<string, unknown>): Promise<never> {
  await bac.logEvent(userId, "access_denied", { reason, ...details });
  throw new TRPCError({ code: "FORBIDDEN", message: reason });
}

/**
 * Throws unless this user may open the lesson. Placement tests pass
 * without a subscription (they decide what to subscribe to); everything
 * else needs one.
 */
export async function requireLessonAccess(
  userId: number,
  lessonKey: string,
  options: { requireSubscription: boolean }
) {
  const student = await store.getTafawoqStudentByUser(userId);
  if (!student) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Register your profile first" });
  }
  const [switches, subscriptionActive] = await Promise.all([
    contentSwitches(),
    options.requireSubscription ? hasActiveSubscription(userId) : Promise.resolve(true),
  ]);
  const decision = checkLessonAccess(student, lessonKey, switches, {
    subscriptionActive,
    requireSubscription: options.requireSubscription,
  });
  if (!decision.ok) await deny(userId, decision.reason, { lessonKey, stream: student.stream });
  return student;
}

/** Throws unless this user may sit a paper in this subject. */
export async function requireSubjectAccess(userId: number, subject: string) {
  const student = await store.getTafawoqStudentByUser(userId);
  if (!student) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Register your profile first" });
  }
  const [switches, subscriptionActive] = await Promise.all([contentSwitches(), hasActiveSubscription(userId)]);
  const decision = checkSubjectAccess(student, subject, switches, { subscriptionActive, requireSubscription: true });
  if (!decision.ok) await deny(userId, decision.reason, { subject, stream: student.stream });
  return student;
}

/** Throws unless the user has an active subscription (no lesson involved). */
export async function requireSubscription(userId: number) {
  if (!(await hasActiveSubscription(userId))) {
    await deny(userId, ACCESS_ERRORS.subscriptionRequired, {});
  }
}
