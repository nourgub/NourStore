// Barrel re-export — the actual implementation lives in server/db/*.ts,
// split by domain for maintainability. Every existing import of the form
// `import { x } from "./db"` continues to work unchanged.

export * from "./db/adminAudit";
export * from "./db/usersAuth";
export * from "./db/subjects";
export * from "./db/algorithmLab";
export * from "./db/parent";
export * from "./db/placement";
export * from "./db/quizzes";
export * from "./db/courses";
export * from "./db/notifications";
export * from "./db/platformSettings";
export * from "./db/certificates";
export * from "./db/subscriptions";
export * from "./db/whatsappPayments";
export * from "./db/skills";
export * from "./db/gamification";
export * from "./db/support";
export * from "./db/coupons";
export * from "./db/errorLog";
export * from "./db/reports";
export * from "./db/googleCalendarConnections";
export { getDb } from "./db/shared";
