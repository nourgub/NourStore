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
  lessonProgress,
  lessonAssets,
  lessons,
  userSubscriptions,
  quizAttempts,
  units,
  subjects,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { computeProgressPercent, isCourseComplete } from "../courseProgress";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { validateUploadBytes } from "../uploadValidation";
import { storagePut } from "../storage";
import { issueCertificate } from "./certificates";
import { awardPoints, checkAndAwardBadges } from "./gamification";
import { createNotification } from "./notifications";

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

export async function getUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, userId))
    .orderBy(desc(courseEnrollments.updatedAt));
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

export async function createUnit(input: {
  courseId: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  orderIndex: number;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionFr?: string;
  descriptionEn?: string;
}) {
    const db = await getDb();
  if (!db) return undefined;
  const owned = await db
    .select({ id: courses.id })
    .from(courses)
    .where(ownerWhere(input.courseId, input.role, input.userId))
    .limit(1);
  if (!owned.length) return undefined;
  const { role: _role, userId: _userId, ...unit } = input;
  return db.insert(units).values(unit);
}

export async function createLesson(input: {
  unitId: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  orderIndex: number;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  type: "video" | "article" | "exercise" | "live";
  durationMinutes?: number;
  liveUrl?: string;
  liveStartsAt?: number;
  content?: string;
}) {
    const db = await getDb();
  if (!db) return undefined;
  const owned = await db
    .select({
      id: units.id,
      courseId: units.courseId,
      coursePublished: courses.isPublished,
    })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(units.id, input.unitId),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!owned.length) return undefined;
  const { role: _role, userId: _userId, ...lesson } = input;
  const result = await db
    .insert(lessons)
    .values({ ...lesson, durationMinutes: input.durationMinutes ?? 0 });
  // Notify already-enrolled learners when a new lesson lands in a course they're already taking.
  if (owned[0].coursePublished === 1 && owned[0].courseId) {
    const enrolledLearners = await db
      .select({ userId: courseEnrollments.userId })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, owned[0].courseId));
    for (const learner of enrolledLearners)
      await createNotification({
        userId: learner.userId,
        type: "lesson_published",
        title: "notifications.lessonPublished",
        body: input.titleAr,
      });
  }
  return result;
}

export async function createCourse(input: {
  ownerId: number;
  slug: string;
  subject: string;
  level:
    | "starter"
    | "foundation"
    | "intermediate"
    | "advanced"
    | "exam"
    | "professional";
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  objectivesAr?: string[];
  objectivesFr?: string[];
  objectivesEn?: string[];
  prerequisitesAr?: string[];
  prerequisitesFr?: string[];
  prerequisitesEn?: string[];
  targetAudienceAr?: string;
  targetAudienceFr?: string;
  targetAudienceEn?: string;
}): Promise<
  { ok: true } | { ok: false; reason: "invalid_subject" | "unavailable" }
> {
    const db = await getDb();
  if (!db) return { ok: false, reason: "unavailable" };
  // subject is validated against the real, admin-managed catalog instead of
  // a fixed SQL enum — this is exactly what lets an admin add a new subject
  // (e.g. physics) from the UI without a code/schema change.
  const subjectRows = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.slug, input.subject), eq(subjects.isActive, 1)))
    .limit(1);
  if (!subjectRows.length) return { ok: false, reason: "invalid_subject" };
  const {
    objectivesAr,
    objectivesFr,
    objectivesEn,
    prerequisitesAr,
    prerequisitesFr,
    prerequisitesEn,
    ...rest
  } = input;
  await db.insert(courses).values({
    ...rest,
    isPublished: 0,
    unitCount: 0,
    durationMinutes: 0,
    objectivesAr: objectivesAr?.length ? JSON.stringify(objectivesAr) : null,
    objectivesFr: objectivesFr?.length ? JSON.stringify(objectivesFr) : null,
    objectivesEn: objectivesEn?.length ? JSON.stringify(objectivesEn) : null,
    prerequisitesAr: prerequisitesAr?.length
      ? JSON.stringify(prerequisitesAr)
      : null,
    prerequisitesFr: prerequisitesFr?.length
      ? JSON.stringify(prerequisitesFr)
      : null,
    prerequisitesEn: prerequisitesEn?.length
      ? JSON.stringify(prerequisitesEn)
      : null,
  });
  return { ok: true };
}

export async function getManagedCurriculum(
  courseId: number,
  role: "teacher" | "institution" | "admin",
  userId: number
) {
  const db = await getDb();
  if (!db) return { course: undefined, units: [] };
  const courseRows = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        role === "admin" ? undefined : eq(courses.ownerId, userId)
      )
    )
    .limit(1);
  const course = courseRows[0];
  if (!course) return { course: undefined, units: [] };
  const courseUnits = await db
    .select()
    .from(units)
    .where(eq(units.courseId, courseId))
    .orderBy(units.orderIndex);
  const curriculum = await Promise.all(
    courseUnits.map(async unit => ({
      ...unit,
      lessons: await db
        .select()
        .from(lessons)
        .where(eq(lessons.unitId, unit.id))
        .orderBy(lessons.orderIndex),
    }))
  );
  return { course, units: curriculum };
}

function ownerWhere(
  courseId: number,
  role: "teacher" | "institution" | "admin",
  userId: number
) {
  return role === "admin"
    ? eq(courses.id, courseId)
    : and(eq(courses.id, courseId), eq(courses.ownerId, userId));
}

export async function updateManagedCourse(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  level:
    | "starter"
    | "foundation"
    | "intermediate"
    | "advanced"
    | "exam"
    | "professional";
  objectivesAr?: string[];
  objectivesFr?: string[];
  objectivesEn?: string[];
  prerequisitesAr?: string[];
  prerequisitesFr?: string[];
  prerequisitesEn?: string[];
  targetAudienceAr?: string;
  targetAudienceFr?: string;
  targetAudienceEn?: string;
}) {
  const db = await getDb();
  if (!db) return false;
  const owned = await db
    .select({ id: courses.id })
    .from(courses)
    .where(ownerWhere(input.id, input.role, input.userId))
    .limit(1);
  if (!owned.length) return false;
  const toJsonOrNull = (list?: string[]) =>
    list?.length ? JSON.stringify(list) : null;
  await db
    .update(courses)
    .set({
      titleAr: input.titleAr,
      titleFr: input.titleFr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr,
      descriptionFr: input.descriptionFr,
      descriptionEn: input.descriptionEn,
      level: input.level,
      // Only touched when the caller actually sent a value for these —
      // omitting the key (not `null`) so an edit that only changes the
      // title, say, can never silently wipe objectives/prerequisites that
      // were set in a previous, separate edit.
      ...(input.objectivesAr !== undefined && {
        objectivesAr: toJsonOrNull(input.objectivesAr),
      }),
      ...(input.objectivesFr !== undefined && {
        objectivesFr: toJsonOrNull(input.objectivesFr),
      }),
      ...(input.objectivesEn !== undefined && {
        objectivesEn: toJsonOrNull(input.objectivesEn),
      }),
      ...(input.prerequisitesAr !== undefined && {
        prerequisitesAr: toJsonOrNull(input.prerequisitesAr),
      }),
      ...(input.prerequisitesFr !== undefined && {
        prerequisitesFr: toJsonOrNull(input.prerequisitesFr),
      }),
      ...(input.prerequisitesEn !== undefined && {
        prerequisitesEn: toJsonOrNull(input.prerequisitesEn),
      }),
      ...(input.targetAudienceAr !== undefined && {
        targetAudienceAr: input.targetAudienceAr || null,
      }),
      ...(input.targetAudienceFr !== undefined && {
        targetAudienceFr: input.targetAudienceFr || null,
      }),
      ...(input.targetAudienceEn !== undefined && {
        targetAudienceEn: input.targetAudienceEn || null,
      }),
    })
    .where(eq(courses.id, input.id));
  return true;
}

export async function deleteManagedCourse(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
}): Promise<
  { ok: true } | { ok: false; reason: "not_found" | "has_learner_data" }
> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const owned = await db
    .select({ id: courses.id })
    .from(courses)
    .where(ownerWhere(input.id, input.role, input.userId))
    .limit(1);
  if (!owned.length) return { ok: false, reason: "not_found" };
  // A course a real learner has ever enrolled in carries real progress,
  // certificates, and payment history — deleting it out from under them
  // would either silently orphan/destroy that history or hit a foreign-key
  // error the admin never gets an explanation for. Archiving (unpublishing)
  // is the safe path once real learners are involved; hard delete stays
  // available only for genuinely untouched draft content.
  const enrolled = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.courseId, input.id))
    .limit(1);
  if (enrolled.length) return { ok: false, reason: "has_learner_data" };
  const courseUnits = await db
    .select({ id: units.id })
    .from(units)
    .where(eq(units.courseId, input.id));
  if (courseUnits.length)
    await db.delete(lessons).where(
      inArray(
        lessons.unitId,
        courseUnits.map(unit => unit.id)
      )
    );
  await db.delete(units).where(eq(units.courseId, input.id));
  await db.delete(courses).where(eq(courses.id, input.id));
  return { ok: true };
}

export async function deleteManagedUnit(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
}): Promise<
  { ok: true } | { ok: false; reason: "not_found" | "has_learner_data" }
> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select({ unitId: units.id })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(units.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!rows.length) return { ok: false, reason: "not_found" };
  const unitLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.unitId, input.id));
  if (unitLessons.length) {
    const touched = await db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(
        inArray(
          lessonProgress.lessonId,
          unitLessons.map(lesson => lesson.id)
        )
      )
      .limit(1);
    if (touched.length) return { ok: false, reason: "has_learner_data" };
  }
  await db.delete(lessons).where(eq(lessons.unitId, input.id));
  await db.delete(units).where(eq(units.id, input.id));
  return { ok: true };
}

export async function uploadLessonAsset(input: {
  lessonId: number;
  uploaderId: number;
  role: "teacher" | "institution" | "admin";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: string;
}): Promise<
  | { fileName: string; url: string; mimeType: string; sizeBytes: number }
  | { ok: false; reason: string }
> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "unavailable" };
  const rows = await db
    .select({ lessonId: lessons.id })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(lessons.id, input.lessonId),
        input.role === "admin"
          ? undefined
          : eq(courses.ownerId, input.uploaderId)
      )
    )
    .limit(1);
  if (!rows.length) return { ok: false, reason: "not_found" };
  const bytes = Buffer.from(input.data, "base64");
  const validation = validateUploadBytes({
    fileName: input.fileName,
    mimeType: input.mimeType,
    declaredSizeBytes: input.sizeBytes,
    decodedByteLength: bytes.length,
    bytes,
  });
  if (!validation.ok) return validation;
  const safeName =
    input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) ||
    "lesson-file";
  const uploaded = await storagePut(
    `lessons/${input.lessonId}/${safeName}`,
    bytes,
    input.mimeType
  );
  await db
    .insert(lessonAssets)
    .values({
      lessonId: input.lessonId,
      uploaderId: input.uploaderId,
      fileName: input.fileName.slice(0, 255),
      storageKey: uploaded.key,
      url: uploaded.url,
      mimeType: input.mimeType,
      sizeBytes: bytes.length,
    });
  return {
    fileName: input.fileName,
    url: uploaded.url,
    mimeType: input.mimeType,
    sizeBytes: bytes.length,
  };
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

export async function reorderManagedUnit(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  direction: "up" | "down";
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "edge" }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select({
      id: units.id,
      courseId: units.courseId,
      orderIndex: units.orderIndex,
    })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(units.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, reason: "not_found" };
  const siblings = await db
    .select({ id: units.id, orderIndex: units.orderIndex })
    .from(units)
    .where(eq(units.courseId, current.courseId))
    .orderBy(units.orderIndex);
  const idx = siblings.findIndex(s => s.id === current.id);
  const swapWithIdx = input.direction === "up" ? idx - 1 : idx + 1;
  if (swapWithIdx < 0 || swapWithIdx >= siblings.length)
    return { ok: false, reason: "edge" }; // already first/last — nothing to swap with
  const swapWith = siblings[swapWithIdx];
  await db
    .update(units)
    .set({ orderIndex: swapWith.orderIndex })
    .where(eq(units.id, current.id));
  await db
    .update(units)
    .set({ orderIndex: current.orderIndex })
    .where(eq(units.id, swapWith.id));
  return { ok: true };
}

export async function reorderManagedLesson(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  direction: "up" | "down";
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "edge" }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select({
      id: lessons.id,
      unitId: lessons.unitId,
      orderIndex: lessons.orderIndex,
    })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(lessons.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, reason: "not_found" };
  const siblings = await db
    .select({ id: lessons.id, orderIndex: lessons.orderIndex })
    .from(lessons)
    .where(eq(lessons.unitId, current.unitId))
    .orderBy(lessons.orderIndex);
  const idx = siblings.findIndex(s => s.id === current.id);
  const swapWithIdx = input.direction === "up" ? idx - 1 : idx + 1;
  if (swapWithIdx < 0 || swapWithIdx >= siblings.length)
    return { ok: false, reason: "edge" };
  const swapWith = siblings[swapWithIdx];
  await db
    .update(lessons)
    .set({ orderIndex: swapWith.orderIndex })
    .where(eq(lessons.id, current.id));
  await db
    .update(lessons)
    .set({ orderIndex: current.orderIndex })
    .where(eq(lessons.id, swapWith.id));
  return { ok: true };
}

export async function updateManagedUnit(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  titleAr: string;
  titleFr: string;
  titleEn: string;
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ unitId: units.id })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(units.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!rows.length) return false;
  await db
    .update(units)
    .set({
      titleAr: input.titleAr,
      titleFr: input.titleFr,
      titleEn: input.titleEn,
    })
    .where(eq(units.id, input.id));
  return true;
}

export async function updateManagedLesson(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  type?: "video" | "article" | "exercise" | "live";
  liveUrl?: string | null;
  liveStartsAt?: number | null;
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ lessonId: lessons.id })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(lessons.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!rows.length) return false;
  await db
    .update(lessons)
    .set({
      titleAr: input.titleAr,
      titleFr: input.titleFr,
      titleEn: input.titleEn,
      ...(input.type ? { type: input.type } : {}),
      ...(input.liveUrl !== undefined
        ? { liveUrl: input.liveUrl || null }
        : {}),
      ...(input.liveStartsAt !== undefined
        ? { liveStartsAt: input.liveStartsAt || null }
        : {}),
    })
    .where(eq(lessons.id, input.id));
  return true;
}

/**
 * Narrow sibling of updateManagedLesson — sets only liveUrl/liveStartsAt
 * (and the lesson type, always "live") without requiring the caller to
 * re-supply the title fields updateManagedLesson mandates. Used by
 * teacher.createLiveSession once a Google Meet link has been generated.
 */
export async function setLessonLiveSession(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  liveUrl: string;
  liveStartsAt: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ lessonId: lessons.id })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(lessons.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!rows.length) return false;
  await db
    .update(lessons)
    .set({
      type: "live",
      liveUrl: input.liveUrl,
      liveStartsAt: input.liveStartsAt,
    })
    .where(eq(lessons.id, input.id));
  return true;
}

export async function deleteManagedLesson(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
}): Promise<
  { ok: true } | { ok: false; reason: "not_found" | "has_learner_data" }
> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select({ lessonId: lessons.id })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(lessons.id, input.id),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!rows.length) return { ok: false, reason: "not_found" };
  const touched = await db
    .select({ id: lessonProgress.id })
    .from(lessonProgress)
    .where(eq(lessonProgress.lessonId, input.id))
    .limit(1);
  if (touched.length) return { ok: false, reason: "has_learner_data" };
  await db.delete(lessons).where(eq(lessons.id, input.id));
  return { ok: true };
}

export async function setCoursePublished(
  courseId: number,
  isPublished: boolean
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_found" | "no_content" }
> {
  // Router-level adminProcedure already restricts this to admins — no extra ownership check needed here in either mode.
    const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const existing = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!existing.length) return { ok: false, reason: "not_found" };
  if (isPublished) {
    // A course with zero real lessons would appear in the public catalog
    // as a clickable, empty dead end — this is the exact "no-op content"
    // the pre-launch checklist forbids. At least one real lesson, in at
    // least one unit, is the minimum bar for "has basic content".
    const lessonRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .leftJoin(units, eq(units.id, lessons.unitId))
      .where(eq(units.courseId, courseId))
      .limit(1);
    if (!lessonRows.length) return { ok: false, reason: "no_content" };
  }
  await db
    .update(courses)
    .set({
      isPublished: isPublished ? 1 : 0,
      status: isPublished ? "published" : "draft",
    })
    .where(eq(courses.id, courseId));
  return { ok: true };
}

export async function archiveManagedCourse(
  courseId: number
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  // A distinct third state from "draft": archiving is for a course that
  // was live and is being deliberately retired (e.g. content outdated,
  // superseded by a new edition) — not "never finished authoring". Same
  // effect as unpublishing on isPublished (still 0, still invisible to
  // learners) so nothing else needs to change to stay correct; only the
  // admin list needs to tell the two apart.
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const existing = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!existing.length) return { ok: false, reason: "not_found" };
  await db
    .update(courses)
    .set({ isPublished: 0, status: "archived" })
    .where(eq(courses.id, courseId));
  return { ok: true };
}

export async function enrollInCourse(input: {
  userId: number;
  courseId: number;
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
  if (course.isFree !== 1 && !(await hasActiveSubscription(input.userId))) {
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
  const db = await getDb();
  if (!db) return undefined;
  const courseRows = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);
  const course = courseRows[0];
  if (!course) return undefined;
  // Published courses are visible to everyone, same as before. An
  // unpublished (draft/archived) course is visible ONLY as a preview to
  // the teacher/institution who owns it or to an admin — never to a
  // random visitor, and never based on a client-supplied flag, only on
  // who is actually asking.
  const canPreview =
    viewer && (viewer.role === "admin" || viewer.id === course.ownerId);
  if (course.isPublished !== 1 && !canPreview) return undefined;
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

async function isLessonLocked(
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
