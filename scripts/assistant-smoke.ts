// One real call per teacher-assistant module, against the real Claude API.
//
// Everything else in this repo's test suite stubs the HTTP layer, which proves
// the request is built correctly and the response is parsed correctly — and
// proves nothing about whether the ANSWER is any good. That question cannot be
// answered by a unit test; it needs a real key, a real call, and a human
// reading the Arabic. This script is what makes that a five-minute check
// rather than a project.
//
// It asserts only what can be asserted mechanically — the call succeeded, the
// answer is in Arabic, it is long enough to be a real answer, module 3's JSON
// parses into a grading scale whose marks add up — and then PRINTS each result
// for a maths teacher to judge. It never writes to the database and never
// touches a pupil's data: the "pupil paper" below is invented, deliberately
// with one sound method spoiled by an arithmetic slip, because partial credit
// for a correct method is the behaviour most worth eyeballing.
//
// Run with:  ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/assistant-smoke.ts
//
// It costs real money — four calls on a large model — so it is not wired into
// `npm test` and never runs in CI by accident.

import { generateMathLessonPlan } from "../server/lessonPlanner";
import { designMathExam } from "../server/examDesigner";
import {
  solveMathExam,
  formatSolutionsForExport,
} from "../server/examSolutions";
import { gradeStudentPaper } from "../server/paperGrader";
import { isClaudeConfigured, claudeModel } from "../server/claudeClient";

const ARABIC = /[؀-ۿ]/;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`❌ ${message}`);
}

/** Every module answers in Arabic and at length — anything else is a failure. */
function checkArabicAnswer(label: string, text: string, minLength = 400) {
  assert(ARABIC.test(text), `${label}: the answer is not in Arabic`);
  assert(
    text.length >= minLength,
    `${label}: the answer is ${text.length} characters — too short to be a real one`
  );
}

function show(title: string, body: string) {
  console.log(`\n${"═".repeat(72)}\n${title}\n${"═".repeat(72)}\n${body}\n`);
}

async function main() {
  if (!isClaudeConfigured()) {
    console.error(
      "ANTHROPIC_API_KEY is not set. This script makes REAL API calls — there is nothing to smoke-test without a key."
    );
    process.exit(1);
  }
  console.log(`Model: ${claudeModel()}\n`);

  // ---- 1 — تحضير الدروس -----------------------------------------------
  const level = "الرابعة متوسط";
  const plan = await generateMathLessonPlan({
    level,
    topic: "نظرية طاليس",
    durationMinutes: 55,
    priorKnowledge: "التلاميذ يتقنون التناسبية والمثلثات المتشابهة.",
  });
  assert(plan.ok, `module 1 failed: ${plan.ok ? "" : plan.message}`);
  checkArabicAnswer("module 1 (lesson plan)", plan.text, 800);
  show("1 — تحضير الدروس", plan.text);

  // ---- 2 — تصميم الامتحانات -------------------------------------------
  const exam = await designMathExam({
    level,
    topics: ["نظرية طاليس", "التناسبية"],
    durationMinutes: 60,
    totalPoints: 20,
  });
  assert(exam.ok, `module 2 failed: ${exam.ok ? "" : exam.message}`);
  checkArabicAnswer("module 2 (exam paper)", exam.text, 400);
  show("2 — تصميم الامتحانات", exam.text);

  // ---- 3 — التصحيح النموذجي وسلم التنقيط -------------------------------
  const solutions = await solveMathExam({ examText: exam.text });
  assert(
    solutions.ok,
    `module 3 failed: ${solutions.ok ? "" : solutions.message}`
  );
  show(
    "3 — التصحيح النموذجي وسلم التنقيط",
    formatSolutionsForExport(solutions.questions, solutions.json)
  );
  // The one module with a machine-checkable contract: it must be JSON in the
  // agreed shape, because module 4 reasons over it.
  assert(
    solutions.parseError === null,
    `module 3 returned JSON that does not match the agreed shape: ${solutions.parseError}`
  );
  assert(
    solutions.questions && solutions.questions.length > 0,
    "module 3 returned no questions"
  );
  assert(
    solutions.totalPoints !== null,
    "module 3's grading scale has no total — the marks did not add up to a number"
  );
  console.log(
    `Grading scale: ${solutions.questions.length} question(s), ${solutions.totalPoints} point(s) in total.`
  );

  // ---- 4 — تصحيح ورقة تلميذ -------------------------------------------
  // Invented, never a real pupil's work. The method is sound and the
  // arithmetic is not: partial credit here is the behaviour worth reading.
  const studentAnswer = `التمرين الأول:
بما أن (MN) يوازي (BC) فإننا نطبق نظرية طاليس:
AM/AB = AN/AC = MN/BC
لدينا AM = 3 و AB = 5 و BC = 8
إذن MN = (3 × 8) / 5 = 24/5 = 4.5

التمرين الثاني: لم أتمكن من حله.`;
  const report = await gradeStudentPaper({
    solutionsJson: solutions.json,
    studentAnswerText: studentAnswer,
  });
  assert(report.ok, `module 4 failed: ${report.ok ? "" : report.message}`);
  checkArabicAnswer("module 4 (paper grading)", report.text, 200);
  show("4 — تصحيح ورقة التلميذ", report.text);

  console.log(
    "\n✅ Four real calls succeeded and every mechanical check passed.\n" +
      "   The remaining question — is the maths right, and is the Arabic the Arabic a\n" +
      "   teacher would use — is above the machine's pay grade. Read the four sections above."
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
