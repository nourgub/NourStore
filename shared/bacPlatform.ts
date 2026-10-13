// Tafawoq BAC platform — streams, subjects, subscription offers and the
// vocabulary shared by the server (server/tafawoq/platform/) and the client
// (client/src/pages/tafawoq/). No server-only import: the browser bundle
// uses this file directly.
//
// What is "available" is never decided here: a subject is offered only
// when the curriculum really has lessons for it (server/tafawoq/curriculum.ts)
// and an admin has not hidden it. Everything else is shown as "coming soon".

/** The streams (الشعب) the platform serves. */
export const PLATFORM_STREAMS = ["sciences", "lettres", "langues"] as const;
export type PlatformStream = (typeof PLATFORM_STREAMS)[number];

export function isPlatformStream(value: unknown): value is PlatformStream {
  return typeof value === "string" && (PLATFORM_STREAMS as readonly string[]).includes(value);
}

/** Every BAC subject the platform knows about (content may still be missing). */
export const BAC_SUBJECTS = [
  "math",
  "physics",
  "natural_sciences",
  "arabic",
  "philosophy",
  "history_geography",
  "french",
  "english",
  "third_language",
  "german",
  "spanish",
  "italian",
  "islamic",
] as const;
export type BacSubject = (typeof BAC_SUBJECTS)[number];

export function isBacSubject(value: unknown): value is BacSubject {
  return typeof value === "string" && (BAC_SUBJECTS as readonly string[]).includes(value);
}

/** Core subjects of each stream — always part of the subscription. */
export const STREAM_CORE_SUBJECTS: Record<PlatformStream, BacSubject[]> = {
  sciences: ["math", "physics", "natural_sciences"],
  lettres: ["arabic", "philosophy", "history_geography", "french", "english"],
  langues: ["french", "english", "third_language", "arabic"],
};

/**
 * The foreign-languages stream has three specialisations: the student's
 * third language (German, Spanish or Italian) is chosen with the stream,
 * locked with it, and takes the place of "third_language" among the core
 * subjects.
 */
export const THIRD_LANGUAGES = ["german", "spanish", "italian"] as const;
export type ThirdLanguage = (typeof THIRD_LANGUAGES)[number];

export function isThirdLanguage(value: unknown): value is ThirdLanguage {
  return typeof value === "string" && (THIRD_LANGUAGES as readonly string[]).includes(value);
}

/** The core subjects of this student's stream, with their own third language. */
export function coreSubjects(stream: PlatformStream, thirdLanguage?: string | null): BacSubject[] {
  return STREAM_CORE_SUBJECTS[stream].map(subject =>
    subject === "third_language" && isThirdLanguage(thirdLanguage) ? thirdLanguage : subject
  );
}

/** Subjects a student of the stream may pick as their second subject. */
export const SECOND_SUBJECT_OPTIONS: Record<PlatformStream, BacSubject[]> = {
  sciences: ["arabic", "philosophy", "french", "english", "history_geography", "islamic"],
  lettres: ["math", "islamic"],
  langues: ["math", "philosophy", "history_geography", "islamic"],
};

/** Subject a lesson of the curriculum belongs to (curriculum subject → platform subject). */
export const CURRICULUM_SUBJECT_TO_BAC: Record<string, BacSubject> = {
  math: "math",
  physics: "physics",
  philosophy: "philosophy",
  german: "german",
  spanish: "spanish",
  italian: "italian",
  french: "french",
  english: "english",
  arabic: "arabic",
  natural_sciences: "natural_sciences",
  history_geography: "history_geography",
  islamic: "islamic",
};

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export const MONTHLY_PRICE_DA = 3000;

export const SUBSCRIPTION_PLANS = ["monthly", "quarterly", "semiannual", "annual"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

/** Months and price (DA) of each offer; longer offers are discounted. */
export const PLAN_DETAILS: Record<SubscriptionPlan, { months: number; priceDa: number }> = {
  monthly: { months: 1, priceDa: 3000 },
  quarterly: { months: 3, priceDa: 8100 },
  semiannual: { months: 6, priceDa: 15300 },
  annual: { months: 12, priceDa: 27000 },
};

export function planSavingDa(plan: SubscriptionPlan) {
  const { months, priceDa } = PLAN_DETAILS[plan];
  return months * MONTHLY_PRICE_DA - priceDa;
}

export const PAYMENT_METHODS = ["ccp", "baridimob", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SUBSCRIPTION_STATUSES = ["pending_payment", "active", "rejected", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Days before the end of a subscription when the student (and parent) are alerted. */
export const EXPIRY_WARNING_DAYS = 5;

// ---------------------------------------------------------------------------
// Levels, errors, badges
// ---------------------------------------------------------------------------

/** Placement level per subject, from weakest to strongest. */
export const PLACEMENT_LEVELS = ["beginner", "needs_support", "intermediate", "good", "advanced"] as const;
export type PlacementLevel = (typeof PLACEMENT_LEVELS)[number];

/** Kinds of mistakes recorded in the student's file. */
export const ERROR_TYPES = [
  "rule",
  "sign",
  "calculation",
  "reading",
  "method",
  "incomplete",
  "organization",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export const BADGES = [
  "first_test",
  "first_mock",
  "first_weekly",
  "exercises_50",
  "exercises_200",
  "streak_3",
  "streak_7",
  "streak_30",
  "subject_half",
  "subject_mastered",
] as const;
export type BadgeKey = (typeof BADGES)[number];

/** Reasons a server-side access check refuses a request (TRPCError messages). */
export const ACCESS_ERRORS = {
  streamRequired: "STREAM_REQUIRED",
  streamLocked: "STREAM_LOCKED",
  subjectNotAllowed: "SUBJECT_NOT_ALLOWED",
  subjectUnavailable: "SUBJECT_UNAVAILABLE",
  subscriptionRequired: "SUBSCRIPTION_REQUIRED",
  accountSuspended: "ACCOUNT_SUSPENDED",
} as const;

/** Teacher quick requests in the written/voice conversation. */
export const TEACHER_ACTIONS = ["simpler", "example", "stepHelp", "similar", "summary"] as const;
export type TeacherAction = (typeof TEACHER_ACTIONS)[number];

/** A teacher message in the platform's fixed format (title → question). */
export type TeacherMessage = {
  title: string;
  explanation: string;
  /** The law, or the steps, shown one at a time. */
  formula: string[];
  example?: { problem: string; steps: string[]; answer: string };
  question: string;
};

/**
 * What the teacher says aloud for a structured message: the title, the
 * explanation, the law, the example and its answer, the question — never
 * the section labels. One line per part, so each is its own spoken
 * sentence (shared/spokenArabic.ts) and its recording is shared by every
 * student who hears the same part.
 */
export function teacherMessageSpeech(message: TeacherMessage): string {
  return [
    message.title,
    message.explanation,
    ...message.formula,
    message.example?.problem ?? "",
    message.example?.answer ?? "",
    message.question,
  ]
    .filter(Boolean)
    .join("\n");
}
