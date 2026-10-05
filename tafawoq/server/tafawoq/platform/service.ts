// Tafawoq BAC platform — orchestration for the student, parent and admin
// sides: stream and second subject (locked server-side), the subscription
// (activated only by an admin confirming the payment), placement test,
// dashboard, daily plan, weekly test, mock BAC drafts, topic bank, quick
// revision, teacher quick requests, motivation, parent follow-up and the
// admin panel. Rules are pure functions in ./catalog.ts, ./plan.ts,
// ./papers.ts, ./diagnosis.ts and ./teacher.ts.
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import {
  ACCESS_ERRORS,
  BAC_SUBJECTS,
  EXPIRY_WARNING_DAYS,
  PLAN_DETAILS,
  PLATFORM_STREAMS,
  SECOND_SUBJECT_OPTIONS,
  STREAM_CORE_SUBJECTS,
  SUBSCRIPTION_PLANS,
  isPlatformStream,
  planSavingDa,
  type BacSubject,
  type ErrorType,
  type PaymentMethod,
  type PlatformStream,
  type SubscriptionPlan,
  type TeacherAction,
} from "@shared/bacPlatform";
import type { PublicQuestion } from "@shared/tafawoq";
import * as bac from "../../db/bacPlatform";
import * as store from "../../db/tafawoq";
import { getPlatformSetting, setPlatformSetting } from "../../db/platformSettings";
import { logAdminAction } from "../../db/adminAudit";
import { createParentInvite } from "../../db/parent";
import { getLesson, lessonForStream, type BankQuestion, type Lesson } from "../curriculum";
import { createRng, randomSeed } from "../generators/core";
import { instantiate } from "../generators/instantiate";
import { examMention, nextBacDate, paperLessons } from "../bac";
import { overallMastery, skillName, targetDifficulty, MASTERED, STRENGTH } from "../studentModel";
import type { TeacherStyle } from "../darja";
import * as tafawoq from "../service";
import {
  accessibleLessons,
  allowedSubjects,
  lessonSubject,
  secondSubjectChoices,
  streamLessons,
  subjectLessons,
  subscriptionContent,
} from "./catalog";
import { clearContentSwitchesCache, contentSwitches, hasActiveSubscription, requireLessonAccess, requireSubscription } from "./access";
import { placementLevel, weightedScore } from "./diagnosis";
import {
  buildDailyPlan,
  computeBadges,
  computePoints,
  dayKey,
  isTaskDone,
  planProgress,
  studyStreak,
  weekKey,
  weekStart,
  type DailyPlan,
  type PlanLesson,
  type PlanMistake,
} from "./plan";
import {
  drawGeneratedTopic,
  generatedTopics,
  placementPaper,
  pointsByDifficulty,
  skillItems,
  weeklyItemsForLesson,
} from "./papers";
import { pickSkill, teacherMessage, teacherMessageText } from "./teacher";

const DAY_MS = 86_400_000;

type Student = NonNullable<Awaited<ReturnType<typeof store.getTafawoqStudentByUser>>>;
type SubmittedAnswer = tafawoq.SubmittedAnswer;
type ItemResult = Awaited<ReturnType<typeof tafawoq.submitAssessment>>["items"][number];

function forbidden(message: string): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

async function lockedStudent(userId: number): Promise<Student & { stream: PlatformStream }> {
  const student = await tafawoq.studentOrThrow(userId);
  if (!student.streamLockedAt || !isPlatformStream(student.stream)) forbidden(ACCESS_ERRORS.streamRequired);
  return student as Student & { stream: PlatformStream };
}

async function settingFlag(key: string, fallback: boolean) {
  const value = await getPlatformSetting(key);
  return value === null ? fallback : value === "1";
}

async function settingNumber(key: string, fallback: number) {
  const value = Number(await getPlatformSetting(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

// ---------------------------------------------------------------------------
// Subscription state
// ---------------------------------------------------------------------------

async function subscriptionSummary(userId: number) {
  const [current, pending, latestEnd] = await Promise.all([
    bac.getCurrentSubscription(userId),
    bac.getPendingSubscription(userId),
    bac.getLatestActiveEnd(userId),
  ]);
  const now = Date.now();
  const endsAt = latestEnd && latestEnd.getTime() > now ? latestEnd : current?.endsAt ?? null;
  const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now) / DAY_MS)) : null;
  const everActive = current !== undefined || latestEnd !== null;
  return {
    active: Boolean(current),
    status: current ? ("active" as const) : pending ? ("pending_payment" as const) : everActive ? ("expired" as const) : ("none" as const),
    plan: current?.plan ?? null,
    startsAt: current?.startsAt ?? null,
    endsAt,
    daysLeft,
    expiringSoon: Boolean(current) && daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS,
    pending: pending
      ? { id: pending.id, plan: pending.plan, amountDa: pending.amountDa, createdAt: pending.createdAt, paymentMethod: pending.paymentMethod }
      : null,
  };
}

/** Start of the current subscription cycle (for "one change per cycle"). */
async function cycleStart(student: Student) {
  const current = await bac.getCurrentSubscription(student.userId);
  return current?.startsAt ?? student.streamLockedAt ?? student.createdAt;
}

// ---------------------------------------------------------------------------
// Onboarding: stream (locked), second subject, placement
// ---------------------------------------------------------------------------

export async function state(userId: number) {
  const student = await store.getTafawoqStudentByUser(userId);
  const switches = await contentSwitches();
  if (!student) return { step: "profile" as const, student: null };
  const locked = Boolean(student.streamLockedAt) && isPlatformStream(student.stream);
  const base = {
    student: {
      displayName: student.displayName,
      age: student.age,
      goals: student.goals,
      stream: locked ? (student.stream as PlatformStream) : null,
      secondSubject: student.secondSubject as BacSubject | null,
      placementDone: Boolean(student.placementDoneAt),
      shareChatsWithParent: student.shareChatsWithParent === 1,
    },
  };
  if (!locked) return { step: "stream" as const, ...base };
  const stream = student.stream as PlatformStream;
  const choices = secondSubjectChoices(stream, switches);
  const [subscription, pendingRequest, changeAllowed, ownChanges] = await Promise.all([
    subscriptionSummary(userId),
    bac.getPendingStreamRequest(student.id),
    settingFlag("bac.secondSubjectChange", true),
    bac.countOwnSecondSubjectChanges(student.id, await cycleStart(student)),
  ]);
  const content = subscriptionContent(stream, student.secondSubject as BacSubject | null, switches);
  const accessible = accessibleLessons(stream, student.secondSubject, switches);
  const needsSecond = !student.secondSubject && choices.some(choice => choice.available);
  const step = needsSecond
    ? ("second" as const)
    : !student.placementDoneAt && accessible.length
      ? ("placement" as const)
      : ("ready" as const);
  return {
    step,
    ...base,
    content,
    secondChoices: choices,
    secondSubjectChange: { allowed: changeAllowed, used: ownChanges, remaining: changeAllowed ? Math.max(0, 1 - ownChanges) : 0 },
    subscription,
    pendingStreamRequest: pendingRequest
      ? { id: pendingRequest.id, toStream: pendingRequest.toStream, createdAt: pendingRequest.createdAt }
      : null,
    lessons: accessible.map(lesson => ({ key: lesson.key, title: lesson.title, subject: lessonSubject(lesson)! })),
  };
}

/** Streams and what each really contains (shown before choosing). */
export async function streamsCatalog() {
  const switches = await contentSwitches();
  return PLATFORM_STREAMS.map(stream => ({
    key: stream,
    content: subscriptionContent(stream, null, switches),
    secondChoices: secondSubjectChoices(stream, switches),
  }));
}

export async function chooseStream(userId: number, stream: PlatformStream) {
  const student = await tafawoq.studentOrThrow(userId);
  if (student.streamLockedAt && isPlatformStream(student.stream)) {
    await bac.logEvent(userId, "stream_change_blocked", { current: student.stream, requested: stream });
    forbidden("STREAM_ALREADY_LOCKED");
  }
  if (!(await bac.lockStream(student.id, stream))) {
    await bac.logEvent(userId, "stream_change_blocked", { requested: stream });
    forbidden("STREAM_ALREADY_LOCKED");
  }
  await bac.logEvent(userId, "stream_chosen", { stream, previous: student.stream });
  return { stream };
}

export async function chooseSecondSubject(userId: number, subject: BacSubject) {
  const student = await lockedStudent(userId);
  const switches = await contentSwitches();
  if (!SECOND_SUBJECT_OPTIONS[student.stream].includes(subject)) forbidden(ACCESS_ERRORS.subjectNotAllowed);
  if (!subjectLessons(student.stream, subject, switches).length) forbidden(ACCESS_ERRORS.subjectUnavailable);
  const previous = student.secondSubject;
  if (previous === subject) return { secondSubject: subject, changed: false };
  if (previous) {
    if (!(await settingFlag("bac.secondSubjectChange", true))) forbidden("SECOND_SUBJECT_CHANGE_DISABLED");
    const used = await bac.countOwnSecondSubjectChanges(student.id, await cycleStart(student));
    if (used >= 1) {
      await bac.logEvent(userId, "second_subject_change_blocked", { from: previous, to: subject });
      forbidden("SECOND_SUBJECT_CHANGE_LIMIT");
    }
  }
  await bac.setSecondSubject(student.id, subject);
  await bac.recordSecondSubjectChange({ studentId: student.id, fromSubject: previous, toSubject: subject, changedBy: userId, byAdmin: false });
  await bac.logEvent(userId, previous ? "second_subject_changed" : "second_subject_chosen", { from: previous, to: subject });
  return { secondSubject: subject, changed: Boolean(previous) };
}

export async function requestStreamChange(userId: number, toStream: PlatformStream, reason: string) {
  const student = await lockedStudent(userId);
  if (student.stream === toStream) throw new TRPCError({ code: "BAD_REQUEST", message: "SAME_STREAM" });
  if (await bac.getPendingStreamRequest(student.id)) throw new TRPCError({ code: "CONFLICT", message: "REQUEST_PENDING" });
  const id = await bac.createStreamRequest({ studentId: student.id, userId, fromStream: student.stream, toStream, reason: reason.trim() });
  await bac.logEvent(userId, "stream_change_requested", { requestId: id, from: student.stream, to: toStream });
  return { id };
}

export async function myStreamRequests(userId: number) {
  const student = await tafawoq.studentOrThrow(userId);
  return bac.listStudentStreamRequests(student.id);
}

export async function setShareChats(userId: number, share: boolean) {
  const student = await tafawoq.studentOrThrow(userId);
  await bac.setShareChats(student.id, share);
  await bac.logEvent(userId, share ? "parent_chat_consent_given" : "parent_chat_consent_withdrawn");
  return { share };
}

// ---------------------------------------------------------------------------
// Subscription (manual payment confirmation — nothing is ever simulated)
// ---------------------------------------------------------------------------

export async function subscriptionPage(userId: number) {
  const student = await store.getTafawoqStudentByUser(userId);
  const switches = await contentSwitches();
  const stream = student?.streamLockedAt && isPlatformStream(student.stream) ? (student.stream as PlatformStream) : null;
  const [summary, history, instructions, referral] = await Promise.all([
    subscriptionSummary(userId),
    bac.listUserSubscriptions(userId),
    getPlatformSetting("bac.paymentInstructions"),
    myReferral(userId),
  ]);
  return {
    plans: SUBSCRIPTION_PLANS.map(plan => ({ key: plan, ...PLAN_DETAILS[plan], savingDa: planSavingDa(plan) })),
    stream,
    content: stream ? subscriptionContent(stream, student!.secondSubject as BacSubject | null, switches) : null,
    summary,
    history: history.map(row => ({
      id: row.id,
      plan: row.plan,
      months: row.months,
      amountDa: row.amountDa,
      priceDa: row.priceDa,
      status: row.status,
      paymentMethod: row.paymentMethod,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      bonusDays: row.bonusDays,
      createdAt: row.createdAt,
      reviewNote: row.reviewNote,
    })),
    paymentInstructions: instructions?.trim() || null,
    // No online gateway is wired for subscriptions: an admin confirms each payment.
    gateway: "manual" as const,
    referral,
  };
}

function couponDiscount(coupon: { discountType: "percent" | "fixed"; discountValue: number }, price: number) {
  const discount =
    coupon.discountType === "percent"
      ? Math.round((price * Math.min(100, Math.max(0, coupon.discountValue))) / 100)
      : Math.round(coupon.discountValue / 100); // fixed: stored in cents
  return Math.min(price, Math.max(0, discount));
}

async function validCoupon(userId: number, code: string) {
  const coupon = await bac.getCouponByCode(code);
  const now = Date.now();
  if (
    !coupon ||
    !coupon.isActive ||
    coupon.validFrom.getTime() > now ||
    (coupon.validUntil && coupon.validUntil.getTime() < now) ||
    (coupon.maxRedemptions !== null && coupon.timesRedeemed >= coupon.maxRedemptions)
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "COUPON_INVALID" });
  }
  if (await bac.hasRedeemedCoupon(coupon.id, userId)) throw new TRPCError({ code: "BAD_REQUEST", message: "COUPON_USED" });
  return coupon;
}

export async function quoteSubscription(userId: number, plan: SubscriptionPlan, couponCode?: string | null) {
  const { priceDa } = PLAN_DETAILS[plan];
  if (!couponCode?.trim()) return { priceDa, amountDa: priceDa, discountDa: 0 };
  const coupon = await validCoupon(userId, couponCode);
  const discountDa = couponDiscount(coupon, priceDa);
  return { priceDa, amountDa: priceDa - discountDa, discountDa };
}

export async function requestSubscription(
  userId: number,
  input: {
    plan: SubscriptionPlan;
    paymentMethod: PaymentMethod;
    paymentReference?: string | null;
    couponCode?: string | null;
    referralCode?: string | null;
  }
) {
  await lockedStudent(userId);
  if (await bac.getPendingSubscription(userId)) throw new TRPCError({ code: "CONFLICT", message: "PENDING_EXISTS" });
  const { months, priceDa } = PLAN_DETAILS[input.plan];
  const coupon = input.couponCode?.trim() ? await validCoupon(userId, input.couponCode) : null;
  const amountDa = coupon ? priceDa - couponDiscount(coupon, priceDa) : priceDa;

  let referralCodeId: number | null = null;
  if (input.referralCode?.trim()) {
    const referral = await bac.getReferralCodeByCode(input.referralCode);
    if (!referral || referral.userId === userId) throw new TRPCError({ code: "BAD_REQUEST", message: "REFERRAL_INVALID" });
    const existing = await bac.getReferralRedemption(userId);
    const everSubscribed = (await bac.listUserSubscriptions(userId)).some(row => row.status === "active" || row.status === "canceled");
    if (existing || everSubscribed) throw new TRPCError({ code: "BAD_REQUEST", message: "REFERRAL_NOT_NEW" });
    if (!(await bac.createReferralRedemption(referral.id, userId))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "REFERRAL_NOT_NEW" });
    }
    referralCodeId = referral.id;
  }

  const id = await bac.createSubscription({
    userId,
    plan: input.plan,
    months,
    priceDa,
    amountDa,
    couponId: coupon?.id ?? null,
    referralCodeId,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference?.trim() || null,
  });
  await bac.logEvent(userId, "subscription_requested", { subscriptionId: id, plan: input.plan, amountDa, coupon: coupon?.code ?? null });
  return { id, amountDa, status: "pending_payment" as const };
}

export async function cancelPendingSubscription(userId: number, subscriptionId: number) {
  const row = await bac.getSubscription(subscriptionId);
  if (!row || row.userId !== userId) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
  if (!(await bac.closeSubscription(row.id, "canceled", null, "canceled by student", ["pending_payment"]))) {
    throw new TRPCError({ code: "CONFLICT", message: "NOT_PENDING" });
  }
  await bac.logEvent(userId, "subscription_canceled", { subscriptionId: row.id });
  return { ok: true };
}

export async function myReferral(userId: number) {
  const code = await bac.getOrCreateReferralCode(userId, () => `TFQ${nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "7")}`);
  if (!code) return null;
  const [stats, bonusDays] = await Promise.all([bac.countReferrals(code.id), settingNumber("bac.referralBonusDays", 7)]);
  return { code: code.code, invited: stats.total, rewarded: stats.rewarded, bonusDays };
}

// ---------------------------------------------------------------------------
// Placement test across the student's subjects
// ---------------------------------------------------------------------------

type Paper = Array<{ assessmentId: number; lessonKey: string; points?: number; questionIds?: string[] }>;

const SEP = "~";
function paperQuestion(assessmentId: number, question: PublicQuestion): PublicQuestion {
  return { ...question, id: `${assessmentId}${SEP}${question.id}` };
}

function splitAnswers(answers: SubmittedAnswer[]) {
  const byAssessment = new Map<number, SubmittedAnswer[]>();
  for (const answer of answers) {
    const index = answer.questionId.indexOf(SEP);
    if (index === -1) continue;
    const assessmentId = Number(answer.questionId.slice(0, index));
    if (!Number.isInteger(assessmentId)) continue;
    const list = byAssessment.get(assessmentId) ?? [];
    list.push({ ...answer, questionId: answer.questionId.slice(index + 1) });
    byAssessment.set(assessmentId, list);
  }
  return byAssessment;
}

async function paperQuestions(paper: Paper) {
  const questions: PublicQuestion[] = [];
  for (const entry of paper) {
    const assessment = await store.getAssessment(entry.assessmentId);
    if (!assessment) continue;
    const items = JSON.parse(assessment.itemsJson) as BankQuestion[];
    questions.push(...items.map(item => paperQuestion(entry.assessmentId, tafawoq.toPublicQuestion(item))));
  }
  // Easy → medium → hard across the whole paper.
  return questions.sort((a, b) => a.difficulty - b.difficulty);
}

export async function startPlacementTest(userId: number) {
  const student = await lockedStudent(userId);
  const open = await bac.getOpenPaper(student.id, "placement");
  if (open) {
    const paper = JSON.parse(open.paperJson) as Paper;
    return { examId: open.id, questions: await paperQuestions(paper), subjects: subjectsOfPaper(paper) };
  }
  const lessons = accessibleLessons(student.stream, student.secondSubject, await contentSwitches());
  if (!lessons.length) throw new TRPCError({ code: "NOT_FOUND", message: "NO_CONTENT_YET" });
  const parts = placementPaper(lessons, randomSeed(), 20);
  const paper: Paper = [];
  for (const part of parts) {
    if (!part.items.length) continue;
    const assessmentId = await store.createAssessment({
      studentId: student.id,
      lessonKey: part.lesson.key,
      kind: "placement",
      itemsJson: JSON.stringify(part.items),
      source: "bank",
    });
    paper.push({ assessmentId, lessonKey: part.lesson.key });
  }
  const examId = await store.createExam({ studentId: student.id, stream: student.stream, paperJson: JSON.stringify(paper), kind: "placement" });
  await bac.logEvent(userId, "placement_started", { examId });
  return { examId, questions: await paperQuestions(paper), subjects: subjectsOfPaper(paper) };
}

function subjectsOfPaper(paper: Paper) {
  return Array.from(new Set(paper.map(entry => getLesson(entry.lessonKey)).filter(Boolean).map(lesson => lessonSubject(lesson!)!)));
}

/** Grades each assessment of a paper; one already graded elsewhere is read back. */
async function gradePaper(userId: number, paper: Paper, answers: SubmittedAnswer[]) {
  const byAssessment = splitAnswers(answers);
  const graded: Array<{ entry: Paper[number]; items: ItemResult[]; difficulties: number[]; masteryAfter: number }> = [];
  for (const entry of paper) {
    const assessment = await store.getAssessment(entry.assessmentId);
    if (!assessment) continue;
    const stored = JSON.parse(assessment.itemsJson) as BankQuestion[];
    let items: ItemResult[];
    let masteryAfter: number;
    if (assessment.status === "open") {
      const result = await tafawoq.submitAssessment(userId, entry.assessmentId, byAssessment.get(entry.assessmentId) ?? []);
      items = result.items;
      masteryAfter = result.masteryAfter;
    } else {
      items = assessment.resultJson ? (JSON.parse(assessment.resultJson) as ItemResult[]) : [];
      masteryAfter = assessment.masteryAfter ?? 0;
    }
    graded.push({ entry, items, difficulties: stored.map(item => item.difficulty), masteryAfter });
  }
  return graded;
}

function skillSummary(graded: Awaited<ReturnType<typeof gradePaper>>) {
  const mastered: Array<{ lessonKey: string; lessonTitle: string; skill: string; name: string }> = [];
  const review: typeof mastered = [];
  for (const { entry, items } of graded) {
    const lesson = getLesson(entry.lessonKey);
    for (const item of items) {
      const target = item.correct ? mastered : review;
      if (!target.some(existing => existing.lessonKey === entry.lessonKey && existing.skill === item.skill)) {
        target.push({ lessonKey: entry.lessonKey, lessonTitle: lesson?.title ?? entry.lessonKey, skill: item.skill, name: item.skillName });
      }
    }
  }
  // A skill missed once is to review, even if another question on it was right.
  return { mastered: mastered.filter(entry => !review.some(other => other.lessonKey === entry.lessonKey && other.skill === entry.skill)), review };
}

export async function submitPlacementTest(userId: number, examId: number, answers: SubmittedAnswer[]) {
  const student = await lockedStudent(userId);
  const exam = await store.getExam(examId);
  if (!exam || exam.studentId !== student.id || exam.kind !== "placement") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Test not found" });
  }
  if (!(await store.claimExam(exam.id))) throw new TRPCError({ code: "CONFLICT", message: "Test already marked" });
  const paper = JSON.parse(exam.paperJson) as Paper;
  const graded = await gradePaper(userId, paper, answers);

  const bySubject = new Map<string, Array<{ difficulty: number; correct: boolean }>>();
  for (const { entry, items, difficulties } of graded) {
    const lesson = getLesson(entry.lessonKey);
    const subject = lesson ? lessonSubject(lesson)! : "math";
    const list = bySubject.get(subject) ?? [];
    items.forEach((item, index) => list.push({ difficulty: difficulties[index] ?? 1, correct: item.correct }));
    bySubject.set(subject, list);
  }
  const subjects = Array.from(bySubject.entries()).map(([subject, items]) => {
    const score = weightedScore(items);
    return {
      subject,
      score: Math.round(score * 100),
      level: placementLevel(score),
      correct: items.filter(item => item.correct).length,
      total: items.length,
    };
  });
  const { mastered, review } = skillSummary(graded);
  const points = new Map(paperLessons(student.stream).map(entry => [entry.lesson.key, entry.points]));
  const priorities = graded
    .map(({ entry, masteryAfter }) => ({
      lessonKey: entry.lessonKey,
      lessonTitle: getLesson(entry.lessonKey)?.title ?? entry.lessonKey,
      mastery: masteryAfter,
      weight: (points.get(entry.lessonKey) ?? 1) * (1 - masteryAfter),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(({ weight: _weight, ...rest }) => rest);
  const total = graded.reduce((sum, part) => sum + part.items.length, 0);
  const correct = graded.reduce((sum, part) => sum + part.items.filter(item => item.correct).length, 0);
  const result = {
    subjects,
    mastered,
    review,
    priorities,
    correct,
    total,
    items: graded.flatMap(part => part.items),
  };
  await store.saveExamResult(exam.id, total ? Math.round((correct / total) * 20 * 4) / 4 : 0, JSON.stringify(result));
  await bac.markPlacementDone(student.id);
  await bac.logEvent(userId, "placement_completed", { examId, correct, total });
  return result;
}

export async function placementResult(userId: number) {
  const student = await tafawoq.studentOrThrow(userId);
  const [latest] = await store.listMarkedExams(student.id, 1, "placement");
  if (!latest?.resultJson) return null;
  const result = JSON.parse(latest.resultJson) as Awaited<ReturnType<typeof submitPlacementTest>>;
  return { ...result, date: latest.gradedAt ?? latest.createdAt };
}

// ---------------------------------------------------------------------------
// Standings shared by the dashboard, the plan and the weekly test
// ---------------------------------------------------------------------------

async function standings(student: Student & { stream: PlatformStream }) {
  const switches = await contentSwitches();
  const lessons = accessibleLessons(student.stream, student.secondSubject, switches);
  const allStates = await store.getAllSkillStates(student.id);
  const points = new Map(paperLessons(student.stream).map(entry => [entry.lesson.key, entry.points]));
  return lessons.map(lesson => {
    const states = allStates
      .filter(row => row.lessonKey === lesson.key && lesson.skills.some(skill => skill.key === row.skillKey))
      .map(row => ({ skill: row.skillKey, pKnown: row.pKnown, attempts: row.attempts, correct: row.correct }));
    const mastery = states.length ? overallMastery(states) : null;
    const known = new Map(states.map(state => [state.skill, state.pKnown]));
    const weakSkills = [...lesson.skills]
      .filter(skill => (known.get(skill.key) ?? 0) < MASTERED)
      .sort((a, b) => (known.get(a.key) ?? 0.3) - (known.get(b.key) ?? 0.3));
    return {
      lesson,
      subject: lessonSubject(lesson)!,
      states,
      mastery,
      points: points.get(lesson.key) ?? 1,
      weakSkills,
    };
  });
}

function subjectProgress(entries: Awaited<ReturnType<typeof standings>>) {
  const bySubject = new Map<string, number[]>();
  for (const entry of entries) {
    const list = bySubject.get(entry.subject) ?? [];
    list.push(entry.mastery ?? 0);
    bySubject.set(entry.subject, list);
  }
  return Array.from(bySubject.entries()).map(([subject, values]) => ({
    subject,
    progress: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
    lessons: values.length,
  }));
}

async function recentMistakes(student: Student, limit = 12): Promise<PlanMistake[]> {
  const rows = await bac.recentGradedResults(student.id, 15);
  const mistakes: PlanMistake[] = [];
  for (const row of rows) {
    if (!row.resultJson) continue;
    const lesson = getLesson(row.lessonKey);
    if (!lesson) continue;
    for (const item of JSON.parse(row.resultJson) as Array<Partial<ItemResult>>) {
      if (item.correct || !item.skill) continue;
      mistakes.push({
        lessonKey: row.lessonKey,
        lessonTitle: lesson.title,
        skillKey: item.skill,
        skillName: item.skillName ?? skillName(lesson, item.skill),
        prompt: item.prompt ?? "",
        given: item.given ?? "",
        correctAnswer: item.correctAnswer ?? "",
        explanation: item.explanation ?? "",
        misconception: item.misconception ?? null,
        errorType: (item.errorType as ErrorType | null) ?? null,
      });
      if (mistakes.length >= limit) return mistakes;
    }
  }
  return mistakes;
}

async function activeDays(student: Student, days = 60) {
  const since = new Date(Date.now() - days * DAY_MS);
  const [times, plans] = await Promise.all([bac.attemptTimesSince(student.id, since), bac.listDailyPlans(student.id, days)]);
  const set = new Set(times.map(time => dayKey(time)));
  for (const plan of plans) {
    const parsed = JSON.parse(plan.planJson) as DailyPlan;
    if (parsed.tasks.some(task => task.completedAt)) set.add(plan.day);
  }
  return set;
}

// ---------------------------------------------------------------------------
// Daily plan
// ---------------------------------------------------------------------------

async function loadOrCreatePlan(student: Student & { stream: PlatformStream }) {
  const today = dayKey(new Date());
  const existing = await bac.getDailyPlan(student.id, today);
  if (existing) return { row: existing, plan: JSON.parse(existing.planJson) as DailyPlan };
  const [entries, mistakes, errorCounts, days] = await Promise.all([
    standings(student),
    recentMistakes(student),
    bac.errorTypeCounts(student.id, new Date(Date.now() - 30 * DAY_MS)),
    activeDays(student, 14),
  ]);
  const bac0 = nextBacDate(new Date());
  const lessons: PlanLesson[] = entries.map(entry => ({
    key: entry.lesson.key,
    title: entry.lesson.title,
    points: entry.points,
    mastery: entry.mastery,
    weakSkills: entry.weakSkills.slice(0, 2).map(skill => ({
      key: skill.key,
      name: skill.name,
      explanation: skill.explanation,
      example: skill.example,
    })),
  }));
  const plan = buildDailyPlan({
    day: today,
    lessons,
    mistakes,
    errorCounts: errorCounts as Partial<Record<ErrorType, number>>,
    daysLeft: Math.max(0, Math.ceil((bac0.date.getTime() - Date.now()) / DAY_MS)),
    activeDaysLast14: days.size,
    overallMastery: entries.length ? entries.reduce((sum, entry) => sum + (entry.mastery ?? 0), 0) / entries.length : 0,
  });
  const row = await bac.insertDailyPlan(student.id, today, JSON.stringify(plan));
  return { row, plan: JSON.parse(row.planJson) as DailyPlan };
}

async function planView(student: Student, plan: DailyPlan) {
  const ids = plan.tasks.map(task => task.assessmentId).filter((id): id is number => id !== null);
  const graded = await bac.gradedAssessmentIds(student.id, ids);
  const days = await activeDays(student);
  const streak = studyStreak(days, plan.day);
  return {
    ...plan,
    tasks: plan.tasks.map(task => ({ ...task, done: isTaskDone(task, graded) })),
    progress: planProgress(plan, graded),
    streak,
  };
}

export async function todayPlan(userId: number) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const { plan } = await loadOrCreatePlan(student);
  return planView(student, plan);
}

/** Creates the questions of a task (exercises, quiz, review) — once. */
export async function startPlanTask(userId: number, taskId: string) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const { row, plan } = await loadOrCreatePlan(student);
  const task = plan.tasks.find(entry => entry.id === taskId);
  if (!task || task.kind === "lesson") throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  await requireLessonAccess(userId, task.lessonKey, { requireSubscription: true });
  if (task.assessmentId) {
    const assessment = await store.getAssessment(task.assessmentId);
    if (assessment && assessment.status === "open") {
      return {
        assessmentId: assessment.id,
        questions: (JSON.parse(assessment.itemsJson) as BankQuestion[]).map(tafawoq.toPublicQuestion),
      };
    }
    if (assessment) return { assessmentId: assessment.id, questions: [] as PublicQuestion[], done: true };
  }
  const lesson = lessonForStream(getLesson(task.lessonKey)!, student.stream);
  const states = await store.getSkillStates(student.id, lesson.key);
  const mastery = new Map(states.map(state => [state.skill, state.pKnown]));
  const seed = randomSeed();
  const items = task.skillKey
    ? skillItems(lesson, task.skillKey, targetDifficulty(mastery.get(task.skillKey) ?? 0.3), task.count, seed)
    : weeklyItemsForLesson(lesson, states, task.count, seed);
  if (!items.length) throw new TRPCError({ code: "NOT_FOUND", message: "No exercise for this task" });
  const assessmentId = await store.createAssessment({
    studentId: student.id,
    lessonKey: lesson.key,
    kind: "practice",
    itemsJson: JSON.stringify(items),
    source: "template",
  });
  task.assessmentId = assessmentId;
  await bac.updateDailyPlan(row.id, JSON.stringify(plan));
  return { assessmentId, questions: items.map(tafawoq.toPublicQuestion) };
}

export async function completePlanTask(userId: number, taskId: string) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const { row, plan } = await loadOrCreatePlan(student);
  const task = plan.tasks.find(entry => entry.id === taskId);
  if (!task || task.kind !== "lesson") throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  if (!task.completedAt) {
    task.completedAt = new Date().toISOString();
    await bac.updateDailyPlan(row.id, JSON.stringify(plan));
  }
  return planView(student, plan);
}

/** A remedial exercise on one skill ("تمرين إضافي لعلاج نفس الخطأ"). */
export async function targetedPractice(userId: number, lessonKey: string, skillKey: string, count = 2) {
  const student = await requireLessonAccess(userId, lessonKey, { requireSubscription: true });
  const lesson = lessonForStream(getLesson(lessonKey)!, student.stream);
  if (!lesson.skills.some(skill => skill.key === skillKey)) throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
  const states = await store.getSkillStates(student.id, lesson.key);
  const pKnown = states.find(state => state.skill === skillKey)?.pKnown ?? 0.3;
  const items = skillItems(lesson, skillKey, targetDifficulty(pKnown), count, randomSeed());
  if (!items.length) throw new TRPCError({ code: "NOT_FOUND", message: "No exercise for this skill" });
  const assessmentId = await store.createAssessment({
    studentId: student.id,
    lessonKey: lesson.key,
    kind: "practice",
    itemsJson: JSON.stringify(items),
    source: "template",
  });
  return { assessmentId, questions: items.map(tafawoq.toPublicQuestion) };
}

// ---------------------------------------------------------------------------
// Dashboard & motivation
// ---------------------------------------------------------------------------

async function activityTotals(student: Student & { stream: PlatformStream }, entries: Awaited<ReturnType<typeof standings>>) {
  const [attempts, gradedSets, papers, plans, days] = await Promise.all([
    bac.attemptTotals(student.id),
    bac.countGradedSets(student.id),
    bac.countGradedPapers(student.id),
    bac.listDailyPlans(student.id, 365),
    activeDays(student, 365),
  ]);
  let planTasksDone = 0;
  const allIds: number[] = [];
  const parsedPlans = plans.map(plan => JSON.parse(plan.planJson) as DailyPlan);
  for (const plan of parsedPlans) for (const task of plan.tasks) if (task.assessmentId) allIds.push(task.assessmentId);
  const graded = await bac.gradedAssessmentIds(student.id, allIds);
  for (const plan of parsedPlans) planTasksDone += plan.tasks.filter(task => isTaskDone(task, graded)).length;
  const streak = studyStreak(days, dayKey(new Date()));
  const totals = {
    correctAnswers: attempts.correct,
    answers: attempts.answers,
    gradedSets,
    planTasksDone,
    placementTaken: papers.placement > 0 || Boolean(student.placementDoneAt),
    mockExams: papers.mock,
    weeklyTests: papers.weekly,
    bestStreak: streak.best,
    bestSubjectMastery: Math.max(0, ...subjectProgress(entries).map(entry => entry.progress)),
  };
  return { totals, streak, points: computePoints(totals), badges: computeBadges(totals) };
}

export async function achievements(userId: number) {
  const student = await lockedStudent(userId);
  const entries = await standings(student);
  const { totals, streak, points, badges } = await activityTotals(student, entries);
  return { points, badges, streak, totals };
}

async function lastTestResult(student: Student) {
  const [mock, weekly, placement] = await Promise.all([
    store.listMarkedExams(student.id, 1, "mock"),
    store.listMarkedExams(student.id, 1, "weekly"),
    store.listMarkedExams(student.id, 1, "placement"),
  ]);
  const candidates = [
    ...mock.map(row => ({ kind: "mock" as const, row })),
    ...weekly.map(row => ({ kind: "weekly" as const, row })),
    ...placement.map(row => ({ kind: "placement" as const, row })),
  ].filter(entry => entry.row.score !== null);
  candidates.sort((a, b) => (b.row.gradedAt?.getTime() ?? 0) - (a.row.gradedAt?.getTime() ?? 0));
  const latest = candidates[0];
  return latest ? { kind: latest.kind, score: latest.row.score!, outOf: 20, date: latest.row.gradedAt ?? latest.row.createdAt } : null;
}

async function maybeNotifyExpiry(userId: number, summary: Awaited<ReturnType<typeof subscriptionSummary>>) {
  if (!summary.expiringSoon || !summary.endsAt) return;
  const type = `bac_sub_expiring:${dayKey(summary.endsAt)}`;
  if (await bac.hasNotificationSince(userId, type, new Date(Date.now() - 30 * DAY_MS))) return;
  const parents = await bac.parentIdsOf(userId);
  const body = `ينتهي الاشتراك في ${dayKey(summary.endsAt)} (بعد ${summary.daysLeft} يوم).`;
  await bac.insertNotifications([
    { userId, type, title: "اشتراكك يقترب من نهايته", body },
    ...parents.map(parentId => ({ userId: parentId, type, title: "اشتراك ابنك يقترب من نهايته", body })),
  ]);
}

export async function dashboard(userId: number) {
  const student = await lockedStudent(userId);
  const summary = await subscriptionSummary(userId);
  await maybeNotifyExpiry(userId, summary);
  const switches = await contentSwitches();
  const entries = await standings(student);
  const [activity, mistakes, errorCounts, lastTest, notifications, plan] = await Promise.all([
    activityTotals(student, entries),
    recentMistakes(student, 30),
    bac.errorTypeCounts(student.id),
    lastTestResult(student),
    bac.listUserNotifications(userId, 10),
    summary.active || (await hasActiveSubscription(userId)) ? loadOrCreatePlan(student).then(({ plan }) => planView(student, plan)) : Promise.resolve(null),
  ]);
  // Weak points: the weakest skills of placed lessons, then repeated mistakes.
  const weakSkills = entries
    .flatMap(entry =>
      entry.states
        .filter(state => state.pKnown < STRENGTH)
        .map(state => ({ lessonKey: entry.lesson.key, lessonTitle: entry.lesson.title, skill: state.skill, name: skillName(entry.lesson, state.skill), mastery: state.pKnown }))
    )
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5);
  const overall = entries.length ? entries.reduce((sum, entry) => sum + (entry.mastery ?? 0), 0) / entries.length : 0;
  const continueLesson = plan?.tasks.find(task => !task.done)?.lessonKey ?? entries.find(entry => entry.mastery !== null)?.lesson.key ?? entries[0]?.lesson.key ?? null;
  return {
    displayName: student.displayName,
    stream: student.stream,
    secondSubject: student.secondSubject as BacSubject | null,
    subscription: summary,
    content: subscriptionContent(student.stream, student.secondSubject as BacSubject | null, switches),
    overallProgress: overall,
    subjects: subjectProgress(entries),
    lessons: entries.map(entry => ({
      key: entry.lesson.key,
      title: entry.lesson.title,
      subject: entry.subject,
      mastery: entry.mastery,
      skills: entry.lesson.skills.length,
    })),
    plan,
    lastTest,
    weakSkills,
    errorCounts: errorCounts as Partial<Record<ErrorType, number>>,
    recentMistakes: mistakes.slice(0, 3),
    points: activity.points,
    badges: activity.badges,
    streak: activity.streak,
    notifications: notifications.map(row => ({ id: row.id, title: row.title, body: row.body, createdAt: row.createdAt, read: Boolean(row.readAt) })),
    continueLesson,
    placementDone: Boolean(student.placementDoneAt),
  };
}

export async function markNotificationsRead(userId: number) {
  await bac.markNotificationsRead(userId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Weekly test (one per week, out of 20, adapted to the level)
// ---------------------------------------------------------------------------

type WeeklyResult = {
  score: number;
  outOf: 20;
  correct: number;
  total: number;
  durationSec: number;
  subjects: Array<{ subject: string; earned: number; points: number; correct: number; total: number }>;
  strengths: Array<{ lessonTitle: string; name: string }>;
  weaknesses: Array<{ lessonKey: string; lessonTitle: string; skill: string; name: string }>;
  previous: number | null;
  recommendations: Array<{ lessonKey: string; lessonTitle: string; name: string }>;
  items: ItemResult[];
};

export async function weeklyStatus(userId: number) {
  const student = await lockedStudent(userId);
  const week = weekKey(new Date());
  const [current, history] = await Promise.all([bac.getWeeklyPaper(student.id, week), store.listMarkedExams(student.id, 12, "weekly")]);
  return {
    week,
    status: current ? current.status : ("none" as const),
    examId: current?.id ?? null,
    result: current?.status === "graded" && current.resultJson ? (JSON.parse(current.resultJson) as WeeklyResult) : null,
    history: history
      .filter(row => row.score !== null)
      .reverse()
      .map(row => ({ id: row.id, week: row.weekKey, score: row.score!, date: row.gradedAt ?? row.createdAt })),
  };
}

export async function startWeekly(userId: number) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const week = weekKey(new Date());
  const existing = await bac.getWeeklyPaper(student.id, week);
  if (existing?.status === "graded") throw new TRPCError({ code: "CONFLICT", message: "WEEKLY_DONE" });
  if (existing) {
    const paper = JSON.parse(existing.paperJson) as Paper;
    return { examId: existing.id, startedAt: existing.createdAt, questions: await paperQuestions(paper), points: paperPoints(paper) };
  }
  const entries = await standings(student);
  const studied = new Set(await bac.lessonsStudiedSince(student.id, weekStart(new Date())));
  // What was studied this week first; else the lessons worth the most points now.
  const chosen = [
    ...entries.filter(entry => studied.has(entry.lesson.key)),
    ...[...entries].filter(entry => !studied.has(entry.lesson.key)).sort((a, b) => b.points * (1 - (b.mastery ?? 0.3)) - a.points * (1 - (a.mastery ?? 0.3))),
  ].slice(0, 4);
  if (!chosen.length) throw new TRPCError({ code: "NOT_FOUND", message: "NO_CONTENT_YET" });
  const perLesson = chosen.length >= 4 ? 3 : chosen.length === 3 ? 3 : chosen.length === 2 ? 4 : 6;
  const rng = createRng(randomSeed());
  const parts = chosen.map(entry => ({ entry, items: weeklyItemsForLesson(entry.lesson, entry.states, perLesson, rng.int(1, 2 ** 30)) })).filter(part => part.items.length);
  const allDifficulties = parts.flatMap(part => part.items.map(item => item.difficulty));
  const shares = pointsByDifficulty(allDifficulties, 20);
  const paper: Paper = [];
  let cursor = 0;
  for (const part of parts) {
    const assessmentId = await store.createAssessment({
      studentId: student.id,
      lessonKey: part.entry.lesson.key,
      kind: "practice",
      itemsJson: JSON.stringify(part.items),
      source: "template",
    });
    const points = shares.slice(cursor, cursor + part.items.length);
    cursor += part.items.length;
    paper.push({ assessmentId, lessonKey: part.entry.lesson.key, points: points.reduce((sum, value) => sum + value, 0), questionIds: part.items.map(item => item.id) });
    (paper[paper.length - 1] as Paper[number] & { shares?: number[] }).shares = points;
  }
  const examId = await store.createExam({ studentId: student.id, stream: student.stream, paperJson: JSON.stringify(paper), kind: "weekly", weekKey: week });
  return { examId, startedAt: new Date(), questions: await paperQuestions(paper), points: paperPoints(paper) };
}

function paperPoints(paper: Paper) {
  const points: Record<string, number> = {};
  for (const entry of paper as Array<Paper[number] & { shares?: number[] }>) {
    entry.questionIds?.forEach((id, index) => {
      points[`${entry.assessmentId}${SEP}${id}`] = entry.shares?.[index] ?? 0;
    });
  }
  return points;
}

export async function submitWeekly(userId: number, examId: number, answers: SubmittedAnswer[]) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const exam = await store.getExam(examId);
  if (!exam || exam.studentId !== student.id || exam.kind !== "weekly") throw new TRPCError({ code: "NOT_FOUND", message: "Test not found" });
  if (!(await store.claimExam(exam.id))) throw new TRPCError({ code: "CONFLICT", message: "Test already marked" });
  const paper = JSON.parse(exam.paperJson) as Array<Paper[number] & { shares?: number[] }>;
  const graded = await gradePaper(userId, paper, answers);
  const subjectTotals = new Map<string, { earned: number; points: number; correct: number; total: number }>();
  let score = 0;
  for (const { entry, items } of graded) {
    const shares = (entry as Paper[number] & { shares?: number[] }).shares ?? [];
    const lesson = getLesson(entry.lessonKey);
    const subject = lesson ? lessonSubject(lesson)! : "math";
    const totals = subjectTotals.get(subject) ?? { earned: 0, points: 0, correct: 0, total: 0 };
    items.forEach((item, index) => {
      const value = shares[index] ?? 0;
      totals.points += value;
      totals.total += 1;
      if (item.correct) {
        totals.earned += value;
        totals.correct += 1;
        score += value;
      }
    });
    subjectTotals.set(subject, totals);
  }
  const { mastered, review } = skillSummary(graded);
  const history = await store.listMarkedExams(student.id, 2, "weekly");
  const previous = history.find(row => row.id !== exam.id && row.score !== null)?.score ?? null;
  const correct = graded.reduce((sum, part) => sum + part.items.filter(item => item.correct).length, 0);
  const total = graded.reduce((sum, part) => sum + part.items.length, 0);
  const result: WeeklyResult = {
    score: Math.round(score * 4) / 4,
    outOf: 20,
    correct,
    total,
    durationSec: Math.round((Date.now() - exam.createdAt.getTime()) / 1000),
    subjects: Array.from(subjectTotals.entries()).map(([subject, totals]) => ({ subject, ...totals })),
    strengths: mastered.map(entry => ({ lessonTitle: entry.lessonTitle, name: entry.name })),
    weaknesses: review,
    previous,
    recommendations: review.slice(0, 4).map(entry => ({ lessonKey: entry.lessonKey, lessonTitle: entry.lessonTitle, name: entry.name })),
    items: graded.flatMap(part => part.items),
  };
  await store.saveExamResult(exam.id, result.score, JSON.stringify(result));
  await bac.logEvent(userId, "weekly_completed", { examId, score: result.score });
  return result;
}

// ---------------------------------------------------------------------------
// Mock BAC: resume an open paper, autosave answers, time analysis
// ---------------------------------------------------------------------------

export async function openMockExam(userId: number) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const open = await bac.getOpenPaper(student.id, "mock");
  if (!open) return null;
  const paper = JSON.parse(open.paperJson) as Paper;
  const exercises = [];
  for (const entry of paper) {
    const assessment = await store.getAssessment(entry.assessmentId);
    if (!assessment) continue;
    exercises.push({
      assessmentId: entry.assessmentId,
      lessonKey: entry.lessonKey,
      lessonTitle: getLesson(entry.lessonKey)?.title ?? entry.lessonKey,
      points: entry.points ?? 0,
      questions: (JSON.parse(assessment.itemsJson) as BankQuestion[]).map(tafawoq.toPublicQuestion),
    });
  }
  const blueprintMinutes = (await import("../bac")).examBlueprint(student.stream).minutes;
  return {
    examId: open.id,
    minutes: blueprintMinutes,
    startedAt: open.createdAt,
    exercises,
    draft: open.draftJson ? (JSON.parse(open.draftJson) as Record<string, Array<{ questionId: string; answer: string; responseMs?: number }>>) : null,
  };
}

export async function saveMockDraft(userId: number, examId: number, draft: Record<string, Array<{ questionId: string; answer: string; responseMs?: number }>>) {
  const student = await tafawoq.studentOrThrow(userId);
  const exam = await store.getExam(examId);
  if (!exam || exam.studentId !== student.id || exam.kind !== "mock") throw new TRPCError({ code: "NOT_FOUND", message: "Exam not found" });
  if (exam.status !== "open") return { saved: false };
  await bac.savePaperDraft(exam.id, JSON.stringify(draft));
  return { saved: true };
}

/** Hands in a mock BAC and adds time management and the comparison with earlier papers. */
export async function submitMock(
  userId: number,
  examId: number,
  papers: Array<{ assessmentId: number; answers: SubmittedAnswer[] }>
) {
  const student = await lockedStudent(userId);
  const exam = await store.getExam(examId);
  const previous = (await tafawoq.examHistory(student.id, 10)).filter(entry => entry.id !== examId);
  const result = await tafawoq.submitExam(userId, examId, papers);
  const minutes = (await import("../bac")).examBlueprint(student.stream).minutes;
  const spentMs = new Map(
    papers.map(paper => [paper.assessmentId, paper.answers.reduce((sum, answer) => sum + (answer.responseMs ?? 0), 0)])
  );
  const paper = exam ? (JSON.parse(exam.paperJson) as Paper) : [];
  const time = paper.map(entry => {
    const suggestedMin = Math.round(((entry.points ?? 0) / 20) * minutes);
    const spentMin = Math.round((spentMs.get(entry.assessmentId) ?? 0) / 60_000);
    return { assessmentId: entry.assessmentId, lessonKey: entry.lessonKey, suggestedMin, spentMin };
  });
  const totalMin = exam ? Math.round((Date.now() - exam.createdAt.getTime()) / 60_000) : 0;
  await bac.savePaperTime(examId, JSON.stringify({ time, totalMin }));
  const last = previous.at(-1);
  return {
    ...result,
    time,
    totalMin,
    officialMin: minutes,
    comparison: {
      previous: last?.score ?? null,
      best: previous.length ? Math.max(...previous.map(entry => entry.score)) : null,
      average: previous.length ? Math.round((previous.reduce((sum, entry) => sum + entry.score, 0) / previous.length) * 4) / 4 : null,
      count: previous.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Teacher quick requests (the fixed message format)
// ---------------------------------------------------------------------------

export async function teacherAction(
  userId: number,
  input: { lessonKey: string; action: TeacherAction; skillKey?: string | null; style?: TeacherStyle }
) {
  const student = await requireLessonAccess(userId, input.lessonKey, { requireSubscription: true });
  const lesson = lessonForStream(getLesson(input.lessonKey)!, student.stream);
  const context = await tafawoq.loadContext(student, lesson);
  const skill = pickSkill(lesson, context, input.skillKey);
  if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
  let exercise: { assessmentId: number; questions: PublicQuestion[] } | null = null;
  if (input.action === "similar") exercise = await targetedPractice(userId, lesson.key, skill.key, 1);
  const message = teacherMessage({
    action: input.action,
    lesson,
    context,
    skill,
    style: input.style,
    seed: randomSeed(),
    exercisePrompt: exercise?.questions[0]?.prompt,
  });
  const requestLabel: Record<TeacherAction, string> = {
    simpler: "اشرح بطريقة أبسط",
    example: "أعطني مثالًا",
    stepHelp: "لم أفهم هذه الخطوة",
    similar: "أعطني تمرينًا مشابهًا",
    summary: "لخّص لي",
  };
  await store.addMessage({ studentId: student.id, lessonKey: lesson.key, role: "student", content: requestLabel[input.action], source: null });
  await store.addMessage({
    studentId: student.id,
    lessonKey: lesson.key,
    role: "tutor",
    content: teacherMessageText(message),
    source: "template",
    structuredJson: JSON.stringify(message),
  });
  return { message, exercise };
}

// ---------------------------------------------------------------------------
// BAC topic bank
// ---------------------------------------------------------------------------

export async function bankList(userId: number) {
  const student = await lockedStudent(userId);
  const switches = await contentSwitches();
  const lessons = accessibleLessons(student.stream, student.secondSubject, switches);
  const allowed = allowedSubjects(student.stream, student.secondSubject);
  const generated = generatedTopics(lessons, student.stream).map(topic => ({
    ...topic,
    subject: lessonSubject(getLesson(topic.lessonKey)!)!,
  }));
  const published = (await bac.listBankTopics({ publishedOnly: true }))
    .filter(row => row.streams.split(",").includes(student.stream) && allowed.has(row.subject as BacSubject) && !switches.disabledSubjects.has(row.subject))
    .map(row => ({
      id: `db:${row.id}`,
      source: "official" as const,
      lessonKey: null,
      unit: row.unit,
      kind: row.kind,
      title: row.title,
      difficulty: Math.min(3, Math.max(1, row.difficulty)) as 1 | 2 | 3,
      questionType: row.questionType,
      parts: 1,
      points: row.points ?? null,
      year: row.year,
      subject: row.subject,
    }));
  const saved = await bac.listSavedTopics(student.id);
  return { stream: student.stream, topics: [...published, ...generated], saved };
}

export async function bankOpen(userId: number, topicId: string, seed?: number) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  if (topicId.startsWith("db:")) {
    const row = await bac.getBankTopic(Number(topicId.slice(3)));
    const allowed = allowedSubjects(student.stream, student.secondSubject);
    if (!row || !row.published || !row.streams.split(",").includes(student.stream) || !allowed.has(row.subject as BacSubject)) {
      await bac.logEvent(userId, "access_denied", { reason: ACCESS_ERRORS.streamLocked, topicId });
      throw new TRPCError({ code: "FORBIDDEN", message: ACCESS_ERRORS.streamLocked });
    }
    const answers = await bac.listTopicAnswers(student.id, row.id);
    return {
      kind: "official" as const,
      topic: {
        id: topicId,
        title: row.title,
        unit: row.unit,
        year: row.year,
        statement: row.statement,
        methodology: row.methodology,
        points: row.points,
        commonMistakes: row.commonMistakes,
        // The model solution is shown once the student has written an answer.
        solution: answers.length ? row.solution : null,
      },
      answers: answers.map(answer => ({ answer: answer.answer, selfScore: answer.selfScore, createdAt: answer.createdAt })),
    };
  }
  const [, lessonKey] = topicId.split(":");
  await requireLessonAccess(userId, lessonKey, { requireSubscription: true });
  const lesson = lessonForStream(getLesson(lessonKey)!, student.stream);
  const drawSeed = seed && Number.isInteger(seed) && seed > 0 ? seed : randomSeed();
  const items = drawGeneratedTopic(lesson, topicId, drawSeed);
  if (!items?.length) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found" });
  const assessmentId = await store.createAssessment({
    studentId: student.id,
    lessonKey: lesson.key,
    kind: "practice",
    itemsJson: JSON.stringify(items),
    source: "template",
  });
  const skills = Array.from(new Set(items.map(item => item.skill)));
  const commonMistakes = Array.from(
    new Set(items.flatMap(item => Object.values(item.distractors ?? {})).map(key => lesson.misconceptions[key]).filter(Boolean))
  ).slice(0, 5);
  return {
    kind: "generated" as const,
    topic: {
      id: topicId,
      seed: drawSeed,
      title: items[0].problem?.title ?? skillName(lesson, items[0].skill),
      unit: lesson.title,
      statement: items[0].problem?.statement ?? null,
      methodology: skills.map(key => {
        const skill = lesson.skills.find(entry => entry.key === key);
        return skill ? { name: skill.name, rule: skill.dialogue?.rule ?? skill.explanation.split(/(?<=[.:])\s+/)[0] } : null;
      }).filter(Boolean),
      points: Math.min(7, Math.max(1, items.length + (items.length > 1 ? 1 : 0))),
      commonMistakes,
    },
    assessmentId,
    questions: items.map(tafawoq.toPublicQuestion),
  };
}

export async function bankAnswerOfficial(userId: number, topicId: string, answer: string, selfScore: number | null) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const row = await bac.getBankTopic(Number(topicId.replace(/^db:/, "")));
  const allowed = allowedSubjects(student.stream, student.secondSubject);
  if (!row || !row.published || !row.streams.split(",").includes(student.stream) || !allowed.has(row.subject as BacSubject)) {
    throw new TRPCError({ code: "FORBIDDEN", message: ACCESS_ERRORS.streamLocked });
  }
  await bac.saveTopicAnswer(student.id, row.id, answer.trim(), selfScore);
  return { solution: row.solution, methodology: row.methodology, commonMistakes: row.commonMistakes };
}

export async function bankToggleSave(userId: number, topicId: string, saved: boolean) {
  const student = await lockedStudent(userId);
  await bac.setTopicSaved(student.id, topicId, saved);
  return { saved };
}

// ---------------------------------------------------------------------------
// Quick revision pack (works offline once downloaded)
// ---------------------------------------------------------------------------

export async function revisionPack(userId: number) {
  const student = await lockedStudent(userId);
  await requireSubscription(userId);
  const switches = await contentSwitches();
  const lessons = accessibleLessons(student.stream, student.secondSubject, switches);
  const rng = createRng(randomSeed());
  const subjects = new Map<string, Array<ReturnType<typeof revisionLesson>>>();
  for (const lesson of lessons) {
    const subject = lessonSubject(lesson)!;
    const list = subjects.get(subject) ?? [];
    list.push(revisionLesson(lesson, rng.int(1, 2 ** 30)));
    subjects.set(subject, list);
  }
  return {
    generatedAt: new Date().toISOString(),
    stream: student.stream,
    subjects: Array.from(subjects.entries()).map(([subject, lessonsOf]) => ({ subject, lessons: lessonsOf })),
  };
}

function revisionLesson(lesson: Lesson, seed: number) {
  const rng = createRng(seed);
  // Quick questions are fresh generated items (never the placement bank).
  const quick = rng
    .shuffle(lesson.generators ?? [])
    .slice(0, 4)
    .map(generator => instantiate(generator, rng.int(1, 2 ** 30)))
    .map(item => ({ prompt: item.prompt, options: item.type === "mcq" ? item.options ?? null : null, answer: item.answer, explanation: item.explanation }));
  return {
    key: lesson.key,
    title: lesson.title,
    laws: lesson.skills.filter(skill => skill.dialogue?.rule).map(skill => ({ name: skill.name, text: skill.dialogue!.rule })),
    definitions: lesson.skills.map(skill => ({ name: skill.name, text: skill.explanation })),
    methods: lesson.skills.map(skill => ({ name: skill.name, problem: skill.example.problem, steps: skill.example.steps, answer: skill.example.answer })),
    terms: lesson.skills.map(skill => skill.name),
    pitfalls: Object.values(lesson.misconceptions).slice(0, 8),
    flashcards: lesson.skills.map(skill => ({
      front: skill.name,
      back: skill.dialogue?.rule ?? skill.explanation.split(/(?<=[.:])\s+/)[0] ?? skill.explanation,
    })),
    quick,
    // These categories only appear for subjects whose content has them.
    dates: [] as Array<{ name: string; text: string }>,
    concepts: [] as Array<{ name: string; text: string }>,
  };
}

// ---------------------------------------------------------------------------
// Parents
// ---------------------------------------------------------------------------

export async function createParentCode(userId: number) {
  await lockedStudent(userId);
  const invite = await createParentInvite(userId);
  if (!invite) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database not configured" });
  await bac.logEvent(userId, "parent_code_created");
  return invite;
}

/**
 * The parent's view of each actively linked child only: progress, subjects,
 * test results, weak points, last activity, subscription. The teacher
 * conversation is included only when the child has opted in.
 */
export async function parentOverview(parentUserId: number) {
  const reports = await tafawoq.parentReport(parentUserId);
  return Promise.all(
    reports.map(async report => {
      const link = (await (await import("../../db/parent")).getParentLinks(parentUserId)).find(entry => entry.id === report.linkId);
      const childId = link?.childId;
      if (!childId) return { ...report, bac: null };
      const student = await store.getTafawoqStudentByUser(childId);
      if (!student) return { ...report, bac: null };
      const summary = await subscriptionSummary(childId);
      const lastActivity = report.lastActivityAt;
      // Low activity / expiry alerts for the parent, at most once a week each.
      const inactiveDays = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / DAY_MS) : null;
      const alerts: Array<"low_activity" | "expiring" | "expired"> = [];
      if (inactiveDays === null || inactiveDays >= 3) alerts.push("low_activity");
      if (summary.expiringSoon) alerts.push("expiring");
      if (summary.status === "expired") alerts.push("expired");
      for (const alert of alerts) {
        const type = `bac_parent_${alert}:${childId}`;
        if (!(await bac.hasNotificationSince(parentUserId, type, new Date(Date.now() - 7 * DAY_MS)))) {
          await bac.insertNotifications([
            {
              userId: parentUserId,
              type,
              title: alert === "low_activity" ? "نشاط ضعيف" : alert === "expiring" ? "الاشتراك يقترب من نهايته" : "انتهى الاشتراك",
              body:
                alert === "low_activity"
                  ? `${student.displayName}: لا نشاط منذ ${inactiveDays ?? "—"} يوم.`
                  : `${student.displayName}: ${summary.endsAt ? dayKey(summary.endsAt) : ""}`,
            },
          ]);
        }
      }
      const [weekly, placement, chats] = await Promise.all([
        store.listMarkedExams(student.id, 5, "weekly"),
        placementResult(childId),
        student.shareChatsWithParent === 1 ? recentChats(student.id) : Promise.resolve(null),
      ]);
      return {
        ...report,
        bac: {
          stream: student.streamLockedAt && isPlatformStream(student.stream) ? student.stream : null,
          secondSubject: student.secondSubject,
          subscription: { status: summary.status, endsAt: summary.endsAt, daysLeft: summary.daysLeft, expiringSoon: summary.expiringSoon },
          weekly: weekly.filter(row => row.score !== null).reverse().map(row => ({ week: row.weekKey, score: row.score! })),
          placement: placement ? { subjects: placement.subjects, date: placement.date } : null,
          alerts,
          chatsShared: student.shareChatsWithParent === 1,
          chats,
        },
      };
    })
  );
}

async function recentChats(studentId: number) {
  const { getDb } = await import("../../db/shared");
  const { tafawoqMessages } = await import("../../../drizzle/schema");
  const { desc, eq } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ role: tafawoqMessages.role, content: tafawoqMessages.content, lessonKey: tafawoqMessages.lessonKey, createdAt: tafawoqMessages.createdAt })
    .from(tafawoqMessages)
    .where(eq(tafawoqMessages.studentId, studentId))
    .orderBy(desc(tafawoqMessages.id))
    .limit(20);
  return rows.reverse();
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function adminName(adminId: number) {
  return (await bac.getUserBasic(adminId))?.name ?? null;
}

export async function adminOverview() {
  const [students, pendingRequests, pendingSubs, papers] = await Promise.all([
    bac.studentsPerStream(),
    bac.listStreamRequests("pending"),
    bac.listSubscriptions("pending_payment"),
    bac.paperStats(),
  ]);
  return { students, pendingRequests: pendingRequests.length, pendingSubscriptions: pendingSubs.length, papers };
}

export async function adminStudents(input: { search?: string; stream?: string }) {
  const rows = await bac.listStudents({ search: input.search, stream: input.stream });
  return Promise.all(
    rows.map(async row => {
      const summary = await subscriptionSummary(row.userId);
      return { ...row, subscription: { status: summary.status, endsAt: summary.endsAt } };
    })
  );
}

export async function adminSetSecondSubject(adminId: number, studentId: number, subject: BacSubject | null) {
  const student = await bac.getStudentById(studentId);
  if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
  if (subject && (!isPlatformStream(student.stream) || !SECOND_SUBJECT_OPTIONS[student.stream].includes(subject))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: ACCESS_ERRORS.subjectNotAllowed });
  }
  await bac.setSecondSubject(student.id, subject);
  await bac.recordSecondSubjectChange({ studentId: student.id, fromSubject: student.secondSubject, toSubject: subject, changedBy: adminId, byAdmin: true });
  await logAdminAction({ actorId: adminId, action: "bac.second_subject", targetType: "tafawoqStudent", targetId: student.id, details: { from: student.secondSubject, to: subject } });
  await bac.logEvent(adminId, "second_subject_changed_by_admin", { studentId, from: student.secondSubject, to: subject });
  return { ok: true };
}

export async function adminSetAccountStatus(adminId: number, userId: number, status: "active" | "suspended") {
  if (userId === adminId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own account" });
  const user = await bac.getUserBasic(userId);
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  if (user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot suspend an admin" });
  await bac.setAccountStatus(userId, status);
  await logAdminAction({ actorId: adminId, action: `bac.account_${status}`, targetType: "user", targetId: userId });
  await bac.logEvent(adminId, status === "suspended" ? "account_suspended" : "account_activated", { userId });
  return { ok: true };
}

export async function adminResolveStreamRequest(adminId: number, requestId: number, approve: boolean, note: string | null) {
  const request = await bac.getStreamRequest(requestId);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
  if (!(await bac.resolveStreamRequest(request.id, approve ? "approved" : "rejected", adminId, note))) {
    throw new TRPCError({ code: "CONFLICT", message: "Request already reviewed" });
  }
  const student = await bac.getStudentById(request.studentId);
  if (approve && student) {
    await bac.adminSetStream(student.id, request.toStream);
    await bac.recordStreamChange({
      studentId: student.id,
      studentName: student.displayName,
      fromStream: request.fromStream,
      toStream: request.toStream,
      reason: request.reason,
      adminId,
      adminName: await adminName(adminId),
      requestId: request.id,
    });
  }
  await logAdminAction({
    actorId: adminId,
    action: approve ? "bac.stream_request_approved" : "bac.stream_request_rejected",
    targetType: "tafawoqStreamRequest",
    targetId: request.id,
    details: { from: request.fromStream, to: request.toStream },
  });
  await bac.logEvent(adminId, approve ? "stream_request_approved" : "stream_request_rejected", { requestId, studentId: request.studentId });
  await bac.insertNotifications([
    {
      userId: request.userId,
      type: "bac_stream_request",
      title: approve ? "تم قبول طلب تغيير الشعبة" : "تم رفض طلب تغيير الشعبة",
      body: note?.trim() || (approve ? "أصبحت مواد شعبتك الجديدة متاحة لحسابك." : "بقيت شعبتك كما هي."),
    },
  ]);
  return { ok: true };
}

export async function adminConfirmSubscription(adminId: number, subscriptionId: number, note: string | null) {
  const row = await bac.getSubscription(subscriptionId);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
  if (row.status !== "pending_payment") throw new TRPCError({ code: "CONFLICT", message: "NOT_PENDING" });
  const student = await store.getTafawoqStudentByUser(row.userId);
  const latestEnd = await bac.getLatestActiveEnd(row.userId);
  const now = new Date();
  const startsAt = latestEnd && latestEnd.getTime() > now.getTime() ? latestEnd : now;
  const bonus = student ? await bac.takeBonusCredit(student.id) : 0;
  const endsAt = new Date(addMonths(startsAt, row.months).getTime() + bonus * DAY_MS);
  if (!(await bac.activateSubscription({ id: row.id, startsAt, endsAt, bonusDays: bonus, adminId, note }))) {
    if (student && bonus) await bac.addBonusCredit(student.id, bonus);
    throw new TRPCError({ code: "CONFLICT", message: "NOT_PENDING" });
  }
  if (row.couponId) await bac.redeemCoupon(row.couponId, row.userId);
  // Referral: the inviter gets free days once the invited student has really paid.
  const redemption = await bac.getReferralRedemption(row.userId);
  if (redemption && !redemption.rewardGranted && (await bac.claimReferralReward(redemption.id))) {
    const code = await bac.getReferralCodeById(redemption.referralCodeId);
    const days = await settingNumber("bac.referralBonusDays", 7);
    if (code && days > 0) {
      if (!(await bac.extendLatestActive(code.userId, days))) {
        const inviter = await store.getTafawoqStudentByUser(code.userId);
        if (inviter) await bac.addBonusCredit(inviter.id, days);
      }
      await bac.insertNotifications([{ userId: code.userId, type: "bac_referral_reward", title: "أيام مجانية", body: `حصلت على ${days} أيام مجانية بفضل دعوتك.` }]);
    }
  }
  await bac.insertNotifications([
    { userId: row.userId, type: "bac_subscription_active", title: "تم تفعيل اشتراكك", body: `اشتراكك صالح حتى ${dayKey(endsAt)}.` },
  ]);
  await logAdminAction({ actorId: adminId, action: "bac.subscription_confirmed", targetType: "tafawoqSubscription", targetId: row.id, details: { userId: row.userId, amountDa: row.amountDa } });
  await bac.logEvent(adminId, "subscription_activated", { subscriptionId: row.id, userId: row.userId });
  return { startsAt, endsAt };
}

export async function adminCloseSubscription(adminId: number, subscriptionId: number, status: "rejected" | "canceled", note: string | null) {
  const row = await bac.getSubscription(subscriptionId);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
  const from: Array<"pending_payment" | "active"> = status === "rejected" ? ["pending_payment"] : ["active", "pending_payment"];
  if (!(await bac.closeSubscription(row.id, status, adminId, note, from))) throw new TRPCError({ code: "CONFLICT", message: "Wrong status" });
  await bac.insertNotifications([
    {
      userId: row.userId,
      type: "bac_subscription_closed",
      title: status === "rejected" ? "لم يتم تأكيد الدفع" : "تم إيقاف الاشتراك",
      body: note?.trim() || "تواصل مع الإدارة لمزيد من التفاصيل.",
    },
  ]);
  await logAdminAction({ actorId: adminId, action: `bac.subscription_${status}`, targetType: "tafawoqSubscription", targetId: row.id });
  await bac.logEvent(adminId, `subscription_${status}`, { subscriptionId: row.id, userId: row.userId });
  return { ok: true };
}

export async function adminContent() {
  const switches = await contentSwitches();
  const subjects = BAC_SUBJECTS.map(subject => {
    const lessons = Array.from(
      new Map(
        PLATFORM_STREAMS.flatMap(stream => streamLessons(stream))
          .filter(lesson => lessonSubject(lesson) === subject)
          .map(lesson => [lesson.key, lesson])
      ).values()
    );
    return {
      key: subject,
      enabled: !switches.disabledSubjects.has(subject),
      hasContent: lessons.length > 0,
      streams: PLATFORM_STREAMS.filter(stream => STREAM_CORE_SUBJECTS[stream].includes(subject) || SECOND_SUBJECT_OPTIONS[stream].includes(subject)),
      lessons: lessons.map(lesson => ({
        key: lesson.key,
        title: lesson.title,
        skills: lesson.skills.length,
        problems: lesson.problems?.length ?? 0,
        streams: lesson.streams ?? null,
        enabled: !switches.disabledLessons.has(lesson.key),
      })),
    };
  });
  return { subjects };
}

export async function adminSetContent(adminId: number, key: string, enabled: boolean) {
  await bac.setContentSetting(key, enabled, adminId);
  clearContentSwitchesCache();
  await logAdminAction({ actorId: adminId, action: "bac.content_switch", targetType: "content", targetId: key, details: { enabled } });
  return { ok: true };
}

export async function adminAnalytics() {
  const [usage, misconceptions, errorTypes, papers, students] = await Promise.all([
    bac.lessonUsage(),
    bac.topMisconceptions(15),
    bac.globalErrorTypes(),
    bac.paperStats(),
    bac.studentsPerStream(),
  ]);
  const bySubject = new Map<string, { answers: number; correct: number }>();
  for (const row of usage) {
    const lesson = getLesson(row.lessonKey);
    const subject = lesson ? lessonSubject(lesson) ?? "other" : "other";
    const entry = bySubject.get(subject) ?? { answers: 0, correct: 0 };
    entry.answers += row.answers;
    entry.correct += row.correct;
    bySubject.set(subject, entry);
  }
  return {
    subjects: Array.from(bySubject.entries())
      .map(([subject, entry]) => ({ subject, answers: entry.answers, success: entry.answers ? entry.correct / entry.answers : null }))
      .sort((a, b) => b.answers - a.answers),
    lessons: usage.slice(0, 20).map(row => ({
      ...row,
      title: getLesson(row.lessonKey)?.title ?? row.lessonKey,
      success: row.answers ? row.correct / row.answers : null,
    })),
    misconceptions: misconceptions.map(row => {
      const lesson = getLesson(row.lessonKey);
      return { ...row, lessonTitle: lesson?.title ?? row.lessonKey, label: lesson?.misconceptions[row.misconception ?? ""] ?? row.misconception };
    }),
    errorTypes,
    papers,
    students,
  };
}

export async function adminBroadcast(adminId: number, input: { title: string; body: string; stream?: PlatformStream | null }) {
  const userIds = await bac.studentUserIds(input.stream ?? undefined);
  await bac.insertNotifications(userIds.map(userId => ({ userId, type: "bac_admin_message", title: input.title, body: input.body })));
  await logAdminAction({ actorId: adminId, action: "bac.broadcast", targetType: "students", targetId: input.stream ?? "all", details: { count: userIds.length } });
  return { sent: userIds.length };
}

export async function adminSettings() {
  return {
    secondSubjectChange: await settingFlag("bac.secondSubjectChange", true),
    referralBonusDays: await settingNumber("bac.referralBonusDays", 7),
    paymentInstructions: (await getPlatformSetting("bac.paymentInstructions")) ?? "",
  };
}

export async function adminSetSettings(
  adminId: number,
  input: { secondSubjectChange?: boolean; referralBonusDays?: number; paymentInstructions?: string }
) {
  if (input.secondSubjectChange !== undefined) await setPlatformSetting("bac.secondSubjectChange", input.secondSubjectChange ? "1" : "0");
  if (input.referralBonusDays !== undefined) await setPlatformSetting("bac.referralBonusDays", String(input.referralBonusDays));
  if (input.paymentInstructions !== undefined) await setPlatformSetting("bac.paymentInstructions", input.paymentInstructions);
  await logAdminAction({ actorId: adminId, action: "bac.settings", details: input as Record<string, unknown> });
  return adminSettings();
}
