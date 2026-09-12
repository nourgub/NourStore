import {
  and,
  desc,
  eq,
  inArray,
  like,
  or,
} from "drizzle-orm";
import {
  Course,
  algorithmExercises,
  courseEnrollments,
  courses,
  lessonAssets,
  lessonProgress,
  lessons,
  units,
  userSubscriptions,
} from "../../../drizzle/schema";
import { ENV } from "../../_core/env";
import { getDb } from "../shared";

export async function getPublishedCourses(): Promise<Course[]> {
    const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(courses)
    .where(eq(courses.isPublished, 1))
    .orderBy(desc(courses.createdAt));
}

export async function searchLearningContent(input: {
  query: string;
  level?: string;
  subject?: string;
  limit: number;
}) {
  const db = await getDb();
  const query = input.query.trim();
  if (!db || query.length < 2)
    return { courses: [], lessons: [], exercises: [] };
  const pattern = `%${query.slice(0, 80)}%`;
  const courseFilters = [
    eq(courses.isPublished, 1),
    or(
      like(courses.titleAr, pattern),
      like(courses.titleFr, pattern),
      like(courses.titleEn, pattern)
    ),
  ];
  if (input.level)
    courseFilters.push(
      eq(
        courses.level,
        input.level as (typeof courses.level.enumValues)[number]
      )
    );
  if (input.subject) courseFilters.push(eq(courses.subject, input.subject));
  const courseRows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      subject: courses.subject,
      level: courses.level,
      titleAr: courses.titleAr,
      titleFr: courses.titleFr,
      titleEn: courses.titleEn,
      descriptionAr: courses.descriptionAr,
      descriptionFr: courses.descriptionFr,
      descriptionEn: courses.descriptionEn,
    })
    .from(courses)
    .where(and(...courseFilters))
    .orderBy(desc(courses.updatedAt))
    .limit(input.limit);
  const lessonRows = await db
    .select({
      id: lessons.id,
      unitId: lessons.unitId,
      titleAr: lessons.titleAr,
      titleFr: lessons.titleFr,
      titleEn: lessons.titleEn,
      type: lessons.type,
      courseSlug: courses.slug,
      courseTitleAr: courses.titleAr,
      courseTitleFr: courses.titleFr,
      courseTitleEn: courses.titleEn,
    })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(courses.isPublished, 1),
        or(
          like(lessons.titleAr, pattern),
          like(lessons.titleFr, pattern),
          like(lessons.titleEn, pattern)
        )
      )
    )
    .orderBy(desc(lessons.createdAt))
    .limit(input.limit);
  const exerciseRows = await db
    .select({
      id: algorithmExercises.id,
      slug: algorithmExercises.slug,
      difficulty: algorithmExercises.difficulty,
      titleAr: algorithmExercises.titleAr,
      titleFr: algorithmExercises.titleFr,
      titleEn: algorithmExercises.titleEn,
    })
    .from(algorithmExercises)
    .where(
      and(
        eq(algorithmExercises.isPublished, 1),
        or(
          like(algorithmExercises.titleAr, pattern),
          like(algorithmExercises.titleFr, pattern),
          like(algorithmExercises.titleEn, pattern)
        )
      )
    )
    .orderBy(desc(algorithmExercises.createdAt))
    .limit(input.limit);
  return { courses: courseRows, lessons: lessonRows, exercises: exerciseRows };
}

export async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.updatedAt));
}

export async function getCoursesForRole(
  role: "learner" | "parent" | "teacher" | "institution" | "admin",
  userId: number
) {
  const db = await getDb();
  if (!db) return [];
  if (role === "admin")
    return db.select().from(courses).orderBy(desc(courses.updatedAt));
  if (role === "teacher" || role === "institution") {
    return db
      .select()
      .from(courses)
      .where(eq(courses.ownerId, userId))
      .orderBy(desc(courses.updatedAt));
  }
  return [];
}


export async function hasActiveSubscription(userId: number) {
    const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({
      status: userSubscriptions.status,
      expiresAt: userSubscriptions.expiresAt,
    })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        inArray(userSubscriptions.status, ["active", "trialing"])
      )
    )
    .orderBy(desc(userSubscriptions.updatedAt));
  return rows.some(
    row => !row.expiresAt || row.expiresAt.getTime() > Date.now()
  );
}

export async function getLessonAssets(lessonId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Same ownership gate as getLessonForLearner (this lesson's specific
  // course, published, and either free or an active subscription) plus
  // its own sequencing lock — this function used to only check "does this
  // user have ANY active subscription", which let any subscriber read any
  // published course's lesson files regardless of whether they were
  // actually enrolled in — or had unlocked — that specific lesson.
  const courseRows = await db
    .select({
      courseId: courses.id,
      isCoursePublished: courses.isPublished,
      isCourseFree: courses.isFree,
    })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const courseRow = courseRows[0];
  if (!courseRow || !courseRow.courseId || courseRow.isCoursePublished !== 1)
    return [];
  const enrolled = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, courseRow.courseId)
      )
    )
    .limit(1);
  if (!enrolled.length) return [];
  const eligible =
    courseRow.isCourseFree === 1 || (await hasActiveSubscription(userId));
  if (!eligible) return [];
  if (await isLessonLocked(db, userId, courseRow.courseId, lessonId))
    return [];
  const rows = await db
    .select({
      id: lessonAssets.id,
      lessonId: lessonAssets.lessonId,
      fileName: lessonAssets.fileName,
      url: lessonAssets.url,
      mimeType: lessonAssets.mimeType,
      sizeBytes: lessonAssets.sizeBytes,
      createdAt: lessonAssets.createdAt,
    })
    .from(lessonAssets)
    .where(eq(lessonAssets.lessonId, lessonId))
    .orderBy(desc(lessonAssets.createdAt));
  // The stored URL is local storage's raw key path, not something a
  // browser can fetch directly (no route serves UPLOAD_ROOT
  // unauthenticated — see server/protectedFiles.ts) — rewritten here to
  // the authenticated proxy path so every view re-checks real
  // enrollment/eligibility. Real S3 presigned URLs are already genuinely
  // protected and expiring.
  if (ENV.storageProvider !== "s3") {
    return rows.map(row => ({
      ...row,
      url: `/api/protected-files/lesson-asset/${row.id}`,
    }));
  }
  return rows;
}

export async function getCourseWithCurriculum(
  slug: string,
  viewer?: { id: number; role: string } | null
) {
    return getCourseWithCurriculumMysql(slug, viewer);
}

async function getCourseWithCurriculumMysql(
  slug: string,
  viewer?: { id: number; role: string } | null
) {
  // null, not undefined, on every "nothing to show" path below — this is
  // wired directly into the public learning.course query, and tRPC/React
  // Query forbid a query from ever resolving to undefined. Missed by an
  // earlier browser smoke test (which only ever visited a real, valid,
  // published course slug) and caught instead by a static audit for this
  // same class of bug after it was found twice elsewhere — a nonexistent
  // or unpublished-and-not-owned course slug is a routine real-world case
  // (a stale link, a typo, a draft shared too early), not an edge case.
  const db = await getDb();
  if (!db) return null;
  const courseRows = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);
  const course = courseRows[0];
  if (!course) return null;
  // Published courses are visible to everyone, same as before. An
  // unpublished (draft/archived) course is visible ONLY as a preview to
  // the teacher/institution who owns it or to an admin — never to a
  // random visitor, and never based on a client-supplied flag, only on
  // who is actually asking.
  const canPreview =
    viewer && (viewer.role === "admin" || viewer.id === course.ownerId);
  if (course.isPublished !== 1 && !canPreview) return null;
  const courseUnits = await db
    .select()
    .from(units)
    .where(eq(units.courseId, course.id))
    .orderBy(units.orderIndex);
  const curriculum = await Promise.all(
    courseUnits.map(async unit => ({
      ...unit,
      lessons: await db
        .select({
          id: lessons.id,
          unitId: lessons.unitId,
          orderIndex: lessons.orderIndex,
          titleAr: lessons.titleAr,
          titleFr: lessons.titleFr,
          titleEn: lessons.titleEn,
          type: lessons.type,
          durationMinutes: lessons.durationMinutes,
          liveStartsAt: lessons.liveStartsAt,
        })
        .from(lessons)
        .where(eq(lessons.unitId, unit.id))
        .orderBy(lessons.orderIndex),
    }))
  );
  return { course, units: curriculum };
}

async function getOrderedCourseLessonIds(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  courseId: number
): Promise<number[]> {
  const rows = await db
    .select({
      lessonId: lessons.id,
      unitOrder: units.orderIndex,
      lessonOrder: lessons.orderIndex,
    })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .where(eq(units.courseId, courseId))
    .orderBy(units.orderIndex, lessons.orderIndex);
  return rows.map(row => row.lessonId);
}

export async function isLessonLocked(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  courseId: number,
  lessonId: number
): Promise<boolean> {
  const orderedIds = await getOrderedCourseLessonIds(db, courseId);
  const index = orderedIds.indexOf(lessonId);
  if (index <= 0) return false;
  const previousLessonId = orderedIds[index - 1];
  const previousProgress = await db
    .select({ completed: lessonProgress.completed })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, previousLessonId)
      )
    )
    .limit(1);
  return !previousProgress[0] || previousProgress[0].completed !== 1;
}

export async function getLessonForLearner(lessonId: number, userId: number) {
    return getLessonForLearnerMysql(lessonId, userId);
}

async function getLessonForLearnerMysql(lessonId: number, userId: number) {
  const db = await getDb();
  if (!db) return { access: "unavailable" as const };
  const rows = await db
    .select({
      lesson: lessons,
      courseId: courses.id,
      courseSlug: courses.slug,
      isCoursePublished: courses.isPublished,
      isCourseFree: courses.isFree,
    })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const row = rows[0];
  if (!row || !row.courseId || row.isCoursePublished !== 1)
    return { access: "not_found" as const };
  const enrolled = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, row.courseId)
      )
    )
    .limit(1);
  if (!enrolled.length)
    return { access: "not_enrolled" as const, courseSlug: row.courseSlug };
  const eligible =
    row.isCourseFree === 1 || (await hasActiveSubscription(userId));
  if (!eligible)
    return {
      access: "subscription_required" as const,
      courseSlug: row.courseSlug,
    };
  const orderedIds = await getOrderedCourseLessonIds(db, row.courseId);
  const index = orderedIds.indexOf(lessonId);
  const locked = await isLessonLocked(db, userId, row.courseId, lessonId);
  const assets = locked ? [] : await getLessonAssets(lessonId, userId);
  const progressRows = await db
    .select({
      completed: lessonProgress.completed,
      lastPositionSeconds: lessonProgress.lastPositionSeconds,
      studySeconds: lessonProgress.studySeconds,
    })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .limit(1);
  // While locked, only expose safe metadata (title/type/duration) — never the
  // lesson body or the live-session link — even though the learner is
  // otherwise entitled to the course.
  const lesson = locked
    ? {
        id: row.lesson.id,
        unitId: row.lesson.unitId,
        orderIndex: row.lesson.orderIndex,
        titleAr: row.lesson.titleAr,
        titleFr: row.lesson.titleFr,
        titleEn: row.lesson.titleEn,
        type: row.lesson.type,
        durationMinutes: row.lesson.durationMinutes,
        content: null,
        liveUrl: null,
        liveStartsAt: null,
        createdAt: row.lesson.createdAt,
      }
    : row.lesson;
  return {
    access: "ok" as const,
    locked,
    lesson,
    courseSlug: row.courseSlug,
    assets,
    progress: progressRows[0] ?? null,
    index,
    total: orderedIds.length,
    previousLessonId: index > 0 ? orderedIds[index - 1] : null,
    nextLessonId:
      index >= 0 && index < orderedIds.length - 1
        ? orderedIds[index + 1]
        : null,
  };
}

export async function getCourseProgressForLearner(
  userId: number,
  courseId: number
) {
    const db = await getDb();
  if (!db)
    return {
      enrolled: false,
      lessons: [] as { lessonId: number; completed: boolean }[],
    };
  const enrolled = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    )
    .limit(1);
  if (!enrolled.length)
    return {
      enrolled: false,
      lessons: [] as { lessonId: number; completed: boolean }[],
    };
  const courseLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .where(eq(units.courseId, courseId));
  const progressRows = courseLessons.length
    ? await db
        .select({
          lessonId: lessonProgress.lessonId,
          completed: lessonProgress.completed,
        })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            inArray(
              lessonProgress.lessonId,
              courseLessons.map(lesson => lesson.id)
            )
          )
        )
    : [];
  const completedSet = new Set(
    progressRows.filter(row => row.completed === 1).map(row => row.lessonId)
  );
  return {
    enrolled: true,
    lessons: courseLessons.map(lesson => ({
      lessonId: lesson.id,
      completed: completedSet.has(lesson.id),
    })),
  };
}
