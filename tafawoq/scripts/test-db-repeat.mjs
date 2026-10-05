// Repeats `pnpm run test:db` a fixed number of times in a row, stopping at
// the first failure. Exists to check for real-database test flakiness
// (intermittent, timing-dependent failures a single run can't catch) rather
// than assuming stability from one green run.
//
// Usage:
//   DATABASE_URL="mysql://user:pass@localhost:3306/db" JWT_SECRET=... \
//     node scripts/test-db-repeat.mjs [count]
// `count` defaults to 5. Never runs without DATABASE_URL already set by the
// caller — same explicit opt-in as `pnpm run test:db` itself, so this never
// fires against a database nobody meant to run tests against.

import { spawnSync } from "child_process";

const count = Number(process.argv[2]) || 5;

if (!process.env.DATABASE_URL) {
  console.error(
    "ERROR: DATABASE_URL must be set. This script repeats `pnpm run test:db`, " +
      "which only runs anything against a real, explicitly-chosen test database " +
      "— refusing to run with no DATABASE_URL rather than silently doing nothing " +
      count +
      " times."
  );
  process.exit(1);
}

console.log(`Running test:db ${count} time(s) in a row, stopping at the first failure.\n`);

for (let run = 1; run <= count; run++) {
  console.log(`=== test:db run ${run}/${count} ===`);
  const result = spawnSync(
    "npx",
    ["vitest", "run", "server/realDb.e2e.test.ts"],
    { stdio: "inherit", env: process.env }
  );
  if (result.status !== 0) {
    console.error(`\n❌ FAILED on run ${run}/${count} (exit code ${result.status}).`);
    process.exit(result.status ?? 1);
  }
  console.log("");
}

console.log(`✅ All ${count} run(s) of test:db passed.`);
