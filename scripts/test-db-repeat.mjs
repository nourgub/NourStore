// Repeats `npm run test:db` a fixed number of times in a row, stopping at
// the first failure. Exists to check for real-database test flakiness
// (intermittent, timing-dependent failures a single run can't catch) rather
// than assuming stability from one green run.
//
// Usage:
//   DATABASE_URL="mysql://user:pass@localhost:3306/db" JWT_SECRET=... \
//     node scripts/test-db-repeat.mjs [count]
// `count` defaults to 5. Never runs without DATABASE_URL already set by the
// caller — same explicit opt-in as `npm run test:db` itself, so this never
// fires against a database nobody meant to run tests against.

import { spawnSync } from "child_process";

const count = Number(process.argv[2]) || 5;

if (!process.env.DATABASE_URL) {
  console.error(
    "ERROR: DATABASE_URL must be set. This script repeats `npm run test:db`, " +
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
  // Runs the package.json "test:db" script itself, so the list of
  // real-database test files is defined in one place only.
  const result = spawnSync("npm", ["run", "--silent", "test:db"], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n❌ FAILED on run ${run}/${count} (exit code ${result.status}).`);
    process.exit(result.status ?? 1);
  }
  console.log("");
}

console.log(`✅ All ${count} run(s) of test:db passed.`);
