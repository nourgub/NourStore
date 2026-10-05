// Real-database verification script for the full brief-mandated flow:
// login (simulated) → create course/unit/lesson/quiz → publish → enroll →
// complete lesson → pass unit quiz → issue certificate → verify.
//
// This is NOT part of `pnpm test` (it requires a real MySQL DATABASE_URL and
// mutates real rows) — it's a one-off, repeatable script for exactly the
// gap flagged in AUDIT.md's Phase 8 section: proving the DB-backed logic
// works against real schema/constraints, not just the router contract shape.
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db npx tsx scripts/verify-real-flow.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, courses, units, lessons, unitQuizzes } from "../drizzle/schema";
import {
  createCourse,
  createUnit,
  createLesson,
  createManagedQuiz,
  createManagedQuizQuestion,
  setCoursePublished,
  enrollInCourse,
  updateLessonProgress,
  getUnitQuizWithQuestions,
  submitQuizAttempt,
  getUserCertificates,
  verifyCertificate,
  createSubject,
  getActiveSubjects,
} from "../server/db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);

  console.log("1. Seeding a teacher (owner) and a learner...");
  await db.insert(users).values({ openId: "verify-teacher", name: "Verify Teacher", email: "verify-teacher@example.com", role: "teacher" });
  const teacher = (await db.select().from(users).where(eq(users.openId, "verify-teacher")).limit(1))[0];
  await db.insert(users).values({ openId: "verify-learner", name: "Verify Learner", email: "verify-learner@example.com", role: "learner" });
  const learner = (await db.select().from(users).where(eq(users.openId, "verify-learner")).limit(1))[0];
  assert(teacher && learner, "seed users must exist");

  console.log("2. Creating a free course with one unit, one lesson, one quiz question...");
  const slug = `verify-course-${Date.now()}`;
  const courseCreated = await createCourse({ ownerId: teacher.id, slug, subject: "math", level: "starter", titleAr: "دورة تحقق", titleFr: "Cours de vérif", titleEn: "Verify course", descriptionAr: "وصف", descriptionFr: "desc", descriptionEn: "desc" });
  assert(courseCreated.ok, `course creation must succeed against the real subjects catalog: ${JSON.stringify(courseCreated)}`);
  const course = (await db.select().from(courses).where(eq(courses.slug, slug)).limit(1))[0];
  assert(course, "course must exist after creation");
  await db.update(courses).set({ isFree: 1 }).where(eq(courses.id, course.id));

  const unitCreated = await createUnit({ courseId: course.id, role: "teacher", userId: teacher.id, orderIndex: 0, titleAr: "الوحدة الأولى", titleFr: "Unité 1", titleEn: "Unit 1" });
  assert(unitCreated, "unit creation must succeed for the owning teacher");
  const unit = (await db.select().from(units).where(eq(units.courseId, course.id)).limit(1))[0];
  assert(unit, "unit must exist after creation");
  const unitId = unit.id;

  const lessonCreated = await createLesson({ unitId, role: "teacher", userId: teacher.id, orderIndex: 0, titleAr: "الدرس الأول", titleFr: "Leçon 1", titleEn: "Lesson 1", type: "article", content: "محتوى الدرس" });
  assert(lessonCreated, "lesson creation must succeed");
  const lesson = (await db.select().from(lessons).where(eq(lessons.unitId, unitId)).limit(1))[0];
  assert(lesson, "lesson must exist after creation");
  const lessonId = lesson.id;

  const quizCreated = await createManagedQuiz({ unitId, role: "teacher", userId: teacher.id, passScore: 50, maxAttempts: 3 });
  assert(quizCreated, "quiz creation must succeed");
  const quizRow = (await db.select().from(unitQuizzes).where(eq(unitQuizzes.unitId, unitId)).limit(1))[0];
  assert(quizRow, "quiz row must exist after creation");
  const quizId = quizRow.id;

  await createManagedQuizQuestion({ quizId, role: "teacher", userId: teacher.id, questionType: "choice", promptAr: "س", promptFr: "q", promptEn: "q", optionsJson: JSON.stringify(["A", "B"]), answerKey: "A", orderIndex: 0 });

  console.log("3. Publishing the course...");
  const published = await setCoursePublished(course.id, true, "teacher", teacher.id);
  assert(published, "publishing must succeed for the owning teacher");

  console.log("4. Enrolling the learner (real enrollInCourse call)...");
  const enrollment = await enrollInCourse({ userId: learner.id, courseId: course.id });
  assert(enrollment.ok, `enrollment must succeed: ${JSON.stringify(enrollment)}`);

  console.log("5. Completing the one lesson...");
  const progress = await updateLessonProgress({ userId: learner.id, lessonId, completed: true, lastPositionSeconds: 10 });
  assert(progress.ok, `lesson completion must succeed: ${JSON.stringify(progress)}`);
  assert((progress as { progressPercent: number }).progressPercent === 100, "single-lesson course must reach 100% on completion");

  console.log("6. Submitting the unit quiz with the correct answer...");
  const quizData = await getUnitQuizWithQuestions(unitId);
  assert(quizData.quiz, "quiz must be readable server-side");
  const attempt = await submitQuizAttempt({ quiz: { id: quizData.quiz!.id, passScore: quizData.quiz!.passScore, maxAttempts: quizData.quiz!.maxAttempts, kind: "unit_quiz" }, questions: quizData.questions, userId: learner.id, answers: { "0": "A" } });
  assert(attempt.ok && attempt.passed, `quiz attempt must pass: ${JSON.stringify(attempt)}`);

  console.log("7. Checking certificate issuance (course has no final exam, so lesson completion alone should trigger it)...");
  const certificates = await getUserCertificates(learner.id);
  assert(certificates.length === 1, `expected exactly one certificate, got ${certificates.length}`);
  assert(certificates[0].courseId === course.id, "certificate must reference the completed course");

  console.log("8. Verifying the certificate via the public verify path...");
  const verification = await verifyCertificate(certificates[0].certificateId);
  assert(verification, "certificate must be publicly verifiable");
  assert(verification!.status === "active", "freshly issued certificate must be active");
  assert(verification!.studentName === "Verify Learner", "verification must report the correct learner name");

  console.log("\n✅ ALL REAL-DATABASE FLOW ASSERTIONS PASSED");
  console.log(`   Course: ${course.slug} | Certificate: ${certificates[0].certificateId}`);

  console.log("\n9. Verifying an admin can add a brand-new subject (e.g. physics) and immediately use it for a course...");
  const physicsSlug = `physics-${Date.now()}`;
  await createSubject({ slug: physicsSlug, icon: "atom", titleAr: "الفيزياء", titleFr: "Physique", titleEn: "Physics" });
  const activeSubjects = await getActiveSubjects();
  assert(activeSubjects.some((s) => s.slug === physicsSlug), "newly created subject must appear in the active subjects catalog");
  const physicsCourseResult = await createCourse({ ownerId: teacher.id, slug: `physics-course-${Date.now()}`, subject: physicsSlug, level: "starter", titleAr: "فيزياء", titleFr: "Physique", titleEn: "Physics", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d" });
  assert(physicsCourseResult.ok, `course creation under the new subject must succeed: ${JSON.stringify(physicsCourseResult)}`);
  const rejectedResult = await createCourse({ ownerId: teacher.id, slug: `bad-subject-${Date.now()}`, subject: "not-a-real-subject", level: "starter", titleAr: "x", titleFr: "x", titleEn: "x", descriptionAr: "x", descriptionFr: "x", descriptionEn: "x" });
  assert(!rejectedResult.ok && rejectedResult.reason === "invalid_subject", "course creation under a nonexistent subject must be cleanly rejected");

  console.log("\n✅ NEW SUBJECT FEATURE VERIFIED: an admin-added subject is immediately usable, and unknown subjects are still rejected");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ REAL-DATABASE FLOW VERIFICATION FAILED");
    console.error(error);
    process.exit(1);
  });
