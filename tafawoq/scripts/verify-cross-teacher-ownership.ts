// Real-database verification script for cross-teacher content ownership —
// the exact gap flagged in AUDIT.md's Phase 8 section: "a negative case
// (teacher B attempting to edit teacher A's content, expecting a clean
// rejection) was not explicitly scripted". This closes it for real, against
// live MySQL and live rows, not a mocked assertion.
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db npx tsx scripts/verify-cross-teacher-ownership.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, courses, units, lessons } from "../drizzle/schema";
import {
  createCourse,
  createUnit,
  createLesson,
  updateManagedCourse,
  deleteManagedCourse,
  updateManagedUnit,
  deleteManagedUnit,
  updateManagedLesson,
  deleteManagedLesson,
  createManagedQuiz,
} from "../server/db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);

  console.log("1. Seeding two teachers, A (owner) and B (attacker)...");
  const tag = Date.now();
  await db.insert(users).values({ openId: `verify-teacher-a-${tag}`, name: "Teacher A", email: `teacher-a-${tag}@example.com`, role: "teacher" });
  await db.insert(users).values({ openId: `verify-teacher-b-${tag}`, name: "Teacher B", email: `teacher-b-${tag}@example.com`, role: "teacher" });
  const teacherA = (await db.select().from(users).where(eq(users.openId, `verify-teacher-a-${tag}`)).limit(1))[0];
  const teacherB = (await db.select().from(users).where(eq(users.openId, `verify-teacher-b-${tag}`)).limit(1))[0];
  assert(teacherA && teacherB, "both teachers must exist after seeding");

  console.log("2. Teacher A creates a course with one unit and one lesson...");
  const slug = `ownership-course-${tag}`;
  const created = await createCourse({
    ownerId: teacherA.id, slug, subject: "math", level: "starter",
    titleAr: "دورة أ", titleFr: "Cours A", titleEn: "Course A",
    descriptionAr: "وصف", descriptionFr: "desc", descriptionEn: "desc",
  });
  assert(created.ok, `Teacher A's course creation must succeed: ${JSON.stringify(created)}`);
  const course = (await db.select().from(courses).where(eq(courses.slug, slug)).limit(1))[0];
  assert(course && course.ownerId === teacherA.id, "course must exist and be owned by Teacher A");

  const unitCreated = await createUnit({ courseId: course.id, role: "teacher", userId: teacherA.id, orderIndex: 0, titleAr: "الوحدة", titleFr: "Unité", titleEn: "Unit" });
  assert(unitCreated, "Teacher A's unit creation must succeed on her own course");
  const unit = (await db.select().from(units).where(eq(units.courseId, course.id)).limit(1))[0];
  assert(unit, "unit must exist");

  const lessonCreated = await createLesson({ unitId: unit.id, role: "teacher", userId: teacherA.id, orderIndex: 0, type: "article", titleAr: "درس", titleFr: "Leçon", titleEn: "Lesson" });
  assert(lessonCreated, "Teacher A's lesson creation must succeed on her own unit");
  const lesson = (await db.select().from(lessons).where(eq(lessons.unitId, unit.id)).limit(1))[0];
  assert(lesson, "lesson must exist");

  const originalCourseTitle = course.titleEn;
  const originalUnitTitle = unit.titleEn;
  const originalLessonTitle = lesson.titleEn;

  console.log("3. Teacher B (not the owner) attempts to edit/delete every level of Teacher A's content...");

  const courseUpdateResult = await updateManagedCourse({
    id: course.id, role: "teacher", userId: teacherB.id,
    titleAr: "مخترق", titleFr: "Piraté", titleEn: "HACKED",
    descriptionAr: "x", descriptionFr: "x", descriptionEn: "x", level: "starter",
  });
  assert(courseUpdateResult === false, `updateManagedCourse must cleanly return false for a non-owner, got: ${courseUpdateResult}`);

  const unitUpdateResult = await updateManagedUnit({ id: unit.id, role: "teacher", userId: teacherB.id, titleAr: "مخترق", titleFr: "Piraté", titleEn: "HACKED" });
  assert(unitUpdateResult === false, `updateManagedUnit must cleanly return false for a non-owner, got: ${unitUpdateResult}`);

  const lessonUpdateResult = await updateManagedLesson({ id: lesson.id, role: "teacher", userId: teacherB.id, titleAr: "مخترق", titleFr: "Piraté", titleEn: "HACKED" });
  assert(lessonUpdateResult === false, `updateManagedLesson must cleanly return false for a non-owner, got: ${lessonUpdateResult}`);

  const quizCreateResult = await createManagedQuiz({ unitId: unit.id, role: "teacher", userId: teacherB.id, passScore: 60, maxAttempts: 3 });
  assert(quizCreateResult === undefined, `createManagedQuiz must cleanly return undefined for a non-owner, got: ${JSON.stringify(quizCreateResult)}`);

  const lessonDeleteResult = await deleteManagedLesson({ id: lesson.id, role: "teacher", userId: teacherB.id });
  assert(lessonDeleteResult === false, `deleteManagedLesson must cleanly return false for a non-owner, got: ${lessonDeleteResult}`);

  const unitDeleteResult = await deleteManagedUnit({ id: unit.id, role: "teacher", userId: teacherB.id });
  assert(unitDeleteResult === false, `deleteManagedUnit must cleanly return false for a non-owner, got: ${unitDeleteResult}`);

  const courseDeleteResult = await deleteManagedCourse({ id: course.id, role: "teacher", userId: teacherB.id });
  assert(courseDeleteResult === false, `deleteManagedCourse must cleanly return false for a non-owner, got: ${courseDeleteResult}`);

  console.log("4. Re-reading from the real database to confirm NOTHING was actually modified or deleted...");
  const courseAfter = (await db.select().from(courses).where(eq(courses.id, course.id)).limit(1))[0];
  const unitAfter = (await db.select().from(units).where(eq(units.id, unit.id)).limit(1))[0];
  const lessonAfter = (await db.select().from(lessons).where(eq(lessons.id, lesson.id)).limit(1))[0];
  assert(courseAfter, "course must still exist (not deleted by Teacher B)");
  assert(unitAfter, "unit must still exist (not deleted by Teacher B)");
  assert(lessonAfter, "lesson must still exist (not deleted by Teacher B)");
  assert(courseAfter.titleEn === originalCourseTitle, `course title must be unchanged, got: "${courseAfter.titleEn}"`);
  assert(unitAfter.titleEn === originalUnitTitle, `unit title must be unchanged, got: "${unitAfter.titleEn}"`);
  assert(lessonAfter.titleEn === originalLessonTitle, `lesson title must be unchanged, got: "${lessonAfter.titleEn}"`);

  console.log("5. Sanity check: Teacher A (the real owner) CAN still edit her own content...");
  const legitimateUpdate = await updateManagedCourse({
    id: course.id, role: "teacher", userId: teacherA.id,
    titleAr: "محدّث", titleFr: "Mis à jour", titleEn: "Updated by owner",
    descriptionAr: "x", descriptionFr: "x", descriptionEn: "x", level: "starter",
  });
  assert(legitimateUpdate === true, "the real owner's update must succeed");
  const courseAfterOwnerEdit = (await db.select().from(courses).where(eq(courses.id, course.id)).limit(1))[0];
  assert(courseAfterOwnerEdit.titleEn === "Updated by owner", "the owner's edit must actually be persisted");

  console.log("\n✅ ALL 9 ASSERTIONS PASSED — cross-teacher ownership is enforced end-to-end against real MySQL:");
  console.log("   - Non-owner blocked from: course update, unit update, lesson update, quiz creation,");
  console.log("     lesson delete, unit delete, course delete (7 clean rejections, no crashes, no silent success)");
  console.log("   - Real owner's legitimate edit still works");
  console.log("   - Attacked rows verified unchanged by re-reading the real database");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
