import { and, desc, eq, inArray } from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  lessonProgress,
  lessons,
  quizAttempts,
  subjects,
  units,
} from "../../../drizzle/schema";
import { getDb } from "../shared";
import { computeProgressPercent, isCourseComplete } from "../../courseProgress";
import { awardPoints, checkAndAwardBadges } from "../gamification";
import { issueCertificate } from "../certificates";
import { createNotification } from "../notifications";
import { hasActiveSubscription, isLessonLocked } from "./catalog";

export async function getUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, userId))
    .orderBy(desc(courseEnrollments.updatedAt));
}


export async function enrollInCourse(input: {
  userId: number;
  courseId: number;
  // Set only by an admin manually granting access after confirming a
  // WhatsApp/manual payment outside the platform (see admin.enrollLearner
  // in routers.ts) — self-service enrollment (progress.enroll) never sets
  // this, so the subscription check still applies to every learner-driven
  // enrollment exactly as before.
  bypassSubscriptionCheck?: boolean;
}) {
    const db = await getDb();
  if (!db) return { ok: false as const, reason: "unavailable" as const };
  const courseRows = await db
    .select({
      id: courses.id,
      isPublished: courses.isPublished,
      isFree: courses.isFree,
    })
    .from(courses)
    .where(eq(courses.id, input.courseId))
    .limit(1);
  const course = courseRows[0];
  if (!course || course.isPublished !== 1)
    return { ok: false as const, reason: "not_found" as const };
  const existing = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, input.userId),
        eq(courseEnrollments.courseId, input.courseId)
      )
    )
    .limit(1);
  if (existing[0])
    return {
      ok: true as const,
      enrollment: existing[0],
      alreadyEnrolled: true,
    };
  if (
    !input.bypassSubscriptionCheck &&
    course.isFree !== 1 &&
    !(await hasActiveSubscription(input.userId))
  ) {
    return { ok: false as const, reason: "subscription_required" as const };
  }
  await db
    .insert(courseEnrollments)
    .values({
      userId: input.userId,
      courseId: input.courseId,
      progressPercent: 0,
      status: "active",
    });
  const inserted = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, input.userId),
        eq(courseEnrollments.courseId, input.courseId)
      )
    )
    .limit(1);
  await createNotification({
    userId: input.userId,
    type: "enrollment",
    title: "enrollment.created",
    body: String(input.courseId),
  });
  return { ok: true as const, enrollment: inserted[0], alreadyEnrolled: false };
}

export async function updateLessonProgress(input: {
  userId: number;
  lessonId: number;
  completed: boolean;
  lastPositionSeconds: number;
}) {
    const db = await getDb();
  if (!db) return { ok: false as const, reason: "unavailable" as const };
  const lessonRows = await db
    .select({ courseId: courses.id, isPublished: courses.isPublished })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(eq(lessons.id, input.lessonId))
    .limit(1);
  const courseId = lessonRows[0]?.courseId;
  if (!courseId || lessonRows[0]?.isPublished !== 1)
    return { ok: false as const, reason: "not_found" as const };
  const enrollment = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, input.userId),
        eq(courseEnrollments.courseId, courseId)
      )
    )
    .limit(1);
  if (!enrollment[0])
    return { ok: false as const, reason: "not_enrolled" as const };
  // Server-enforced sequencing: a learner cannot record progress on a lesson
  // while the previous lesson in course order is still incomplete.
  if (await isLessonLocked(db, input.userId, courseId, input.lessonId))
    return { ok: false as const, reason: "locked" as const };
  const existingProgress = await db
    .select({
      id: lessonProgress.id,
      studySeconds: lessonProgress.studySeconds,
      lastPositionSeconds: lessonProgress.lastPositionSeconds,
      completed: lessonProgress.completed,
    })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, input.userId),
        eq(lessonProgress.lessonId, input.lessonId)
      )
    )
    .limit(1);
  const priorPosition = existingProgress[0]?.lastPositionSeconds ?? 0;
  const deltaSeconds = Math.max(
    0,
    Math.min(input.lastPositionSeconds - priorPosition, 3600)
  );
  const studySeconds = (existingProgress[0]?.studySeconds ?? 0) + deltaSeconds;
  const wasAlreadyCompleted = existingProgress[0]?.completed === 1;
  const values = {
    completed: input.completed ? 1 : 0,
    lastPositionSeconds: input.lastPositionSeconds,
    studySeconds,
    lastActivityAt: new Date(),
    completedAt: input.completed ? new Date() : null,
  };
  if (existingProgress[0])
    await db
      .update(lessonProgress)
      .set(values)
      .where(eq(lessonProgress.id, existingProgress[0].id));
  else
    await db
      .insert(lessonProgress)
      .values({ userId: input.userId, lessonId: input.lessonId, ...values });
  const courseLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .where(eq(units.courseId, courseId));
  const completedLessons = courseLessons.length
    ? await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, input.userId),
            eq(lessonProgress.completed, 1),
            inArray(
              lessonProgress.lessonId,
              courseLessons.map(lesson => lesson.id)
            )
          )
        )
    : [];
  const progressPercent = computeProgressPercent(
    courseLessons.map(lesson => lesson.id),
    completedLessons.map(lesson => lesson.lessonId)
  );
  const enrollmentValues = {
    progressPercent,
    status: isCourseComplete(progressPercent)
      ? ("completed" as const)
      : ("active" as const),
  };
  await db
    .update(courseEnrollments)
    .set(enrollmentValues)
    .where(eq(courseEnrollments.id, enrollment[0].id));
  // Points/badges only on a genuine first-time completion — never re-awarded for repeat "complete" calls or position-only updates.
  if (input.completed && !wasAlreadyCompleted) {
    await awardPoints({
      userId: input.userId,
      reason: "lesson_completed",
      refId: input.lessonId,
    });
    await checkAndAwardBadges(input.userId);
  }
  if (progressPercent === 100)
    await issueCertificate({ userId: input.userId, courseId });
  return { ok: true as const, progressPercent, completed: input.completed };
}

export async function getLearnerSummary(userId: number) {
  const db = await getDb();
  if (!db)
    return {
      enrollments: [],
      attempts: [],
      subjectResults: [] as {
        subject: string;
        titleAr: string;
        titleFr: string;
        titleEn: string;
        icon: string;
        percent: number;
      }[],
      totalStudySeconds: 0,
    };
  const enrollments = await db
    .select({
      id: courseEnrollments.id,
      courseId: courseEnrollments.courseId,
      courseSlug: courses.slug,
      progressPercent: courseEnrollments.progressPercent,
      status: courseEnrollments.status,
      updatedAt: courseEnrollments.updatedAt,
      subject: courses.subject,
      titleAr: courses.titleAr,
      titleFr: courses.titleFr,
      titleEn: courses.titleEn,
    })
    .from(courseEnrollments)
    .leftJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .where(eq(courseEnrollments.userId, userId))
    .orderBy(desc(courseEnrollments.updatedAt));
  const attempts = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      score: quizAttempts.score,
      passed: quizAttempts.passed,
      completedAt: quizAttempts.completedAt,
      feedbackJson: quizAttempts.feedbackJson,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId))
    .orderBy(desc(quizAttempts.completedAt))
    .limit(20);
  const studyRows = await db
    .select({ studySeconds: lessonProgress.studySeconds })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));
  const totalStudySeconds = studyRows.reduce(
    (sum, row) => sum + row.studySeconds,
    0
  );
  // Dynamic per-subject breakdown — driven by whatever subjects actually
  // exist in the catalog, not a hardcoded pair. A newly-added subject shows
  // up here automatically once a learner has an enrollment in it.
  const bySubject = new Map<string, { total: number; count: number }>();
  for (const enrollment of enrollments) {
    if (!enrollment.subject) continue;
    const entry = bySubject.get(enrollment.subject) ?? { total: 0, count: 0 };
    entry.total += enrollment.progressPercent;
    entry.count += 1;
    bySubject.set(enrollment.subject, entry);
  }
  const allSubjects = await db.select().from(subjects);
  const subjectMeta = new Map(allSubjects.map(s => [s.slug, s]));
  const subjectResults = Array.from(bySubject.entries()).map(
    ([slug, entry]) => {
      const meta = subjectMeta.get(slug);
      return {
        subject: slug,
        titleAr: meta?.titleAr ?? slug,
        titleFr: meta?.titleFr ?? slug,
        titleEn: meta?.titleEn ?? slug,
        icon: meta?.icon ?? "book",
        percent: entry.count ? Math.round(entry.total / entry.count) : 0,
      };
    }
  );
  // "Resume where I left off" needs a real lesson to land on, not just the
  // course overview — otherwise "resume" is indistinguishable from "start
  // over and find it yourself". For each enrollment: the most recently
  // touched lesson (any progress row at all, complete or not) wins; if the
  // learner enrolled but has never opened a lesson yet, fall back to the
  // course's first lesson in the same unit/lesson order the server uses
  // for locking, so the button still goes somewhere real.
  const enrollmentsWithResume = await Promise.all(
    enrollments.map(async enrollment => {
      const lastTouched = await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .leftJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .leftJoin(units, eq(units.id, lessons.unitId))
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(units.courseId, enrollment.courseId)
          )
        )
        .orderBy(desc(lessonProgress.lastActivityAt))
        .limit(1);
      if (lastTouched[0]) {
        return { ...enrollment, resumeLessonId: lastTouched[0].lessonId };
      }
      const firstLesson = await db
        .select({ lessonId: lessons.id })
        .from(lessons)
        .leftJoin(units, eq(units.id, lessons.unitId))
        .where(eq(units.courseId, enrollment.courseId))
        .orderBy(units.orderIndex, lessons.orderIndex)
        .limit(1);
      return {
        ...enrollment,
        resumeLessonId: firstLesson[0]?.lessonId ?? null,
      };
    })
  );
  return {
    enrollments: enrollmentsWithResume,
    attempts,
    subjectResults,
    totalStudySeconds,
  };
}

