import { claimJobs, completeJob, enqueueJob, failOrRequeueJob, type Job, type JobType } from "./db";

// A minimal, dependency-free background job queue: no Redis/external broker,
// state lives entirely in the `jobs` SQLite table (see db.ts). This module
// knows nothing about what a job *does* — handlers are registered by the
// feature modules that need background work (grading.ts, generation.ts),
// which keeps this file free of circular imports.
//
// Concurrency: at most CONCURRENCY jobs run at once, enforced by claimJobs's
// LIMIT. Timeout: each handler run is raced against a timeout. Retries:
// each job has maxAttempts (default 3); claimJobs only returns jobs with
// attempts < maxAttempts, so a job that keeps failing eventually becomes
// permanently 'failed' — no infinite retry loop. Dedup: enqueue() uses
// INSERT OR IGNORE on a unique idempotency key, so calling it twice for the
// same paper/question is always safe. Resumability: a job's status lives in
// the DB, not in process memory — if the server restarts mid-job, the job is
// left 'running' with an expired lease and the next poll reclaims it.

const CONCURRENCY = 3;
const POLL_INTERVAL_MS = 2000;
const LEASE_MS = 5 * 60 * 1000; // 5 minutes — well above a single grading call
const HANDLER_TIMEOUT_MS = 4 * 60 * 1000; // under the lease, so a timed-out job fails before another worker could double-claim it

// `job` is passed alongside `payload` so a handler can tell whether this is
// its last allowed attempt (job.attempts >= job.maxAttempts) and only then
// write a definitive "failed" business state — an attempt that will be
// transparently retried shouldn't flip a user-visible status to failed.
type JobHandler = (payload: Record<string, unknown>, job: Job) => Promise<Record<string, unknown>>;

const handlers = new Map<JobType, JobHandler>();

export function registerJobHandler(type: JobType, handler: JobHandler): void {
  handlers.set(type, handler);
}

export function enqueue(args: {
  id: string;
  type: JobType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
}): void {
  enqueueJob(args);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`job exceeded its ${ms}ms timeout`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function runJob(job: Job): Promise<void> {
  const handler = handlers.get(job.type);
  if (!handler) {
    failOrRequeueJob(job.id, `لا يوجد معالج مسجّل لنوع المهمة: ${job.type}`);
    return;
  }
  try {
    const result = await withTimeout(handler(job.payload, job), HANDLER_TIMEOUT_MS);
    completeJob(job.id, result);
  } catch (err) {
    // Never log raw error content here — handler payloads/results can carry
    // student answers or model output. The message alone is safe to persist.
    const message = err instanceof Error ? err.message : "خطأ غير معروف أثناء تنفيذ المهمة";
    failOrRequeueJob(job.id, message);
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let ticking = false;

async function tick(): Promise<void> {
  if (ticking) return; // never run two ticks concurrently even if the interval fires late
  ticking = true;
  try {
    const jobs = claimJobs(CONCURRENCY, LEASE_MS);
    if (jobs.length > 0) {
      await Promise.all(jobs.map((job) => runJob(job)));
    }
  } finally {
    ticking = false;
  }
}

/**
 * Starts the in-process poller — idempotent, safe to call multiple times
 * (e.g. once from instrumentation.ts and defensively from a module that
 * enqueues work). Call once per server process; in a multi-instance
 * deployment each instance runs its own poller against the same table,
 * which claimJobs's atomic UPDATE...WHERE makes safe (see db.ts), though
 * this project targets a single long-running Node process — see the
 * delivery notes for the horizontal-scaling caveat.
 */
export function startJobWorker(): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    tick().catch(() => {
      // tick() already catches per-job errors; this guards the interval
      // callback itself against an unexpected rejection stopping future ticks.
    });
  }, POLL_INTERVAL_MS);
  // Node keeps the process alive while this timer is active, which is
  // exactly what a long-running `next start` server needs.
}
