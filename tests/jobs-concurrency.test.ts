// Fills a gap explicitly flagged in DELIVERY_SUMMARY.md: the background job
// queue (src/lib/jobs.ts) had only been exercised with a single job in
// flight. This drives the real claim-and-run cycle (runOneWorkerTick, the
// exact function startJobWorker's interval calls) against a temporary,
// isolated SQLite database — no network calls, no Claude/Gemini API calls —
// to verify, under genuine concurrent execution:
//   1. the CONCURRENCY cap (3) is never exceeded even with more jobs queued,
//   2. every job runs exactly once (no double-claim across overlapping ticks),
//   3. idempotency-key dedup prevents a duplicate enqueue from ever running,
//   4. a handler that keeps failing is retried up to maxAttempts, then
//      permanently marked 'failed' and never claimed again.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-jobs-test-"));
process.env.DATA_DIR = tmpDir;

let enqueue: typeof import("../src/lib/jobs").enqueue;
let registerJobHandler: typeof import("../src/lib/jobs").registerJobHandler;
let runOneWorkerTick: typeof import("../src/lib/jobs").runOneWorkerTick;
let findJobByIdempotencyKey: typeof import("../src/lib/db").findJobByIdempotencyKey;

before(async () => {
  const jobs = await import("../src/lib/jobs");
  const db = await import("../src/lib/db");
  enqueue = jobs.enqueue;
  registerJobHandler = jobs.registerJobHandler;
  runOneWorkerTick = jobs.runOneWorkerTick;
  findJobByIdempotencyKey = db.findJobByIdempotencyKey;
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function drain(keys: string[], maxTicks: number): Promise<void> {
  for (let i = 0; i < maxTicks; i++) {
    const allTerminal = keys.every((k) => {
      const job = findJobByIdempotencyKey(k);
      return job && (job.status === "done" || job.status === "failed");
    });
    if (allTerminal) return;
    await runOneWorkerTick();
  }
}

test("CONCURRENCY cap is respected and every queued job runs exactly once", async () => {
  const executed: string[] = [];
  let current = 0;
  let maxObserved = 0;

  registerJobHandler("grade_paper_claude", async (payload) => {
    current++;
    maxObserved = Math.max(maxObserved, current);
    await sleep(40); // real async work — overlaps genuinely within a tick's Promise.all
    current--;
    executed.push(payload.n as string);
    return { ok: true };
  });

  const N = 7;
  const keys = Array.from({ length: N }, (_, i) => `concurrency-key-${i}`);
  for (let i = 0; i < N; i++) {
    enqueue({
      id: `concurrency-job-${i}`,
      type: "grade_paper_claude",
      idempotencyKey: keys[i],
      payload: { n: String(i) },
    });
  }

  await drain(keys, 10);

  assert.equal(executed.length, N, "every job must run exactly once");
  assert.equal(new Set(executed).size, N, "no job was run more than once");
  assert.equal(maxObserved, 3, "at most CONCURRENCY (3) jobs should run at the same instant");

  for (const key of keys) {
    assert.equal(findJobByIdempotencyKey(key)!.status, "done");
  }
});

test("enqueue is idempotent: a duplicate idempotency key never creates a second job or runs twice", async () => {
  let callCount = 0;
  registerJobHandler("review_exam_gemini", async () => {
    callCount++;
    return { ok: true };
  });

  const key = "dedup-key-1";
  enqueue({ id: "dedup-job-a", type: "review_exam_gemini", idempotencyKey: key, payload: {} });
  enqueue({ id: "dedup-job-b", type: "review_exam_gemini", idempotencyKey: key, payload: {} });

  const stored = findJobByIdempotencyKey(key);
  assert.ok(stored);
  assert.equal(stored!.id, "dedup-job-a", "the first enqueue wins; the second is ignored");

  await drain([key], 5);

  assert.equal(callCount, 1, "the deduplicated job must only run once");
});

test("a handler that keeps failing is retried up to maxAttempts, then permanently failed and never reclaimed", async () => {
  let callCount = 0;
  registerJobHandler("review_paper_gemini", async () => {
    callCount++;
    throw new Error("simulated persistent failure");
  });

  const key = "retry-key-1";
  enqueue({
    id: "retry-job-1",
    type: "review_paper_gemini",
    idempotencyKey: key,
    payload: {},
    maxAttempts: 2,
  });

  await drain([key], 10);

  const job = findJobByIdempotencyKey(key)!;
  assert.equal(job.status, "failed");
  assert.equal(job.attempts, 2);
  assert.equal(callCount, 2, "exactly maxAttempts calls — no over-retry");
  assert.match(job.error ?? "", /simulated persistent failure/);

  // Further ticks must never reclaim a permanently-failed job.
  await runOneWorkerTick();
  await runOneWorkerTick();
  assert.equal(callCount, 2, "a permanently failed job must never run again");
});
