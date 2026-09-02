// Seeds ONE real, accurate demo course for the Algerian BEM (Brevet
// d'Enseignement Moyen — the national 9th-grade exam) math curriculum:
// "المعادلات من الدرجة الأولى بمجهول واحد" (first-degree equations in one
// unknown). This is real, standard, correctly-worked BEM-level content —
// not filler, not lorem ipsum, and it carries no fake testimonials,
// reviews, or "official ministry accreditation" claims anywhere.
//
// Deliberately separate from drizzle/*.sql migrations and from any
// application code path: this script is opt-in, run once by a human, and
// safe to re-run (it checks for the course by slug first and exits
// cleanly if it already exists — never creates duplicates, never
// overwrites an admin's edits to it).
//
// The course is created UNPUBLISHED. A human admin must review it and
// publish it explicitly from the admin panel — this script never
// announces market readiness on its own.
//
// Run with:
//   DATABASE_URL="mysql://user:pass@host:3306/db" npx tsx scripts/seed-demo-course-bem.ts

import { eq } from "drizzle-orm";
import { courses, users } from "../drizzle/schema";
import { getDb } from "../server/db/shared";
import {
  createCourse,
  createUnit,
  createLesson,
} from "../server/db/courses";
import {
  createManagedQuiz,
  createManagedQuizQuestion,
  createManagedFinalExam,
} from "../server/db/quizzes";

const COURSE_SLUG = "bem-math-equations-degre-1";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("ERROR: DATABASE_URL is not set or the connection failed.");
    process.exit(1);
  }

  const existing = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.slug, COURSE_SLUG))
    .limit(1);
  if (existing.length) {
    console.log(
      `Course "${COURSE_SLUG}" already exists (id ${existing[0].id}) — nothing to do. ` +
        "Delete it from the admin panel first if you want to reseed it."
    );
    return;
  }

  const admin = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  if (!admin.length) {
    console.error(
      "ERROR: no admin account exists yet. Create/promote an admin first " +
        "(see DEPLOYMENT.md) — this script needs a real owner for the course."
    );
    process.exit(1);
  }
  const ownerId = admin[0].id;

  console.log("Creating course...");
  const courseResult = await createCourse({
    ownerId,
    slug: COURSE_SLUG,
    subject: "math",
    level: "exam",
    titleAr: "التحضير لشهادة BEM — المعادلات من الدرجة الأولى",
    titleFr: "Préparation BEM — Équations du premier degré",
    titleEn: "BEM Prep — First-Degree Equations",
    descriptionAr:
      "دورة تحضيرية لشهادة التعليم المتوسط (BEM) تغطي المعادلات من الدرجة " +
      "الأولى بمجهول واحد: تعريفها، طرق حلّها، وتوظيفها في حل مسائل حياتية، " +
      "وفق منهاج السنة الرابعة متوسط.",
    descriptionFr:
      "Cours de préparation au BEM couvrant les équations du premier degré " +
      "à une inconnue : définition, méthodes de résolution, et problèmes " +
      "concrets, conforme au programme de 4e année moyenne.",
    descriptionEn:
      "BEM exam-prep course covering first-degree equations in one unknown: " +
      "definition, solving methods, and real word problems, aligned with " +
      "the Algerian 9th-grade (4AM) math curriculum.",
    targetAudienceAr: "تلاميذ السنة الرابعة متوسط المقبلون على شهادة BEM",
    targetAudienceFr: "Élèves de 4e année moyenne préparant le BEM",
    targetAudienceEn: "9th-grade (4AM) students preparing for the BEM exam",
    objectivesAr: [
      "التعرف على المعادلة من الدرجة الأولى بمجهول واحد وأطرافها.",
      "حل معادلة من الدرجة الأولى باستخدام قاعدة النقل مع تغيير الإشارة.",
      "ترجمة مسألة معطاة بالكلمات إلى معادلة رياضية وحلها.",
    ],
    objectivesFr: [
      "Identifier une équation du premier degré à une inconnue.",
      "Résoudre une équation en isolant l'inconnue.",
      "Traduire un problème concret en équation et le résoudre.",
    ],
    objectivesEn: [
      "Recognize a first-degree equation in one unknown.",
      "Solve an equation by isolating the unknown.",
      "Translate a word problem into an equation and solve it.",
    ],
    prerequisitesAr: [
      "إتقان العمليات الأربع على الأعداد النسبية (الجمع، الطرح، الضرب، القسمة).",
      "معرفة مفهوم العدد المجهول.",
    ],
    prerequisitesFr: [
      "Maîtrise des quatre opérations sur les nombres relatifs.",
      "Connaissance de la notion d'inconnue.",
    ],
    prerequisitesEn: [
      "Comfort with the four operations on signed numbers.",
      "Understanding of what an unknown quantity is.",
    ],
  });
  if (!courseResult.ok) {
    console.error("Failed to create course:", courseResult.reason);
    process.exit(1);
  }
  const courseRow = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.slug, COURSE_SLUG))
    .limit(1);
  const courseId = courseRow[0].id;
  console.log(`  Course created (id ${courseId}), left UNPUBLISHED.`);

  console.log("Creating unit...");
  await createUnit({
    courseId,
    role: "admin",
    userId: ownerId,
    orderIndex: 0,
    titleAr: "الوحدة 1 — المعادلات من الدرجة الأولى",
    titleFr: "Unité 1 — Équations du premier degré",
    titleEn: "Unit 1 — First-degree equations",
  });
  const unitRow = await db.query.units?.findFirst;
  const { units } = await import("../drizzle/schema");
  const unitRows = await db
    .select({ id: units.id })
    .from(units)
    .where(eq(units.courseId, courseId))
    .limit(1);
  const unitId = unitRows[0].id;
  console.log(`  Unit created (id ${unitId}).`);
  void unitRow;

  console.log("Creating lessons...");
  const lessonContents: Array<{
    titleAr: string;
    titleFr: string;
    titleEn: string;
    content: string;
  }> = [
    {
      titleAr: "الدرس 1 — تعريف المعادلة من الدرجة الأولى",
      titleFr: "Leçon 1 — Définition de l'équation du premier degré",
      titleEn: "Lesson 1 — What is a first-degree equation",
      content:
        "المعادلة من الدرجة الأولى بمجهول واحد هي مساواة بين طرفين تحتوي " +
        "على عدد مجهول (نرمز له غالبًا بـ x) أُسّه يساوي 1.\n\n" +
        "مثال: 2x + 3 = 7\n" +
        "الطرف الأول: 2x + 3\n" +
        "الطرف الثاني: 7\n" +
        "المجهول: x\n\n" +
        "حلّ المعادلة هو القيمة التي إذا عوّضنا بها مكان x يتحقق التساوي " +
        "بين الطرفين. في المثال أعلاه، الحل هو x = 2، لأن 2(2) + 3 = 7.",
    },
    {
      titleAr: "الدرس 2 — حل معادلة من الدرجة الأولى",
      titleFr: "Leçon 2 — Résoudre une équation du premier degré",
      titleEn: "Lesson 2 — Solving a first-degree equation",
      content:
        "لحل معادلة من الدرجة الأولى، نعزل المجهول في طرف واحد باستخدام " +
        "قاعدة النقل مع تغيير الإشارة: عند نقل حدّ من طرف إلى آخر، يتغيّر " +
        "إشارته (+ تصبح −، والعكس).\n\n" +
        "مثال محلول خطوة بخطوة: 3x − 5 = 10\n" +
        "الخطوة 1: ننقل −5 إلى الطرف الثاني فتصبح +5:\n" +
        "  3x = 10 + 5\n" +
        "  3x = 15\n" +
        "الخطوة 2: نقسم الطرفين على معامل x (وهو 3):\n" +
        "  x = 15 ÷ 3\n" +
        "  x = 5\n\n" +
        "التحقق: 3(5) − 5 = 15 − 5 = 10 ✓",
    },
    {
      titleAr: "الدرس 3 — مسائل تطبيقية",
      titleFr: "Leçon 3 — Problèmes concrets",
      titleEn: "Lesson 3 — Word problems",
      content:
        "لحل مسألة باستخدام المعادلات، نتبع ثلاث خطوات:\n" +
        "1) نرمز للمجهول بحرف (عادة x).\n" +
        "2) نترجم معطيات المسألة إلى معادلة.\n" +
        "3) نحل المعادلة ونتحقق من منطقية الحل.\n\n" +
        "مثال: مجموع عدد وضعفه يساوي 27. أوجد هذا العدد.\n" +
        "الحل:\n" +
        "  نرمز للعدد بـ x. ضعفه هو 2x.\n" +
        "  المعادلة: x + 2x = 27\n" +
        "  3x = 27\n" +
        "  x = 9\n" +
        "التحقق: 9 + 2(9) = 9 + 18 = 27 ✓\n" +
        "إذن العدد المطلوب هو 9.",
    },
  ];
  const lessonIds: number[] = [];
  for (let i = 0; i < lessonContents.length; i++) {
    const l = lessonContents[i];
    await createLesson({
      unitId,
      role: "admin",
      userId: ownerId,
      orderIndex: i,
      titleAr: l.titleAr,
      titleFr: l.titleFr,
      titleEn: l.titleEn,
      type: "article",
      durationMinutes: 15,
      content: l.content,
    });
  }
  const { lessons } = await import("../drizzle/schema");
  const createdLessons = await db
    .select({ id: lessons.id, orderIndex: lessons.orderIndex })
    .from(lessons)
    .where(eq(lessons.unitId, unitId))
    .orderBy(lessons.orderIndex);
  lessonIds.push(...createdLessons.map(l => l.id));
  console.log(`  ${lessonIds.length} lessons created.`);

  console.log("Creating unit quiz...");
  await createManagedQuiz({
    unitId,
    role: "admin",
    userId: ownerId,
    passScore: 60,
    maxAttempts: 3,
  });
  const { unitQuizzes } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  const unitQuizRow = await db
    .select({ id: unitQuizzes.id })
    .from(unitQuizzes)
    .where(
      and(eq(unitQuizzes.unitId, unitId), eq(unitQuizzes.kind, "unit_quiz"))
    )
    .limit(1);
  const unitQuizId = unitQuizRow[0].id;

  const unitQuizQuestions = [
    {
      promptAr: "حل المعادلة: x + 5 = 12",
      promptFr: "Résoudre : x + 5 = 12",
      promptEn: "Solve: x + 5 = 12",
      options: ["x = 5", "x = 7", "x = 17", "x = 60"],
      answerIndex: 1, // x = 7
    },
    {
      promptAr: "حل المعادلة: 2x = 10",
      promptFr: "Résoudre : 2x = 10",
      promptEn: "Solve: 2x = 10",
      options: ["x = 2", "x = 5", "x = 8", "x = 20"],
      answerIndex: 1, // x = 5
    },
    {
      promptAr: "حل المعادلة: 3x − 6 = 9",
      promptFr: "Résoudre : 3x − 6 = 9",
      promptEn: "Solve: 3x − 6 = 9",
      options: ["x = 1", "x = 3", "x = 5", "x = 15"],
      answerIndex: 2, // x = 5
    },
  ];
  for (let i = 0; i < unitQuizQuestions.length; i++) {
    const q = unitQuizQuestions[i];
    await createManagedQuizQuestion({
      quizId: unitQuizId,
      role: "admin",
      userId: ownerId,
      questionType: "choice",
      promptAr: q.promptAr,
      promptFr: q.promptFr,
      promptEn: q.promptEn,
      optionsJson: JSON.stringify(q.options),
      answerKey: String(q.answerIndex),
      orderIndex: i,
    });
  }
  console.log(`  Unit quiz created with ${unitQuizQuestions.length} questions.`);

  console.log("Creating final exam...");
  await createManagedFinalExam({
    courseId,
    role: "admin",
    userId: ownerId,
    passScore: 60,
    maxAttempts: 3,
  });
  const finalExamRow = await db
    .select({ id: unitQuizzes.id })
    .from(unitQuizzes)
    .where(
      and(eq(unitQuizzes.courseId, courseId), eq(unitQuizzes.kind, "final_exam"))
    )
    .limit(1);
  const finalExamId = finalExamRow[0].id;

  const finalExamQuestions = [
    {
      promptAr: "حل المعادلة: 4x + 1 = 13",
      promptFr: "Résoudre : 4x + 1 = 13",
      promptEn: "Solve: 4x + 1 = 13",
      options: ["x = 2", "x = 3", "x = 4", "x = 14"],
      answerIndex: 1, // x = 3
    },
    {
      promptAr: "مجموع عدد وثلاثة أمثاله يساوي 24. ما هو هذا العدد؟",
      promptFr: "La somme d'un nombre et de son triple est 24. Quel est ce nombre ?",
      promptEn: "The sum of a number and three times it is 24. What is the number?",
      options: ["4", "6", "8", "12"],
      answerIndex: 1, // 6, since x + 3x = 24 -> 4x=24 -> x=6
    },
  ];
  for (let i = 0; i < finalExamQuestions.length; i++) {
    const q = finalExamQuestions[i];
    await createManagedQuizQuestion({
      quizId: finalExamId,
      role: "admin",
      userId: ownerId,
      questionType: "choice",
      promptAr: q.promptAr,
      promptFr: q.promptFr,
      promptEn: q.promptEn,
      optionsJson: JSON.stringify(q.options),
      answerKey: String(q.answerIndex),
      orderIndex: i,
    });
  }
  console.log(`  Final exam created with ${finalExamQuestions.length} questions.`);

  console.log(
    "\n✅ Demo course seeded successfully, UNPUBLISHED.\n" +
      `   Review it in the admin panel (course slug: ${COURSE_SLUG}) and publish it explicitly when ready.\n` +
      "   No fake testimonials, reviews, or accreditation claims were added — none exist in this app."
  );
}

main()
  .catch(error => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
