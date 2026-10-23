// Pedagogical review of each lesson by a human teacher (drizzle/0035).
// Only an admin records a review, naming the reviewing teacher; nothing
// sets "approved" automatically.
import { tafawoqContentReviews } from "../../drizzle/schema";
import { getDb } from "./shared";

export type ReviewStatus = "unreviewed" | "in_review" | "approved" | "needs_changes";

export async function listContentReviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tafawoqContentReviews);
}

export async function saveContentReview(input: {
  lessonKey: string;
  status: ReviewStatus;
  reviewerName: string | null;
  note: string | null;
  updatedBy: number;
  /** Set when approving: the fingerprint of the content approved. */
  contentHash: string | null;
  source: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(tafawoqContentReviews)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        status: input.status,
        reviewerName: input.reviewerName,
        note: input.note,
        updatedBy: input.updatedBy,
        contentHash: input.contentHash,
        source: input.source,
      },
    });
}
