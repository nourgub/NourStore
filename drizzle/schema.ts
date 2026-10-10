import {
  bigint,
  double,
  index,
  int,
  mysqlEnum,
  mediumtext,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Only set for accounts created via email+password sign-up
  // (server/_core/emailAuth.ts) — null for Google OAuth accounts. Format: "scrypt:<salt-hex>:<hash-hex>", never a plain
  // password, never a reversible encoding.
  passwordHash: varchar("passwordHash", { length: 200 }),
  role: mysqlEnum("role", [
    "learner",
    "parent",
    "teacher",
    "institution",
    "admin",
  ])
    .default("learner")
    .notNull(),
  // Set once, the first time a new visitor chooses their account category
  // (learner / teacher / institution) — see auth.chooseRole. Null means
  // they haven't chosen yet, which is what triggers the onboarding prompt.
  // "admin" is never selectable here — it is only ever granted via
  // OWNER_OPEN_ID bootstrap or an existing admin's manual promotion.
  roleChosenAt: timestamp("roleChosenAt"),
  // Gates login for accounts an admin creates directly (see
  // createManagedUser in server/db/usersAuth.ts) — held "pending" until an
  // admin confirms payment and flips it to "active" (admin.activateUser).
  // Self-registered accounts (auth.registerWithEmail) are always "active"
  // immediately, unaffected by this — role is unknown at that point (see
  // auth.chooseRole), so there is nothing yet to gate.
  accountStatus: mysqlEnum("accountStatus", ["active", "pending", "suspended"])
    .default("active")
    .notNull(),
  country: varchar("country", { length: 2 }),
  currency: varchar("currency", { length: 3 }).default("DZD"),
  language: varchar("language", { length: 5 }).default("ar"),
  timezone: varchar("timezone", { length: 64 }).default("Africa/Algiers"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const platformSettings = mysqlTable("platformSettings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  planType: mysqlEnum("planType", [
    "free",
    "monthly",
    "quarterly",
    "yearly",
    "one_time",
  ])
    .default("monthly")
    .notNull(),
  // Default/fallback price shown when no per-currency row exists in planPrices for the viewer's currency.
  currency: varchar("currency", { length: 3 }).default("DZD").notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  descriptionAr: text("descriptionAr").notNull(),
  descriptionFr: text("descriptionFr").notNull(),
  descriptionEn: text("descriptionEn").notNull(),
  priceCents: int("priceCents").default(0).notNull(),
  durationDays: int("durationDays").default(30).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Real multi-currency pricing: one plan can have a distinct price per currency, resolved by the viewer's currency (falls back to the plan's default price/currency above). */
export const planPrices = mysqlTable(
  "planPrices",
  {
    id: int("id").autoincrement().primaryKey(),
    planId: int("planId")
      .notNull()
      .references(() => subscriptionPlans.id),
    currency: varchar("currency", { length: 3 }).notNull(),
    priceCents: int("priceCents").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    planCurrencyUnique: uniqueIndex("planPrices_plan_currency_unique").on(
      table.planId,
      table.currency
    ),
  })
);

export const userSubscriptions = mysqlTable(
  "userSubscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    planId: int("planId")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: mysqlEnum("status", [
      "trialing",
      "active",
      "paused",
      "canceled",
      "expired",
    ])
      .default("trialing")
      .notNull(),
    autoRenew: int("autoRenew").default(0).notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
    canceledAt: timestamp("canceledAt"),
    // Provider-neutral fields only — no Stripe-specific column. "manual" is a
    // valid provider value for admin-granted access (see assignSubscription).
    paymentProvider: varchar("paymentProvider", { length: 64 }),
    providerCustomerId: varchar("providerCustomerId", { length: 255 }),
    providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("userSubscriptions_userId_idx").on(table.userId),
    planIdx: index("userSubscriptions_planId_idx").on(table.planId),
  })
);

/**
 * Subject catalog — lets an admin add a new subject (e.g. physics,
 * chemistry) from the UI without a code change. `courses.subject` and
 * `skills.subject` store the subject's slug as a plain string (validated at
 * the application layer against this table) rather than a hard-coded SQL
 * enum, precisely so new subjects don't require a schema migration.
 */
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  // Icon key looked up against a small fixed dictionary on the frontend
  // (see client/src/lib/subjectIcons.ts) — not a raw component name.
  icon: varchar("icon", { length: 40 }).default("book").notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courses = mysqlTable(
  "courses",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    subject: varchar("subject", { length: 40 }).notNull(),
    // Algeria's three school stages — orthogonal to `level` (which is a
    // difficulty tier within a stage, e.g. "foundation" applies equally to
    // a primary-stage course and a secondary-stage one).
    stage: mysqlEnum("stage", ["primary", "middle", "secondary"])
      .default("middle")
      .notNull(),
    level: mysqlEnum("level", [
      "starter",
      "foundation",
      "intermediate",
      "advanced",
      "exam",
      "professional",
    ]).notNull(),
    titleAr: varchar("titleAr", { length: 255 }).notNull(),
    titleFr: varchar("titleFr", { length: 255 }).notNull(),
    titleEn: varchar("titleEn", { length: 255 }).notNull(),
    descriptionAr: text("descriptionAr").notNull(),
    descriptionFr: text("descriptionFr").notNull(),
    descriptionEn: text("descriptionEn").notNull(),
    durationMinutes: int("durationMinutes").default(0).notNull(),
    unitCount: int("unitCount").default(0).notNull(),
    isPublished: int("isPublished").default(0).notNull(),
    // Source of truth for draft/published/archived. isPublished is kept in
    // sync alongside it (see server/db/courses.ts) purely so every existing
    // query that already filters on isPublished keeps working unchanged —
    // an archived course has isPublished = 0, same as a draft, and is
    // correctly invisible to learners either way.
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .default("draft")
      .notNull(),
    isFree: int("isFree").default(0).notNull(),
    // Learning objectives / prerequisites: nullable JSON-encoded arrays of
    // strings, one per language. Nullable and rendered conditionally —
    // never a placeholder when absent.
    objectivesAr: text("objectivesAr"),
    objectivesFr: text("objectivesFr"),
    objectivesEn: text("objectivesEn"),
    prerequisitesAr: text("prerequisitesAr"),
    prerequisitesFr: text("prerequisitesFr"),
    prerequisitesEn: text("prerequisitesEn"),
    targetAudienceAr: varchar("targetAudienceAr", { length: 255 }),
    targetAudienceFr: varchar("targetAudienceFr", { length: 255 }),
    targetAudienceEn: varchar("targetAudienceEn", { length: 255 }),
    ownerId: int("ownerId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("courses_ownerId_idx").on(table.ownerId),
    publishedIdx: index("courses_isPublished_idx").on(table.isPublished),
  })
);

export const units = mysqlTable(
  "units",
  {
    id: int("id").autoincrement().primaryKey(),
    courseId: int("courseId")
      .notNull()
      .references(() => courses.id),
    orderIndex: int("orderIndex").notNull(),
    titleAr: varchar("titleAr", { length: 255 }).notNull(),
    titleFr: varchar("titleFr", { length: 255 }).notNull(),
    titleEn: varchar("titleEn", { length: 255 }).notNull(),
    descriptionAr: text("descriptionAr"),
    descriptionFr: text("descriptionFr"),
    descriptionEn: text("descriptionEn"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    courseIdx: index("units_courseId_idx").on(table.courseId),
  })
);

/** Skill/objective taxonomy — tags what a lesson teaches and what a question tests, powering strengths/weaknesses analytics. */
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  subject: varchar("subject", { length: 40 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const lessons = mysqlTable(
  "lessons",
  {
    id: int("id").autoincrement().primaryKey(),
    unitId: int("unitId")
      .notNull()
      .references(() => units.id),
    orderIndex: int("orderIndex").notNull(),
    titleAr: varchar("titleAr", { length: 255 }).notNull(),
    titleFr: varchar("titleFr", { length: 255 }).notNull(),
    titleEn: varchar("titleEn", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["video", "article", "exercise", "live"])
      .default("video")
      .notNull(),
    durationMinutes: int("durationMinutes").default(10).notNull(),
    liveUrl: varchar("liveUrl", { length: 768 }),
    liveStartsAt: bigint("liveStartsAt", { mode: "number" }),
    content: text("content"),
    // The primary skill/objective this lesson teaches — nullable since not
    // every lesson needs to be tagged for analytics to be useful.
    skillId: int("skillId").references(() => skills.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    unitIdx: index("lessons_unitId_idx").on(table.unitId),
  })
);

export const lessonAssets = mysqlTable(
  "lessonAssets",
  {
    id: int("id").autoincrement().primaryKey(),
    lessonId: int("lessonId")
      .notNull()
      .references(() => lessons.id),
    uploaderId: int("uploaderId")
      .notNull()
      .references(() => users.id),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
    url: varchar("url", { length: 768 }).notNull(),
    mimeType: varchar("mimeType", { length: 160 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    lessonIdx: index("lessonAssets_lessonId_idx").on(table.lessonId),
  })
);

/**
 * Generalized assessment table: covers both a unit-end quiz (unitId set,
 * courseId null) and a course final exam (courseId set, unitId null). This
 * reuses quizQuestions/quizAttempts/quizAttemptAnswers as-is for both kinds,
 * per the brief's "keep compatibility with existing tables where possible" —
 * rather than duplicating a parallel set of exam tables.
 */
export const unitQuizzes = mysqlTable("unitQuizzes", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["unit_quiz", "final_exam"])
    .default("unit_quiz")
    .notNull(),
  unitId: int("unitId")
    .unique()
    .references(() => units.id),
  courseId: int("courseId")
    .unique()
    .references(() => courses.id),
  passScore: int("passScore").default(60).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const quizQuestions = mysqlTable(
  "quizQuestions",
  {
    id: int("id").autoincrement().primaryKey(),
    quizId: int("quizId")
      .notNull()
      .references(() => unitQuizzes.id),
    questionType: mysqlEnum("questionType", [
      "choice",
      "true_false",
      "open",
      "code",
    ])
      .default("choice")
      .notNull(),
    promptAr: text("promptAr").notNull(),
    promptFr: text("promptFr").notNull(),
    promptEn: text("promptEn").notNull(),
    optionsJson: text("optionsJson"),
    answerKey: text("answerKey"),
    explanationAr: text("explanationAr"),
    explanationFr: text("explanationFr"),
    explanationEn: text("explanationEn"),
    // The skill/objective this question tests — powers per-skill strength/weakness scoring.
    skillId: int("skillId").references(() => skills.id),
    orderIndex: int("orderIndex").notNull(),
  },
  table => ({
    quizIdx: index("quizQuestions_quizId_idx").on(table.quizId),
  })
);

export const quizAttempts = mysqlTable(
  "quizAttempts",
  {
    id: int("id").autoincrement().primaryKey(),
    quizId: int("quizId")
      .notNull()
      .references(() => unitQuizzes.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    score: int("score").default(0).notNull(),
    passed: int("passed").default(0).notNull(),
    // "pending_review": contains at least one open/code answer awaiting manual
    // teacher grading — score/passed above only reflect the auto-graded
    // (choice/true_false) portion until every answer has been reviewed.
    status: mysqlEnum("status", ["graded", "pending_review"])
      .default("graded")
      .notNull(),
    attemptNumber: int("attemptNumber").default(1).notNull(),
    feedbackJson: text("feedbackJson"),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
  },
  table => ({
    quizUserAttemptUnique: uniqueIndex(
      "quizAttempts_quiz_user_attempt_unique"
    ).on(table.quizId, table.userId, table.attemptNumber),
    userIdx: index("quizAttempts_userId_idx").on(table.userId),
  })
);

/**
 * Per-question record for a quiz attempt. Needed because open/code questions
 * must never be auto-graded by comparing to answerKey — their raw answer is
 * stored here with isCorrect left null until a teacher reviews it.
 */
export const quizAttemptAnswers = mysqlTable(
  "quizAttemptAnswers",
  {
    id: int("id").autoincrement().primaryKey(),
    attemptId: int("attemptId")
      .notNull()
      .references(() => quizAttempts.id),
    questionId: int("questionId")
      .notNull()
      .references(() => quizQuestions.id),
    questionType: mysqlEnum("questionType", [
      "choice",
      "true_false",
      "open",
      "code",
    ]).notNull(),
    submittedAnswer: text("submittedAnswer"),
    // null = not yet graded (always true at insert time for open/code; set immediately for choice/true_false)
    isCorrect: int("isCorrect"),
    reviewedBy: int("reviewedBy").references(() => users.id),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    attemptIdx: index("quizAttemptAnswers_attemptId_idx").on(table.attemptId),
    questionIdx: index("quizAttemptAnswers_questionId_idx").on(
      table.questionId
    ),
  })
);

export const parentLinks = mysqlTable(
  "parentLinks",
  {
    id: int("id").autoincrement().primaryKey(),
    parentId: int("parentId")
      .notNull()
      .references(() => users.id),
    childId: int("childId")
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["pending", "active", "revoked"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    parentChildUnique: uniqueIndex("parentLinks_parent_child_unique").on(
      table.parentId,
      table.childId
    ),
    childIdx: index("parentLinks_childId_idx").on(table.childId),
  })
);

export const algorithmExercises = mysqlTable("algorithmExercises", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  difficulty: mysqlEnum("difficulty", ["starter", "easy", "medium", "hard"])
    .default("starter")
    .notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  statementAr: text("statementAr").notNull(),
  statementFr: text("statementFr").notNull(),
  statementEn: text("statementEn").notNull(),
  starterCode: text("starterCode").notNull(),
  testCasesJson: text("testCasesJson").notNull(),
  hintsJson: text("hintsJson"),
  isPublished: int("isPublished").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const algorithmAttempts = mysqlTable(
  "algorithmAttempts",
  {
    id: int("id").autoincrement().primaryKey(),
    exerciseId: int("exerciseId")
      .notNull()
      .references(() => algorithmExercises.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    code: text("code").notNull(),
    status: mysqlEnum("status", [
      "passed",
      "failed",
      "syntax_error",
      "timeout",
    ]).notNull(),
    passedTests: int("passedTests").default(0).notNull(),
    totalTests: int("totalTests").default(0).notNull(),
    feedbackJson: text("feedbackJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    exerciseIdx: index("algorithmAttempts_exerciseId_idx").on(table.exerciseId),
    userIdx: index("algorithmAttempts_userId_idx").on(table.userId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type LessonAsset = typeof lessonAssets.$inferSelect;
export type Quiz = typeof unitQuizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type AlgorithmExercise = typeof algorithmExercises.$inferSelect;
export type AlgorithmAttempt = typeof algorithmAttempts.$inferSelect;

export const courseEnrollments = mysqlTable(
  "courseEnrollments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    courseId: int("courseId")
      .notNull()
      .references(() => courses.id),
    progressPercent: int("progressPercent").default(0).notNull(),
    status: mysqlEnum("status", ["active", "completed", "paused"])
      .default("active")
      .notNull(),
    enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userCourseUnique: uniqueIndex("courseEnrollments_user_course_unique").on(
      table.userId,
      table.courseId
    ),
    courseIdx: index("courseEnrollments_courseId_idx").on(table.courseId),
  })
);

export const lessonProgress = mysqlTable(
  "lessonProgress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    lessonId: int("lessonId")
      .notNull()
      .references(() => lessons.id),
    completed: int("completed").default(0).notNull(),
    lastPositionSeconds: int("lastPositionSeconds").default(0).notNull(),
    studySeconds: int("studySeconds").default(0).notNull(),
    completedAt: timestamp("completedAt"),
    lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userLessonUnique: uniqueIndex("lessonProgress_user_lesson_unique").on(
      table.userId,
      table.lessonId
    ),
    lessonIdx: index("lessonProgress_lessonId_idx").on(table.lessonId),
  })
);

export const placementTests = mysqlTable("placementTests", {
  id: int("id").autoincrement().primaryKey(),
  // A real subject slug (see `subjects` table), or "combined" for a multi-subject placement test.
  subject: varchar("subject", { length: 40 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  isPublished: int("isPublished").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const placementQuestions = mysqlTable(
  "placementQuestions",
  {
    id: int("id").autoincrement().primaryKey(),
    testId: int("testId")
      .notNull()
      .references(() => placementTests.id),
    promptAr: text("promptAr").notNull(),
    promptFr: text("promptFr").notNull(),
    promptEn: text("promptEn").notNull(),
    optionsJson: text("optionsJson"),
    answerKey: text("answerKey"),
    skill: varchar("skill", { length: 160 }).notNull(),
    difficulty: mysqlEnum("difficulty", ["starter", "easy", "medium", "hard"])
      .default("starter")
      .notNull(),
    orderIndex: int("orderIndex").notNull(),
  },
  table => ({
    testIdx: index("placementQuestions_testId_idx").on(table.testId),
  })
);

export const placementAttempts = mysqlTable(
  "placementAttempts",
  {
    id: int("id").autoincrement().primaryKey(),
    testId: int("testId")
      .notNull()
      .references(() => placementTests.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    score: int("score").default(0).notNull(),
    recommendedLevel: mysqlEnum("recommendedLevel", [
      "starter",
      "foundation",
      "intermediate",
      "advanced",
      "exam",
    ]).notNull(),
    answersJson: text("answersJson"),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("placementAttempts_userId_idx").on(table.userId),
  })
);

export const parentInviteCodes = mysqlTable(
  "parentInviteCodes",
  {
    id: int("id").autoincrement().primaryKey(),
    childId: int("childId")
      .notNull()
      .references(() => users.id),
    code: varchar("code", { length: 32 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    canceledAt: timestamp("canceledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    childIdx: index("parentInviteCodes_childId_idx").on(table.childId),
  })
);

export type Enrollment = typeof courseEnrollments.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type PlacementTest = typeof placementTests.$inferSelect;
export type PlacementQuestion = typeof placementQuestions.$inferSelect;
export type PlacementAttempt = typeof placementAttempts.$inferSelect;

export const certificates = mysqlTable(
  "certificates",
  {
    id: int("id").autoincrement().primaryKey(),
    certificateId: varchar("certificateId", { length: 64 }).notNull().unique(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    courseId: int("courseId")
      .notNull()
      .references(() => courses.id),
    status: mysqlEnum("status", ["active", "revoked"])
      .default("active")
      .notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  table => ({
    userCourseUnique: uniqueIndex("certificates_user_course_unique").on(
      table.userId,
      table.courseId
    ),
  })
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("notifications_userId_idx").on(table.userId),
  })
);

export type Certificate = typeof certificates.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

/**
 * Provider-neutral billing entities. `invoices` is the source of truth for
 * what a learner owes/paid; `paymentAttempts` records each try against a
 * provider (a single invoice can have several, e.g. a retried card);
 * `refunds` is separate from payment attempts since a refund can happen
 * long after the original successful attempt. No table here assumes Stripe
 * or any specific provider — `provider` is a free-form string ("manual",
 * "stripe", etc.), and provider wiring lives entirely outside this schema.
 */
export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    planId: int("planId")
      .notNull()
      .references(() => subscriptionPlans.id),
    subscriptionId: int("subscriptionId").references(
      () => userSubscriptions.id
    ),
    currency: varchar("currency", { length: 3 }).notNull(),
    amountCents: int("amountCents").notNull(),
    status: mysqlEnum("status", [
      "pending",
      "paid",
      "failed",
      "refunded",
      "canceled",
      "expired",
    ])
      .default("pending")
      .notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerReference: varchar("providerReference", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    paidAt: timestamp("paidAt"),
  },
  table => ({
    userIdx: index("invoices_userId_idx").on(table.userId),
    statusIdx: index("invoices_status_idx").on(table.status),
  })
);

export const paymentAttempts = mysqlTable(
  "paymentAttempts",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoiceId")
      .notNull()
      .references(() => invoices.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerReference: varchar("providerReference", { length: 255 }),
    status: mysqlEnum("status", ["pending", "succeeded", "failed"])
      .default("pending")
      .notNull(),
    rawResponseJson: text("rawResponseJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    invoiceIdx: index("paymentAttempts_invoiceId_idx").on(table.invoiceId),
  })
);

export const refunds = mysqlTable(
  "refunds",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoiceId")
      .notNull()
      .references(() => invoices.id),
    amountCents: int("amountCents").notNull(),
    reason: varchar("reason", { length: 255 }),
    status: mysqlEnum("status", ["pending", "succeeded", "failed"])
      .default("pending")
      .notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerReference: varchar("providerReference", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    invoiceIdx: index("refunds_invoiceId_idx").on(table.invoiceId),
  })
);

export type PlanPrice = typeof planPrices.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Subject = typeof subjects.$inferSelect;

/**
 * WhatsApp-based manual payment flow: a learner is sent a wa.me link
 * pre-filled with their invoice reference. The bot (Meta WhatsApp Cloud
 * API, once configured) replies with bank transfer details (RIB) and asks
 * for a receipt photo. The photo is stored here as evidence for a human
 * admin to review — the bot never auto-approves a payment, since it cannot
 * verify a bank transfer actually landed; only a human checking the real
 * bank statement can.
 */
export const paymentReceipts = mysqlTable(
  "paymentReceipts",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoiceId")
      .notNull()
      .references(() => invoices.id),
    storageKey: varchar("storageKey", { length: 512 }),
    url: varchar("url", { length: 768 }),
    mimeType: varchar("mimeType", { length: 64 }),
    whatsappFromNumber: varchar("whatsappFromNumber", { length: 32 }),
    whatsappMessageId: varchar("whatsappMessageId", { length: 128 }).unique(),
    // SHA-256 of the actual uploaded bytes — real, DB-enforced protection
    // against the exact same receipt image being submitted more than
    // once (WhatsApp-sourced receipts predate this column and stay NULL,
    // which MySQL's UNIQUE index correctly allows any number of).
    contentHash: varchar("contentHash", { length: 64 }).unique(),
    status: mysqlEnum("status", ["pending_review", "approved", "rejected"])
      .default("pending_review")
      .notNull(),
    reviewedBy: int("reviewedBy").references(() => users.id),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    invoiceIdx: index("paymentReceipts_invoiceId_idx").on(table.invoiceId),
    statusIdx: index("paymentReceipts_status_idx").on(table.status),
  })
);

/** Tracks which pending invoice(s) a WhatsApp phone number is currently mid-conversation about, so an incoming photo can be linked to the right invoice. A phone number can track more than one invoice at once (composite unique on phoneNumber+invoiceId) — a learner with two simultaneously pending invoices no longer silently loses the session for one when they reference the other. See getWhatsappSession for how ambiguity between multiple still-pending sessions is resolved. */
export const whatsappCheckoutSessions = mysqlTable(
  "whatsappCheckoutSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
    invoiceId: int("invoiceId")
      .notNull()
      .references(() => invoices.id),
    // Millisecond precision (not MySQL's second-precision default) so two
    // references within the same second still order deterministically —
    // this was a real bug caught by testing: default `timestamp` precision
    // made "most recently referenced" ties resolve arbitrarily.
    updatedAt: timestamp("updatedAt", { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
    // Set once a stale-session reminder has been sent for this exact
    // session, so the reminder sweep never nags the same student twice.
    remindedAt: timestamp("remindedAt"),
  },
  table => ({
    phoneInvoiceUnique: uniqueIndex(
      "whatsappCheckoutSessions_phoneNumber_invoiceId_unique"
    ).on(table.phoneNumber, table.invoiceId),
  })
);

export type PaymentReceipt = typeof paymentReceipts.$inferSelect;

// ---------------------------------------------------------------------------
// Gamification: points, badges, leaderboard. Points are an append-only
// ledger (never a single mutable counter) so the total is always derivable
// and auditable — "why does this learner have 130 points" is answerable by
// reading their ledger rows, not by trusting a number that could drift.
// ---------------------------------------------------------------------------

export const pointsLedger = mysqlTable(
  "pointsLedger",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    points: int("points").notNull(),
    reason: mysqlEnum("reason", [
      "lesson_completed",
      "quiz_passed",
      "certificate_earned",
      "algorithm_lab_passed",
      "referral_reward",
    ]).notNull(),
    refId: int("refId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("pointsLedger_userId_idx").on(table.userId),
  })
);

/**
 * Badges are data-driven against a fixed set of automatically-checkable
 * criteria (`criteriaKey`) — an admin can create a new badge (any title,
 * icon, description in all three languages) mapped to an existing
 * criteria key without any code change, which is what makes adding new
 * badges "easy" as requested.
 */
export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  icon: varchar("icon", { length: 40 }).default("award").notNull(),
  criteriaKey: mysqlEnum("criteriaKey", [
    "first_lesson",
    "five_lessons",
    "twenty_lessons",
    "first_quiz_pass",
    "perfect_quiz_score",
    "first_certificate",
    "three_certificates",
  ]).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  descriptionAr: varchar("descriptionAr", { length: 500 }).notNull(),
  descriptionFr: varchar("descriptionFr", { length: 500 }).notNull(),
  descriptionEn: varchar("descriptionEn", { length: 500 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userBadges = mysqlTable(
  "userBadges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    badgeId: int("badgeId")
      .notNull()
      .references(() => badges.id),
    awardedAt: timestamp("awardedAt").defaultNow().notNull(),
  },
  table => ({
    userBadgeUnique: uniqueIndex("userBadges_user_badge_unique").on(
      table.userId,
      table.badgeId
    ),
  })
);

export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type PointsLedgerEntry = typeof pointsLedger.$inferSelect;

// ---------------------------------------------------------------------------
// Support tickets — a real, minimal helpdesk: a learner (or parent/teacher)
// opens a ticket, exchanges messages with an admin, and the ticket tracks a
// real status. No external ticketing service required.
// ---------------------------------------------------------------------------

export const supportTickets = mysqlTable(
  "supportTickets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    subject: varchar("subject", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"])
      .default("open")
      .notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high"])
      .default("medium")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("supportTickets_userId_idx").on(table.userId),
    statusIdx: index("supportTickets_status_idx").on(table.status),
  })
);

export const supportTicketMessages = mysqlTable(
  "supportTicketMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    ticketId: int("ticketId")
      .notNull()
      .references(() => supportTickets.id),
    senderId: int("senderId")
      .notNull()
      .references(() => users.id),
    message: text("message").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    ticketIdx: index("supportTicketMessages_ticketId_idx").on(table.ticketId),
  })
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;

// ---------------------------------------------------------------------------
// Coupons: real discount codes applied at checkout. Redemptions are tracked
// per-user (not just a global counter) so "has this user already used this
// code" and "how many times has it been used overall" are both answerable
// from real rows, not inferred.
// ---------------------------------------------------------------------------

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  discountType: mysqlEnum("discountType", ["percent", "fixed"]).notNull(),
  discountValue: int("discountValue").notNull(), // percent: 0-100; fixed: cents
  maxRedemptions: int("maxRedemptions"), // null = unlimited
  timesRedeemed: int("timesRedeemed").default(0).notNull(),
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validUntil: timestamp("validUntil"), // null = no expiry
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const couponRedemptions = mysqlTable(
  "couponRedemptions",
  {
    id: int("id").autoincrement().primaryKey(),
    couponId: int("couponId")
      .notNull()
      .references(() => coupons.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    invoiceId: int("invoiceId").references(() => invoices.id),
    redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
  },
  table => ({
    couponUserUnique: uniqueIndex("couponRedemptions_coupon_user_unique").on(
      table.couponId,
      table.userId
    ),
  })
);

export type Coupon = typeof coupons.$inferSelect;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;

// ---------------------------------------------------------------------------
// Referrals: each user can get one referral code; a new user redeems it at
// most once (unique on referredUserId, so a learner can't be "referred"
// twice and can't rack up multiple rewards for the same referrer by
// re-redeeming). The reward is only granted once the referred learner's
// first invoice is actually paid — never on signup alone, to avoid a
// trivially gameable "create fake accounts for free points" loop.
// ---------------------------------------------------------------------------

export const referralCodes = mysqlTable("referralCodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id),
  code: varchar("code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referralRedemptions = mysqlTable("referralRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  referralCodeId: int("referralCodeId")
    .notNull()
    .references(() => referralCodes.id),
  referredUserId: int("referredUserId")
    .notNull()
    .unique()
    .references(() => users.id),
  rewardGranted: int("rewardGranted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type ReferralRedemption = typeof referralRedemptions.$inferSelect;

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of every sensitive
// administrative action — who did what, to what, and when. Never updated
// or deleted once written, so it can be trusted as a genuine record.
// ---------------------------------------------------------------------------

export const adminAuditLog = mysqlTable(
  "adminAuditLog",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actorId").notNull().references(() => users.id),
    action: varchar("action", { length: 80 }).notNull(),
    targetType: varchar("targetType", { length: 40 }),
    targetId: varchar("targetId", { length: 64 }),
    detailsJson: text("detailsJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index("adminAuditLog_actorId_idx").on(table.actorId),
    actionIdx: index("adminAuditLog_action_idx").on(table.action),
    createdAtIdx: index("adminAuditLog_createdAt_idx").on(table.createdAt),
  })
);

export type AdminAuditLogEntry = typeof adminAuditLog.$inferSelect;

// ---------------------------------------------------------------------------
// Error log: a real, self-hosted error-tracking record — captures both
// backend (unexpected tRPC errors) and frontend (unhandled JS errors /
// promise rejections) failures. No external service, no account with any
// company (unlike Sentry) — consistent with the zero-external-dependency
// philosophy already used for auth/storage/database in this project.
// ---------------------------------------------------------------------------

export const errorLog = mysqlTable(
  "errorLog",
  {
    id: int("id").autoincrement().primaryKey(),
    source: mysqlEnum("source", ["backend", "frontend"]).notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    // For backend errors: the tRPC procedure path (e.g. "progress.enroll").
    // For frontend errors: the page path (e.g. "/dashboard").
    context: varchar("context", { length: 255 }),
    userId: int("userId").references(() => users.id),
    userAgent: text("userAgent"),
    resolved: int("resolved").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("errorLog_createdAt_idx").on(table.createdAt),
    sourceIdx: index("errorLog_source_idx").on(table.source),
    resolvedIdx: index("errorLog_resolved_idx").on(table.resolved),
  })
);

export type ErrorLogEntry = typeof errorLog.$inferSelect;

// ---------------------------------------------------------------------------
// Learner reports: a teacher's written progress report on one of their own
// students, surfaced to that learner's linked parent(s) (see
// server/db/reports.ts). Deliberately separate from quizAttempts/
// courseEnrollments — this is a human-authored assessment, not a derived
// metric.
// ---------------------------------------------------------------------------

export const learnerReports = mysqlTable(
  "learnerReports",
  {
    id: int("id").autoincrement().primaryKey(),
    learnerId: int("learnerId")
      .notNull()
      .references(() => users.id),
    teacherId: int("teacherId")
      .notNull()
      .references(() => users.id),
    courseId: int("courseId").references(() => courses.id),
    level: varchar("level", { length: 40 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    notes: text("notes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    learnerIdx: index("learnerReports_learnerId_idx").on(table.learnerId),
    teacherIdx: index("learnerReports_teacherId_idx").on(table.teacherId),
  })
);

export type LearnerReport = typeof learnerReports.$inferSelect;

// ---------------------------------------------------------------------------
// Per-teacher Google Calendar OAuth connection, used only to create a real
// Google Meet link for a live lesson (server/_core/googleCalendar.ts). This
// is a separate, additional OAuth grant from the existing Google *login*
// (server/_core/googleAuth.ts) — a teacher can log in with email+password
// and still separately connect Google Calendar just for this feature.
// ---------------------------------------------------------------------------

export const googleCalendarConnections = mysqlTable("googleCalendarConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  refreshToken: text("refreshToken").notNull(),
  accessToken: text("accessToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  googleEmail: varchar("googleEmail", { length: 320 }),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
});

export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;

// ---------------------------------------------------------------------------
// Tafawoq AI Teacher (server/tafawoq/). One personal-teacher profile per
// user, a per-skill knowledge-tracing state, every assessment (placement
// and practice) with its server-only answer key, a per-question attempt
// log (the evidence behind mastery, learning speed and recurring errors),
// and the generated lessons, videos and tutor dialogue.
// ---------------------------------------------------------------------------

export const tafawoqStudents = mysqlTable("tafawoqStudents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  age: int("age").notNull(),
  schoolLevel: mysqlEnum("schoolLevel", ["primary", "middle", "bem", "secondary", "bac"]).notNull(),
  // BAC stream (شعبة); null below BAC, or for a BAC student who hasn't chosen.
  stream: mysqlEnum("stream", ["sciences", "math", "techmath", "gestion", "lettres", "langues"]),
  goals: text("goals"),
  // BAC maths mark aimed for (out of 20); null until the student sets it.
  targetMark: double("targetMark"),
  // BAC platform: the stream is locked once chosen; only an admin changes it.
  streamLockedAt: timestamp("streamLockedAt"),
  secondSubject: varchar("secondSubject", { length: 32 }),
  // Foreign-languages stream: german | spanish | italian, locked with the stream.
  thirdLanguage: varchar("thirdLanguage", { length: 16 }),
  placementDoneAt: timestamp("placementDoneAt"),
  shareChatsWithParent: int("shareChatsWithParent").default(0).notNull(),
  bonusDaysCredit: int("bonusDaysCredit").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TafawoqStudent = typeof tafawoqStudents.$inferSelect;

export const tafawoqSkillStates = mysqlTable(
  "tafawoqSkillStates",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    lessonKey: varchar("lessonKey", { length: 64 }).notNull(),
    skillKey: varchar("skillKey", { length: 64 }).notNull(),
    pKnown: double("pKnown").notNull(),
    attempts: int("attempts").default(0).notNull(),
    correct: int("correct").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    studentSkillUnique: uniqueIndex("tafawoqSkillStates_student_lesson_skill").on(
      table.studentId,
      table.lessonKey,
      table.skillKey
    ),
  })
);

export const tafawoqAssessments = mysqlTable(
  "tafawoqAssessments",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    lessonKey: varchar("lessonKey", { length: 64 }).notNull(),
    // "oral": a one-question quiz asked by the tutor in conversation (often by voice).
    kind: mysqlEnum("kind", ["placement", "practice", "oral"]).notNull(),
    // Full items INCLUDING answer keys — never returned to the browser as-is.
    itemsJson: mediumtext("itemsJson").notNull(),
    source: mysqlEnum("source", ["ai", "template", "bank"]).notNull(),
    status: mysqlEnum("status", ["open", "graded"]).default("open").notNull(),
    score: int("score"),
    resultJson: mediumtext("resultJson"),
    masteryBefore: double("masteryBefore"),
    masteryAfter: double("masteryAfter"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    gradedAt: timestamp("gradedAt"),
  },
  table => ({
    studentLessonIdx: index("tafawoqAssessments_student_lesson_idx").on(
      table.studentId,
      table.lessonKey
    ),
  })
);

// Mock BAC exam: a full paper (one practice assessment per exercise), marked
// out of 20 once on hand-in.
export const tafawoqExams = mysqlTable(
  "tafawoqExams",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    stream: varchar("stream", { length: 16 }),
    // [{ assessmentId, lessonKey, points }] in paper order.
    paperJson: mediumtext("paperJson").notNull(),
    status: mysqlEnum("status", ["open", "graded"]).default("open").notNull(),
    score: double("score"),
    resultJson: mediumtext("resultJson"),
    kind: mysqlEnum("kind", ["mock", "weekly", "placement"]).default("mock").notNull(),
    subject: varchar("subject", { length: 32 }),
    weekKey: varchar("weekKey", { length: 10 }),
    // Answers saved while the paper is open; time spent per exercise.
    draftJson: mediumtext("draftJson"),
    timeJson: text("timeJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    gradedAt: timestamp("gradedAt"),
  },
  table => ({
    studentIdx: index("tafawoqExams_student_idx").on(table.studentId, table.createdAt),
    studentKindIdx: index("tafawoqExams_student_kind_idx").on(table.studentId, table.kind, table.createdAt),
  })
);

// "ارفع تمرينك": an exercise a student submits (typed and/or a photo). The
// free solver answers recognised typed exercises at once ("auto"); others
// wait ("open") for a teacher's detailed solution ("answered").
export const tafawoqExercises = mysqlTable(
  "tafawoqExercises",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    lessonKey: varchar("lessonKey", { length: 64 }),
    text: mediumtext("text"),
    note: text("note"),
    imageKey: varchar("imageKey", { length: 255 }),
    imageMime: varchar("imageMime", { length: 32 }),
    status: mysqlEnum("status", ["auto", "open", "answered"]).notNull(),
    autoJson: mediumtext("autoJson"),
    answer: mediumtext("answer"),
    answeredBy: int("answeredBy").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    answeredAt: timestamp("answeredAt"),
  },
  table => ({
    studentIdx: index("tafawoqExercises_student_idx").on(table.studentId, table.createdAt),
    statusIdx: index("tafawoqExercises_status_idx").on(table.status, table.createdAt),
  })
);

// Characters sent to the paid speech service per month (monthly cap).
export const tafawoqTtsUsage = mysqlTable("tafawoqTtsUsage", {
  month: varchar("month", { length: 32 }).primaryKey(),
  characters: bigint("characters", { mode: "number" }).default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tafawoqAttempts = mysqlTable(
  "tafawoqAttempts",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    assessmentId: int("assessmentId").notNull().references(() => tafawoqAssessments.id),
    lessonKey: varchar("lessonKey", { length: 64 }).notNull(),
    skillKey: varchar("skillKey", { length: 64 }).notNull(),
    questionId: varchar("questionId", { length: 64 }).notNull(),
    difficulty: int("difficulty").notNull(),
    correct: int("correct").notNull(),
    misconception: varchar("misconception", { length: 200 }),
    // Kind of mistake (shared/bacPlatform.ts ERROR_TYPES); null when correct.
    errorType: varchar("errorType", { length: 24 }),
    responseMs: int("responseMs"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentLessonIdx: index("tafawoqAttempts_student_lesson_idx").on(
      table.studentId,
      table.lessonKey
    ),
    studentCreatedIdx: index("tafawoqAttempts_student_created_idx").on(table.studentId, table.createdAt),
  })
);

export const tafawoqLessons = mysqlTable(
  "tafawoqLessons",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    lessonKey: varchar("lessonKey", { length: 64 }).notNull(),
    tier: mysqlEnum("tier", ["weak", "intermediate", "advanced"]).notNull(),
    contentJson: mediumtext("contentJson").notNull(),
    source: mysqlEnum("source", ["ai", "template"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentLessonIdx: index("tafawoqLessons_student_lesson_idx").on(
      table.studentId,
      table.lessonKey
    ),
  })
);

export const tafawoqVideos = mysqlTable(
  "tafawoqVideos",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    lessonKey: varchar("lessonKey", { length: 64 }).notNull(),
    personalLessonId: int("personalLessonId").references(() => tafawoqLessons.id),
    scriptJson: mediumtext("scriptJson").notNull(),
    source: mysqlEnum("source", ["ai", "template"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentLessonIdx: index("tafawoqVideos_student_lesson_idx").on(
      table.studentId,
      table.lessonKey
    ),
  })
);

export const tafawoqMessages = mysqlTable(
  "tafawoqMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    lessonKey: varchar("lessonKey", { length: 64 }).notNull(),
    role: mysqlEnum("role", ["tutor", "student"]).notNull(),
    content: text("content").notNull(),
    source: mysqlEnum("source", ["ai", "template"]),
    // Teacher message in the fixed format (shared/bacPlatform.ts TeacherMessage).
    structuredJson: mediumtext("structuredJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentLessonIdx: index("tafawoqMessages_student_lesson_idx").on(
      table.studentId,
      table.lessonKey
    ),
  })
);

// ---------------------------------------------------------------------------
// Tafawoq BAC platform (drizzle/0032_add_tafawoq_bac_platform.sql)
// ---------------------------------------------------------------------------

export const tafawoqStreamRequests = mysqlTable(
  "tafawoqStreamRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    userId: int("userId").notNull().references(() => users.id),
    fromStream: varchar("fromStream", { length: 16 }).notNull(),
    toStream: varchar("toStream", { length: 16 }).notNull(),
    fromLanguage: varchar("fromLanguage", { length: 16 }),
    toLanguage: varchar("toLanguage", { length: 16 }),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    reviewedBy: int("reviewedBy").references(() => users.id),
    reviewNote: text("reviewNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  table => ({
    statusIdx: index("tafawoqStreamRequests_status_idx").on(table.status, table.createdAt),
  })
);

export const tafawoqStreamChanges = mysqlTable("tafawoqStreamChanges", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
  studentName: varchar("studentName", { length: 100 }).notNull(),
  fromStream: varchar("fromStream", { length: 16 }).notNull(),
  toStream: varchar("toStream", { length: 16 }).notNull(),
  fromLanguage: varchar("fromLanguage", { length: 16 }),
  toLanguage: varchar("toLanguage", { length: 16 }),
  reason: text("reason").notNull(),
  adminId: int("adminId").notNull().references(() => users.id),
  adminName: varchar("adminName", { length: 200 }),
  requestId: int("requestId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const tafawoqSecondSubjectChanges = mysqlTable(
  "tafawoqSecondSubjectChanges",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    fromSubject: varchar("fromSubject", { length: 32 }),
    toSubject: varchar("toSubject", { length: 32 }),
    changedBy: int("changedBy").notNull().references(() => users.id),
    byAdmin: int("byAdmin").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentIdx: index("tafawoqSecondSubjectChanges_student_idx").on(table.studentId, table.createdAt),
  })
);

export const tafawoqSubscriptions = mysqlTable(
  "tafawoqSubscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    plan: varchar("plan", { length: 16 }).notNull(),
    months: int("months").notNull(),
    priceDa: int("priceDa").notNull(),
    amountDa: int("amountDa").notNull(),
    couponId: int("couponId").references(() => coupons.id),
    referralCodeId: int("referralCodeId").references(() => referralCodes.id),
    paymentMethod: varchar("paymentMethod", { length: 16 }).notNull(),
    paymentReference: varchar("paymentReference", { length: 120 }),
    status: mysqlEnum("status", ["pending_payment", "active", "rejected", "canceled"])
      .default("pending_payment")
      .notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    bonusDays: int("bonusDays").default(0).notNull(),
    reviewedBy: int("reviewedBy").references(() => users.id),
    reviewNote: text("reviewNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  table => ({
    userIdx: index("tafawoqSubscriptions_user_idx").on(table.userId, table.createdAt),
    statusIdx: index("tafawoqSubscriptions_status_idx").on(table.status, table.endsAt),
  })
);

export type TafawoqSubscription = typeof tafawoqSubscriptions.$inferSelect;

export const tafawoqContentSettings = mysqlTable("tafawoqContentSettings", {
  contentKey: varchar("contentKey", { length: 80 }).primaryKey(),
  enabled: int("enabled").notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tafawoqDailyPlans = mysqlTable(
  "tafawoqDailyPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    day: varchar("day", { length: 10 }).notNull(),
    planJson: mediumtext("planJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    studentDay: uniqueIndex("tafawoqDailyPlans_student_day").on(table.studentId, table.day),
  })
);

export const tafawoqBankTopics = mysqlTable("tafawoqBankTopics", {
  id: int("id").autoincrement().primaryKey(),
  subject: varchar("subject", { length: 32 }).notNull(),
  // Comma-separated platform streams.
  streams: varchar("streams", { length: 64 }).notNull(),
  year: int("year"),
  unit: varchar("unit", { length: 120 }).notNull(),
  difficulty: int("difficulty").notNull(),
  questionType: varchar("questionType", { length: 16 }).notNull(),
  kind: mysqlEnum("kind", ["full", "single"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  statement: mediumtext("statement").notNull(),
  solution: mediumtext("solution").notNull(),
  methodology: text("methodology"),
  points: double("points"),
  commonMistakes: text("commonMistakes"),
  published: int("published").default(0).notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TafawoqBankTopic = typeof tafawoqBankTopics.$inferSelect;

export const tafawoqTopicAnswers = mysqlTable(
  "tafawoqTopicAnswers",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    topicId: int("topicId").notNull().references(() => tafawoqBankTopics.id),
    answer: mediumtext("answer").notNull(),
    selfScore: double("selfScore"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentIdx: index("tafawoqTopicAnswers_student_idx").on(table.studentId, table.topicId),
  })
);

export const tafawoqSavedTopics = mysqlTable(
  "tafawoqSavedTopics",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => tafawoqStudents.id),
    topicId: varchar("topicId", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentTopic: uniqueIndex("tafawoqSavedTopics_student_topic").on(table.studentId, table.topicId),
  })
);

export const tafawoqEvents = mysqlTable(
  "tafawoqEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    event: varchar("event", { length: 48 }).notNull(),
    detailsJson: text("detailsJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    eventIdx: index("tafawoqEvents_event_idx").on(table.event, table.createdAt),
    userIdx: index("tafawoqEvents_user_idx").on(table.userId, table.createdAt),
  })
);
