// Real, reusable static-analysis check — not a one-off audit note. Run it
// any time a file under server/routers/ changes:
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
// Scans every file directly under server/routers/ (the actual 19 domain
// routers) — NOT server/routers.ts itself, which has been a ~40-line
// composition/barrel file importing those 19 files for a while now and
// contains no procedure declarations of its own. Scanning only that
// barrel silently found (and reported success on) zero procedures — a
// real bug in this script itself, caught while re-verifying it for this
// pass, not a new regression from this session's own file splits.
//
// Exits with a non-zero code and a clear report when it finds anything —
// safe to wire into CI once this project has one.

import fs from "fs";
import path from "path";

const ROUTERS_DIR = path.resolve(import.meta.dirname, "../server/routers");

type Finding = { file: string; line: number; name: string; kind: string };

// Matches the start of ANY router-key procedure declaration, regardless of
// which builder it uses — used only to find where the CURRENT procedure's
// block ends. Scoping the end boundary to "the next match of the same
// family" (the original version of this script) undercounts: a file that
// mixes e.g. one publicProcedure between two protectedProcedures leaves the
// first protectedProcedure's block running all the way into the second
// one's body, or — worse, at the end of a family's matches in a file — the
// arbitrary 40-line fallback can cut a real handler off before it ever
// reaches its own ctx.user reference, exactly as it did for
// placement.ts's `submit` (ctx.user.id is used, just past line 40 of that
// procedure) until this was fixed.
const ANY_PROCEDURE_START =
  /^\s+\w+:\s*(protectedProcedure|publicProcedure|adminProcedure|roleProcedure|learnerProcedure|parentProcedure|teacherProcedure|institutionProcedure)\b/;

function scanFamily(
  file: string,
  lines: string[],
  allStarts: number[],
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
  starts.forEach(start => {
    if (extraFilter && !extraFilter(start.match)) return;
    const nextAnyStart = allStarts.find(i => i > start.lineIndex);
    const endIndex = nextAnyStart ?? lines.length;
    const block = lines.slice(start.lineIndex, endIndex).join("\n");
    const hasIdInput = /\w*[Ii]d:\s*z\.number/.test(block);
    const usesCtxUser = block.includes("ctx.user");
    if (hasIdInput && !usesCtxUser) {
      findings.push({
        file,
        line: start.lineIndex + 1,
        name: start.name,
        kind: start.match[2],
      });
    }
  });
  return { scanned: starts.length, findings };
}

function main() {
  const files = fs
    .readdirSync(ROUTERS_DIR)
    .filter(f => f.endsWith(".ts"))
    .sort();

  let learnerScanned = 0;
  let authoringScanned = 0;
  const allFindings: Finding[] = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(ROUTERS_DIR, file), "utf-8");
    const lines = source.split("\n");
    const relFile = `server/routers/${file}`;
    const allStarts: number[] = [];
    lines.forEach((line, i) => {
      if (ANY_PROCEDURE_START.test(line)) allStarts.push(i);
    });

    const learnerFamily = scanFamily(
      relFile,
      lines,
      allStarts,
      /^\s+(\w+):\s*(protectedProcedure|learnerProcedure|parentProcedure)\b/
    );
    const authoringFamily = scanFamily(
      relFile,
      lines,
      allStarts,
      /^\s+(\w+):\s*(roleProcedure)\s*\(\s*\[([^\]]+)\]/,
      m => m[3].includes("teacher") || m[3].includes("institution")
    );

    learnerScanned += learnerFamily.scanned;
    authoringScanned += authoringFamily.scanned;
    allFindings.push(...learnerFamily.findings, ...authoringFamily.findings);
  }

  console.log(`Scanned ${files.length} router files under server/routers/.`);
  console.log(
    `Scanned ${learnerScanned} learner-facing procedures (protectedProcedure/learnerProcedure/parentProcedure).`
  );
  console.log(
    `Scanned ${authoringScanned} teacher/institution-facing roleProcedure procedures.`
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
    console.error(`  ${f.file}:${f.line}  ${f.name} (${f.kind})`);
  }
  process.exit(1);
}

main();
