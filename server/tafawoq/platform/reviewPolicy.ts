// The pedagogical review of lessons as a policy: the fingerprint of a
// lesson's content (an approval goes stale when the content changes), each
// lesson's review state, and what is shown of content no teacher approved:
// in "trial" mode (default) it is shown with a notice; in "commercial" mode
// it is not opened to learners who have not started it — learners who had
// already started keep it (with the notice), so nothing disappears suddenly.
import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import { getPlatformSetting } from "../../db/platformSettings";
import { listContentReviews } from "../../db/contentReviews";
import * as store from "../../db/tafawoq";
import { getLesson, type Lesson } from "../curriculum";

// ---------------------------------------------------------------------------
// Content fingerprint and review policy
// ---------------------------------------------------------------------------

const hashes = new Map<string, string>();

/**
 * Fingerprint of everything a student sees from a lesson: skills, examples,
 * dialogues, the question bank, misconceptions, and the generators' code
 * (a template is reviewed once; its numeric instances are not reviewed one by one).
 */
export function lessonContentHash(lesson: Lesson): string {
  const cached = hashes.get(lesson.key);
  if (cached) return cached;
  const content = JSON.stringify({
    title: lesson.title,
    skills: lesson.skills,
    misconceptions: lesson.misconceptions,
    remedies: lesson.remedies ?? null,
    bank: lesson.bank,
    generators: (lesson.generators ?? []).map(generator => [generator.id, generator.skill, generator.difficulty, generator.generate.toString()]),
    problems: (lesson.problems ?? []).map(problem => String((problem as { id?: string }).id ?? "") + JSON.stringify(problem, (_, value) => (typeof value === "function" ? value.toString() : value))),
  });
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 32);
  hashes.set(lesson.key, hash);
  return hash;
}

export type ReviewState = "approved" | "changed" | "in_review" | "needs_changes" | "unreviewed";

/** The review state of each lesson, with "changed" when the content moved after approval. */
let cache: { at: number; states: Map<string, ReviewState> } | null = null;

export function clearReviewCache() {
  cache = null;
}

export async function reviewStates(): Promise<Map<string, ReviewState>> {
  if (cache && Date.now() - cache.at < 60_000) return cache.states;
  const rows = await listContentReviews();
  const states = new Map<string, ReviewState>();
  for (const row of rows) {
    const lesson = getLesson(row.lessonKey);
    if (!lesson) continue;
    states.set(row.lessonKey, row.status === "approved" && row.contentHash && row.contentHash !== lessonContentHash(lesson) ? "changed" : row.status);
  }
  cache = { at: Date.now(), states };
  return states;
}

/** "trial" (default): unapproved content is shown with a notice. "commercial": it is not opened to new learners. */
export async function contentPolicy(): Promise<"trial" | "commercial"> {
  return (await getPlatformSetting("bac.contentPolicy")) === "commercial" ? "commercial" : "trial";
}


export async function lessonReviewState(lessonKey: string): Promise<ReviewState> {
  return (await reviewStates()).get(lessonKey) ?? "unreviewed";
}

/** Commercial mode: a lesson no teacher approved opens only for a learner who had already started it. */
export async function requireReviewedOrStarted(studentId: number, lessonKey: string) {
  if ((await contentPolicy()) !== "commercial") return;
  if ((await lessonReviewState(lessonKey)) === "approved") return;
  const started = (await store.getAllSkillStates(studentId)).some(state => state.lessonKey === lessonKey);
  if (!started) throw new TRPCError({ code: "FORBIDDEN", message: "CONTENT_NOT_REVIEWED" });
}
