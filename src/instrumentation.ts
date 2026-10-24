// Next.js server-startup hook (stable since Next 15) — runs once when the
// server process boots. Used here only to start the background job worker
// (src/lib/jobs.ts) that runs Claude grading and Gemini review off the
// request path. Guarded to the Node runtime since it touches better-sqlite3
// (a native module) through the feature modules it registers.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerGradingJobHandlers } = await import("./lib/grading");
  const { registerExamReviewJobHandler } = await import("./lib/generation");
  const { startJobWorker } = await import("./lib/jobs");

  registerGradingJobHandlers();
  registerExamReviewJobHandler();
  startJobWorker();
}
