// Real end-to-end verification: hidden algorithm-lab test cases must never
// leak through the public-facing exercise query, while still genuinely
// being used to grade a submitted attempt. Run against the actual running
// server + real MySQL, inspecting the raw HTTP response body — the same
// standard used for the passwordHash-leak fix earlier in this project.
//
// Run with:
//   DATABASE_URL=mysql://user:pass@host:3306/db JWT_SECRET=... \
//   npx tsx scripts/verify-algorithm-lab-hidden-cases.ts

import { spawn } from "child_process";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { algorithmExercises } from "../drizzle/schema";
import { createAlgorithmExercise, setAlgorithmExercisePublished } from "../server/db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

const PORT = 3058;

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("Server did not become healthy in time");
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();
  const slug = `hidden-case-verify-${tag}`;

  console.log("1. Creating a real exercise with a visible case AND a hidden case with a secret value...");
  const SECRET_MARKER = `SECRET_HIDDEN_VALUE_${tag}`;
  await createAlgorithmExercise({
    slug,
    difficulty: "starter",
    titleAr: "ت", titleFr: "T", titleEn: "T",
    statementAr: "س", statementFr: "S", statementEn: "S",
    starterCode: "DEBUT\nREAD(A)\nREAD(B)\nSUM ← A + B\nWRITE(SUM)\nFIN",
    testCasesJson: JSON.stringify({
      displayCases: [{ input: "2, 3", output: "5" }],
      hiddenCases: [{ input: "40, 2", output: SECRET_MARKER }],
    }),
  });
  const exerciseRow = (await db.select().from(algorithmExercises).where(eq(algorithmExercises.slug, slug)).limit(1))[0];
  await setAlgorithmExercisePublished(exerciseRow.id, true);

  console.log("2. Starting the real server...");
  const server = spawn("npx", ["tsx", "server/_core/index.ts"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout?.on("data", d => (serverOutput += d.toString()));
  server.stderr?.on("data", d => (serverOutput += d.toString()));

  try {
    await waitForServer();

    console.log("3. Fetching the exercise via the REAL public tRPC query, exactly as the browser does...");
    const res = await fetch(
      `http://localhost:${PORT}/api/trpc/learning.algorithmExercise?input=${encodeURIComponent(JSON.stringify({ json: { slug } }))}`
    );
    const rawText = await res.text();
    assert(res.status === 200, `public exercise query must return 200, got ${res.status}`);

    console.log("4. Inspecting the RAW response body for the hidden case's secret value...");
    assert(
      !rawText.includes(SECRET_MARKER),
      "LEAK: the hidden case's secret output value appeared in the public response!"
    );
    assert(
      !rawText.includes("40, 2"),
      "LEAK: the hidden case's secret input value appeared in the public response!"
    );
    assert(
      !rawText.includes("hiddenCases"),
      "LEAK: the raw testCasesJson still contains a hiddenCases key in the public response!"
    );
    assert(rawText.includes("2, 3"), "the real visible case must still be present");

    console.log("5. Submitting a solution hardcoded to only the visible case — must FAIL via the hidden case...");
    // Register + log in a real learner first.
    const email = `hidden-case-learner-${tag}@example.com`;
    await fetch(`http://localhost:${PORT}/api/trpc/auth.registerWithEmail`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { email, password: "SuperSecret123!", name: "Hidden Case Learner" } }),
    });
    const loginRes = await fetch(`http://localhost:${PORT}/api/trpc/auth.loginWithEmail`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { email, password: "SuperSecret123!" } }),
    });
    const cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
    assert(cookie, "login must return a real session cookie");

    const submitRes = await fetch(`http://localhost:${PORT}/api/trpc/algorithmLab.submitAttempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie! },
      body: JSON.stringify({ json: { exerciseId: exerciseRow.id, code: "DEBUT\nREAD(A)\nREAD(B)\nWRITE(5)\nFIN" } }),
    });
    const submitBody = await submitRes.json();
    const graded = submitBody.result.data.json;
    assert(graded.status === "failed", `hardcoded-only-visible-case solution must FAIL via the hidden case, got status=${graded.status}`);
    assert(graded.passedTests === 1 && graded.totalTests === 2, `expected 1/2 passed (visible only), got ${graded.passedTests}/${graded.totalTests}`);

    console.log("6. Confirming the submitAttempt RESPONSE also never leaks the hidden case's real values...");
    const submitRaw = JSON.stringify(submitBody);
    assert(!submitRaw.includes(SECRET_MARKER), "LEAK: the hidden case's secret value appeared in the submitAttempt response!");
    assert(!submitRaw.includes("40, 2"), "LEAK: the hidden case's secret input appeared in the submitAttempt response!");

    console.log("\n✅ ALL HIDDEN TEST CASE ASSERTIONS PASSED against a real running server + real MySQL:");
    console.log("   - Public exercise query never includes hiddenCases, its input, or its output");
    console.log("   - A solution that only satisfies the visible case is correctly caught and FAILED by the hidden case");
    console.log("   - The graded submitAttempt response itself never leaks the hidden case's real values either");
  } finally {
    server.kill();
    if (process.exitCode && process.exitCode !== 0) {
      console.error("--- server output ---\n" + serverOutput.slice(-4000));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
