// Runs the real-database test suites against a throwaway MySQL that this
// script starts itself — no Docker, no external database, nothing to
// configure. Exists because `npm run test:db` requires a DATABASE_URL the
// caller has to provide, which makes the real-DB suites easy to skip and
// therefore easy to let rot.
//
// It uses the `mysql-memory-server` package already in devDependencies (the
// same one scripts/replit-fetch-mysql-binary.mjs uses): a real MySQL binary,
// fetched over HTTPS on first run and cached, started on a random port with
// a temporary data directory that is thrown away at the end.
//
// Usage:
//   node scripts/test-db-memory.mjs                 # every real-DB suite
//   node scripts/test-db-memory.mjs server/realDbTeacherAssistant.e2e.test.ts
//
// Requires the MySQL server's own shared libraries to be present on Linux
// (libaio1t64 and libnuma1 on Debian/Ubuntu). If they are missing, mysqld
// fails to start and this script says so rather than silently skipping the
// tests — use `npm run test:db` against a real MySQL instead.

import { createDB } from "mysql-memory-server";
import { spawnSync } from "child_process";

const DEFAULT_SUITES = [
  "server/realDb.e2e.test.ts",
  "server/realDbTeacherAssistant.e2e.test.ts",
];
const suites = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_SUITES;

let db;
try {
  db = await createDB({ username: "root", dbName: "nourix_test" });
} catch (error) {
  console.error(
    "Could not start a temporary MySQL: " +
      (error instanceof Error ? error.message : String(error)) +
      "\nInstall the MySQL server's shared libraries (on Debian/Ubuntu: " +
      "libaio1t64 and libnuma1), or run `npm run test:db` against a real " +
      "MySQL with DATABASE_URL set."
  );
  process.exit(1);
}

const databaseUrl = `mysql://root@127.0.0.1:${db.port}/nourix_test`;
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  // The suites build real sessions; any long, non-empty value satisfies
  // checkEnv's minimum. Test-only, never a deployment secret.
  JWT_SECRET: process.env.JWT_SECRET ?? "test-only-secret-at-least-16-chars",
};

try {
  console.log(`Temporary MySQL up on port ${db.port}. Applying migrations...`);
  const migrate = spawnSync("node", ["scripts/migrate.mjs"], {
    stdio: "inherit",
    env,
  });
  if (migrate.status !== 0) {
    process.exitCode = migrate.status ?? 1;
  } else {
    const test = spawnSync("npx", ["vitest", "run", ...suites], {
      stdio: "inherit",
      env,
    });
    process.exitCode = test.status ?? 1;
  }
} finally {
  await db.stop();
}
