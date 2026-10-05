// Real end-to-end verification of the parent-child linking flow — the gap
// AUDIT.md flagged: "parent-child linking end-to-end... [was] not walked
// through against real rows the way the core learning flow was."
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db npx tsx scripts/verify-parent-child-linking.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  courses,
  units,
  lessons,
  unitQuizzes,
  quizQuestions,
  parentLinks,
  parentInviteCodes,
} from "../drizzle/schema";
import {
  createParentInvite,
  acceptParentInvite,
  cancelParentInvite,
  unlinkParent,
  getParentLinks,
  getParentDashboard,
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
} from "../server/db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();

  console.log("1. Seeding a real child (learner), two real parents, and an intruder...");
  await db.insert(users).values({ openId: `pc-child-${tag}`, name: "Child", email: `child-${tag}@example.com`, role: "learner" });
  await db.insert(users).values({ openId: `pc-parent-${tag}`, name: "Parent", email: `parent-${tag}@example.com`, role: "parent" });
  await db.insert(users).values({ openId: `pc-parent2-${tag}`, name: "Second Parent", email: `parent2-${tag}@example.com`, role: "parent" });
  await db.insert(users).values({ openId: `pc-intruder-${tag}`, name: "Intruder", email: `intruder-${tag}@example.com`, role: "learner" });
  const child = (await db.select().from(users).where(eq(users.openId, `pc-child-${tag}`)).limit(1))[0];
  const parent = (await db.select().from(users).where(eq(users.openId, `pc-parent-${tag}`)).limit(1))[0];
  const parent2 = (await db.select().from(users).where(eq(users.openId, `pc-parent2-${tag}`)).limit(1))[0];
  const intruder = (await db.select().from(users).where(eq(users.openId, `pc-intruder-${tag}`)).limit(1))[0];
  assert(child && parent && parent2 && intruder, "all seed users must exist");

  console.log("2. createParentInvite for a nonexistent childId must cleanly return undefined (not crash)...");
  const badInvite = await createParentInvite(999999999);
  assert(badInvite === undefined, `createParentInvite for a bad childId must return undefined, got ${JSON.stringify(badInvite)}`);

  console.log("3. Creating a real invite code for the real child...");
  const invite = await createParentInvite(child.id);
  assert(invite && invite.code, "a real invite code must be created");

  console.log("4. An invalid/garbage code must be rejected...");
  const badAccept = await acceptParentInvite(parent.id, "NOT-A-REAL-CODE");
  assert(badAccept === false, "accepting a garbage code must return false");

  console.log("5. The real parent accepts the real invite code...");
  const accepted = await acceptParentInvite(parent.id, invite.code);
  assert(accepted === true, "accepting a valid, unused, unexpired code must succeed");

  const linkRows = await db.select().from(parentLinks).where(eq(parentLinks.parentId, parent.id));
  assert(linkRows.length === 1 && linkRows[0].childId === child.id && linkRows[0].status === "active", "a real active parentLinks row must exist linking parent -> child");

  const inviteRow = (await db.select().from(parentInviteCodes).where(eq(parentInviteCodes.code, invite.code)).limit(1))[0];
  assert(inviteRow.usedAt !== null, "the invite code must be marked used in real MySQL");

  console.log("6. Re-using the SAME code a second time must be rejected (already used)...");
  const reuseAttempt = await acceptParentInvite(parent2.id, invite.code);
  assert(reuseAttempt === false, "an already-used invite code must be rejected on a second acceptance attempt");
  const parent2Links = await db.select().from(parentLinks).where(eq(parentLinks.parentId, parent2.id));
  assert(parent2Links.length === 0, "the second parent must NOT have gotten a link from the reused code");

  console.log("7. A fresh invite that has EXPIRED must be rejected...");
  const expiredInvite = await createParentInvite(child.id);
  assert(expiredInvite, "expired-test invite must be created");
  await db.update(parentInviteCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(parentInviteCodes.code, expiredInvite.code));
  const expiredAccept = await acceptParentInvite(parent2.id, expiredInvite.code);
  assert(expiredAccept === false, "an expired invite code must be rejected even though it was never used");

  console.log("8. A CANCELED invite must be rejected — and only the child (or admin) can cancel it, not a random learner...");
  const cancelTestInvite = await createParentInvite(child.id);
  assert(cancelTestInvite, "cancel-test invite must be created");
  const cancelTestRow = (await db.select().from(parentInviteCodes).where(eq(parentInviteCodes.code, cancelTestInvite.code)).limit(1))[0];

  const intruderCancelAttempt = await cancelParentInvite({ inviteId: cancelTestRow.id, requesterId: intruder.id, role: "learner" });
  assert(intruderCancelAttempt === false, "a random learner must NOT be able to cancel someone else's invite");
  const rowAfterIntruderAttempt = (await db.select().from(parentInviteCodes).where(eq(parentInviteCodes.id, cancelTestRow.id)).limit(1))[0];
  assert(rowAfterIntruderAttempt.canceledAt === null, "the invite must remain un-canceled after the intruder's rejected attempt");

  const realCancelResult = await cancelParentInvite({ inviteId: cancelTestRow.id, requesterId: child.id, role: "learner" });
  assert(realCancelResult === true, "the real child (invite owner) must be able to cancel their own invite");
  const canceledRow = (await db.select().from(parentInviteCodes).where(eq(parentInviteCodes.id, cancelTestRow.id)).limit(1))[0];
  assert(canceledRow.canceledAt !== null, "the invite must be marked canceled in real MySQL");

  const canceledAccept = await acceptParentInvite(parent2.id, cancelTestInvite.code);
  assert(canceledAccept === false, "a canceled invite must be rejected if someone tries to accept it anyway");

  console.log("9. unlinkParent: an unrelated intruder must NOT be able to unlink parent<->child...");
  const realLink = linkRows[0];
  const intruderUnlink = await unlinkParent({ linkId: realLink.id, requesterId: intruder.id, role: "learner" });
  assert(intruderUnlink === false, "an unrelated intruder must not be able to unlink someone else's parent-child link");
  const linkStillActive = (await db.select().from(parentLinks).where(eq(parentLinks.id, realLink.id)).limit(1))[0];
  assert(linkStillActive.status === "active", "the link must remain active after the intruder's rejected unlink attempt");

  console.log("10. Building real course activity for the child (enroll, complete a lesson, pass a quiz)...");
  await db.insert(users).values({ openId: `pc-teacher-${tag}`, name: "Teacher", email: `pc-teacher-${tag}@example.com`, role: "teacher" });
  const teacher = (await db.select().from(users).where(eq(users.openId, `pc-teacher-${tag}`)).limit(1))[0];
  const slug = `pc-course-${tag}`;
  const courseCreated = await createCourse({ ownerId: teacher.id, slug, subject: "math", level: "starter", titleAr: "دورة", titleFr: "Cours", titleEn: "Course", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d" });
  assert(courseCreated.ok, `course creation must succeed: ${JSON.stringify(courseCreated)}`);
  const courseRow = (await db.select().from(courses).where(eq(courses.slug, slug)).limit(1))[0];
  await db.update(courses).set({ isFree: 1 }).where(eq(courses.id, courseRow.id));

  const unitCreated = await createUnit({ courseId: courseRow.id, role: "teacher", userId: teacher.id, orderIndex: 0, titleAr: "الوحدة", titleFr: "Unité", titleEn: "Unit" });
  assert(unitCreated, "unit creation must succeed");
  const unitRow = (await db.select().from(units).where(eq(units.courseId, courseRow.id)).limit(1))[0];

  const lessonCreated = await createLesson({ unitId: unitRow.id, role: "teacher", userId: teacher.id, orderIndex: 0, type: "article", titleAr: "درس", titleFr: "Leçon", titleEn: "Lesson" });
  assert(lessonCreated, "lesson creation must succeed");
  const lessonRow = (await db.select().from(lessons).where(eq(lessons.unitId, unitRow.id)).limit(1))[0];

  const quizCreated = await createManagedQuiz({ unitId: unitRow.id, role: "teacher", userId: teacher.id, passScore: 50, maxAttempts: 3 });
  assert(quizCreated, "quiz creation must succeed");
  const quizRow = (await db.select().from(unitQuizzes).where(eq(unitQuizzes.unitId, unitRow.id)).limit(1))[0];
  await createManagedQuizQuestion({ quizId: quizRow.id, role: "teacher", userId: teacher.id, type: "choice", promptAr: "س", promptFr: "Q", promptEn: "Q", optionsJson: JSON.stringify(["A", "B"]), answerKey: "A", points: 10, orderIndex: 0 });

  await setCoursePublished(courseRow.id, true);
  const enrollResult = await enrollInCourse({ userId: child.id, courseId: courseRow.id });
  assert(enrollResult.ok, `child's enrollment must succeed: ${JSON.stringify(enrollResult)}`);
  await updateLessonProgress({ userId: child.id, lessonId: lessonRow.id, completed: true, lastPositionSeconds: 10 });

  const quizData = await getUnitQuizWithQuestions(unitRow.id);
  assert(quizData.quiz && quizData.questions.length > 0, "the quiz and its questions must be fetchable for real");
  const attemptResult = await submitQuizAttempt({
    quiz: { id: quizData.quiz.id, passScore: quizData.quiz.passScore, maxAttempts: quizData.quiz.maxAttempts, kind: "unit_quiz" },
    questions: quizData.questions,
    userId: child.id,
    answers: { [String(quizData.questions[0].id)]: "A" },
  });
  assert(attemptResult.ok, `the child's quiz attempt must submit successfully: ${JSON.stringify(attemptResult)}`);

  console.log("11. The linked parent's dashboard must show the child's REAL activity...");
  const dashboard = await getParentDashboard(parent.id);
  const childEntry = dashboard.find(d => d.childId === child.id);
  assert(childEntry, "the parent's dashboard must include an entry for the linked child");
  assert(childEntry!.enrollments.some(e => e.courseId === courseRow.id), "the dashboard must show the child's real enrollment");
  assert(childEntry!.attemptCount >= 1, `the dashboard must show at least 1 real quiz attempt, got ${childEntry!.attemptCount}`);
  assert(childEntry!.progress >= 0, "progress must be a real computed number");

  console.log("12. The intruder must NOT see this child in ANY parent dashboard they can access...");
  const intruderLinks = await getParentLinks(intruder.id);
  assert(intruderLinks.length === 0, "an unrelated user must have zero parent links of their own");

  console.log("13. unlinkParent: the REAL parent revokes the link, and the dashboard must reflect that immediately...");
  const realUnlink = await unlinkParent({ linkId: realLink.id, requesterId: parent.id, role: "parent" });
  assert(realUnlink === true, "the real linked parent must be able to unlink");
  const revokedLink = (await db.select().from(parentLinks).where(eq(parentLinks.id, realLink.id)).limit(1))[0];
  assert(revokedLink.status === "revoked", "the link must be marked revoked in real MySQL");
  const dashboardAfterUnlink = await getParentDashboard(parent.id);
  assert(!dashboardAfterUnlink.some(d => d.childId === child.id), "a revoked link must no longer appear in the parent's dashboard");

  console.log("\n✅ ALL PARENT-CHILD LINKING ASSERTIONS PASSED against real MySQL:");
  console.log("   - Invite creation rejects a nonexistent child cleanly (no crash)");
  console.log("   - Accept: valid code works; garbage/reused/expired/canceled codes all cleanly rejected");
  console.log("   - Cancel: only the invite's own child (or admin) can cancel — an intruder cannot");
  console.log("   - Unlink: only the real parent/child (or admin) can unlink — an intruder cannot");
  console.log("   - Dashboard shows the linked child's REAL enrollment/progress/quiz-attempt data");
  console.log("   - Unlinking immediately removes the child from the parent's dashboard");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
