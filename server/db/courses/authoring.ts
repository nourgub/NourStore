import { and, eq, inArray } from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  lessonAssets,
  lessonProgress,
  lessons,
  subjects,
  units,
} from "../../../drizzle/schema";
import { getDb } from "../shared";
import { validateUploadBytes } from "../../uploadValidation";
import { storagePut } from "../../storage";
import { createNotification } from "../notifications";

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
  stage: "primary" | "middle" | "secondary";
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
  stage: "primary" | "middle" | "secondary";
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
      stage: input.stage,
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

