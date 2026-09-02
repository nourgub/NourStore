// Real, reusable static-analysis check — not a one-off audit note. Run it
// any time server/routers.ts changes:
//
//   npx tsx scripts/audit-endpoint-ownership.ts
//
// What it checks: every protectedProcedure/learnerProcedure/parentProcedure
// (learner-facing) and every roleProcedure that allows "teacher" or
// "institution" (content-authoring) whose input takes an id-like field
// (courseId, lessonId, ticketId, etc.) MUST reference `ctx.user` somewhere
// in its handler body. A procedure that takes someone else's resource id
// but never consults who's actually asking is the textbook shape of an
// IDOR (insecure direct object reference) vulnerability — this doesn't
// prove the ownership check inside is *correct*, only that one exists at
// all, which is still a real, meaningful regression guard: it is exactly
// the class of mistake that's easy to introduce by accident (copy a
// procedure, forget to wire ctx.user through) and easy to catch this way.
//
// Exits with a non-zero code and a clear report when it finds anything —
// safe to wire into CI once this project has one.

import fs from "fs";
import path from "path";

const ROUTERS_PATH = path.resolve(import.meta.dirname, "../server/routers.ts");

type Finding = { line: number; name: string; kind: string };

function scanFamily(
  lines: string[],
  declPattern: RegExp,
  extraFilter?: (groups: RegExpMatchArray) => boolean
): { scanned: number; findings: Finding[] } {
  const starts: { lineIndex: number; name: string; match: RegExpMatchArray }[] =
    [];
  lines.forEach((line, i) => {
    const m = line.match(declPattern);
    if (m) starts.push({ lineIndex: i, name: m[1], match: m });
  });

  const findings: Finding[] = [];
  starts.forEach((start, idx) => {
    if (extraFilter && !extraFilter(start.match)) return;
    const endIndex =
      idx + 1 < starts.length
        ? starts[idx + 1].lineIndex
        : Math.min(start.lineIndex + 40, lines.length);
    const block = lines.slice(start.lineIndex, endIndex).join("\n");
    const hasIdInput = /\w*[Ii]d:\s*z\.number/.test(block);
    const usesCtxUser = block.includes("ctx.user");
    if (hasIdInput && !usesCtxUser) {
      findings.push({
        line: start.lineIndex + 1,
        name: start.name,
        kind: start.match[2],
      });
    }
  });
  return { scanned: starts.length, findings };
}

function main() {
  const source = fs.readFileSync(ROUTERS_PATH, "utf-8");
  const lines = source.split("\n");

  const learnerFamily = scanFamily(
    lines,
    /^\s+(\w+):\s*(protectedProcedure|learnerProcedure|parentProcedure)\b/
  );
  const authoringFamily = scanFamily(
    lines,
    /^\s+(\w+):\s*(roleProcedure)\s*\(\s*\[([^\]]+)\]/,
    m => m[3].includes("teacher") || m[3].includes("institution")
  );

  const allFindings = [...learnerFamily.findings, ...authoringFamily.findings];

  console.log(
    `Scanned ${learnerFamily.scanned} learner-facing procedures (protectedProcedure/learnerProcedure/parentProcedure).`
  );
  console.log(
    `Scanned ${authoringFamily.scanned} teacher/institution-facing roleProcedure procedures.`
  );

  if (allFindings.length === 0) {
    console.log(
      "\n✅ No suspicious procedures found — every id-taking procedure in " +
        "these two families references ctx.user somewhere in its handler."
    );
    process.exit(0);
  }

  console.error(
    `\n❌ Found ${allFindings.length} procedure(s) that take an id-like ` +
      "input but never reference ctx.user — review these for a possible " +
      "IDOR (any authenticated user could potentially act on another " +
      "user's resource just by knowing/guessing its id):\n"
  );
  for (const f of allFindings) {
    console.error(`  server/routers.ts:${f.line}  ${f.name} (${f.kind})`);
  }
  process.exit(1);
}

main();
