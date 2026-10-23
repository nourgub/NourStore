// What only the platform's owner can state: who runs it and how to reach
// them, the refund policy, where data is hosted and how long it is kept.
// Nothing here is invented: an empty field is shown as "not set by the
// owner yet" on the legal pages and listed as a blocker for a commercial
// launch (launchReadiness below). The legal texts stay drafts until a lawyer
// has reviewed them; nothing in the code marks them reviewed.
import { getPlatformSetting, setPlatformSetting } from "../../db/platformSettings";
import { listContentReviews } from "../../db/contentReviews";
import { allBacLessons } from "../contentInventory";
import { contentPolicy, reviewStates } from "./reviewPolicy";

export const LEGAL_FIELDS = [
  "ownerName",
  "contactEmail",
  "contactAddress",
  "refundPolicy",
  "hostingLocation",
  "dataRetention",
  "updatedOn",
] as const;
export type LegalField = (typeof LEGAL_FIELDS)[number];

export async function legalInfo() {
  const entries = await Promise.all(LEGAL_FIELDS.map(async field => [field, ((await getPlatformSetting(`legal.${field}`)) ?? "").trim() || null] as const));
  const fields = Object.fromEntries(entries) as Record<LegalField, string | null>;
  return { fields, missing: LEGAL_FIELDS.filter(field => !fields[field]) };
}

export async function setLegalInfo(values: Partial<Record<LegalField, string | null>>) {
  for (const field of LEGAL_FIELDS) {
    if (field in values) await setPlatformSetting(`legal.${field}`, (values[field] ?? "").trim());
  }
  return legalInfo();
}

export type ReadinessCheck = {
  key: string;
  /** "ok", or what blocks: "trial" blocks even the trial, "commercial" only the paid launch. */
  status: "ok" | "commercial" | "trial";
  detail?: string | number;
};

/**
 * The checks the code can make itself. Others (a lawyer's review, a backup
 * restored, a listening test, real phones) are listed as manual and never
 * reported as done.
 */
export async function launchReadiness() {
  const legal = await legalInfo();
  const [states, policy, reviews] = await Promise.all([reviewStates(), contentPolicy(), listContentReviews()]);
  const lessons = allBacLessons();
  const approved = lessons.filter(lesson => states.get(lesson.key) === "approved").length;
  const https = (process.env.APP_BASE_URL ?? "").startsWith("https://");
  const checks: ReadinessCheck[] = [
    { key: "legal_fields", status: legal.missing.length ? "commercial" : "ok", detail: legal.missing.join(", ") },
    { key: "email", status: process.env.SMTP_URL ? "ok" : "commercial" },
    { key: "https", status: https ? "ok" : process.env.NODE_ENV === "production" ? "trial" : "commercial" },
    { key: "payment_instructions", status: (await getPlatformSetting("bac.paymentInstructions"))?.trim() ? "ok" : "commercial" },
    { key: "content_approved", status: approved === lessons.length ? "ok" : "commercial", detail: `${approved}/${lessons.length}` },
    { key: "content_policy", status: policy === "commercial" ? "ok" : "commercial", detail: policy },
    { key: "content_changed", status: Array.from(states.values()).includes("changed") ? "commercial" : "ok", detail: reviews.length },
  ];
  const manual = ["lawyer_review", "backup_restore", "voice_listening", "real_devices", "load_test"];
  return { checks, manual };
}
