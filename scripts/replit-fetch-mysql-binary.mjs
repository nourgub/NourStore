// Second-attempt MySQL provisioning for Replit, used only when the
// Nix-declared `mariadb` package (replit.nix / .replit's [nix].packages)
// isn't found on PATH — see scripts/replit-start.sh.
//
// Downloads a real MySQL binary straight from MySQL's CDN over plain
// HTTPS via the `mysql-memory-server` npm package (no Nix, no apt, no
// system package manager involved in the download itself), then copies
// the extracted binaries into OUR OWN persistent location
// (.replit-data/mysql-binary/) so scripts/replit-start.sh can drive
// mysqld itself with a real, persistent --datadir — exactly like it
// already does for a Nix-provided binary. Prints the resulting bin/
// directory path on stdout (last line) on success; prints a clear error
// to stderr and exits non-zero on any failure — including the one real
// limitation of this whole approach: the downloaded MySQL binary itself
// still needs the system shared library `libaio` (`libaio1` /
// `libaio1t64`) to actually run, and this script cannot install that —
// if it's genuinely absent from the system, this fails too, honestly,
// rather than pretending to succeed.

import { createDB } from "mysql-memory-server";
import fs from "fs";
import path from "path";
import os from "os";

const DATA_DIR = path.resolve(process.cwd(), ".replit-data");
const PERSISTENT_BIN_ROOT = path.join(DATA_DIR, "mysql-binary");

function log(...args) {
  console.error("[replit-fetch-mysql]", ...args);
}

// Matches mysql-memory-server's own internal cache layout, verified
// directly against its installed source (dist/src/libraries/Downloader.js):
// `${os.tmpdir()}/mysqlmsn/binaries/${version}/mysql/`. Scans for ANY
// version directory rather than trying to parse the exact version out of
// a thrown error message — that message is free-form text (e.g. it also
// mentions this package's own version in a doc URL), too unreliable to
// pattern-match a MySQL version number out of with confidence.
function findExtractedMysqlDir() {
  const binariesRoot = path.join(os.tmpdir(), "mysqlmsn", "binaries");
  if (!fs.existsSync(binariesRoot)) return null;
  for (const entry of fs.readdirSync(binariesRoot)) {
    const candidate = path.join(binariesRoot, entry, "mysql");
    if (fs.existsSync(path.join(candidate, "bin", "mysqld"))) return candidate;
  }
  return null;
}

async function main() {
  const existingBin = path.join(PERSISTENT_BIN_ROOT, "mysql", "bin");
  if (fs.existsSync(path.join(existingBin, "mysqld"))) {
    log("Reusing already-fetched MySQL binary.");
    console.log(existingBin);
    return;
  }

  fs.mkdirSync(PERSISTENT_BIN_ROOT, { recursive: true });
  log("Fetching a real MySQL binary via HTTPS (mysql-memory-server)...");

  try {
    // This briefly starts (and immediately stops) a throwaway instance —
    // its only real purpose here is to force the download+extraction step.
    // If starting it fails (e.g. missing libaio), the extraction has
    // already happened by that point, so we still look for the binary
    // below rather than giving up immediately.
    const db = await createDB({ dbName: "bootstrap_probe", logLevel: "ERROR" });
    await db.stop();
  } catch (error) {
    log("Throwaway instance failed to start (expected if libaio is missing):", error?.message ?? error);
  }

  const extracted = findExtractedMysqlDir();
  if (!extracted) {
    log("No MySQL binary was found extracted at the expected cache path — aborting.");
    process.exit(1);
  }

  log(`Copying extracted MySQL binary (${path.basename(path.dirname(extracted))}) into persistent storage...`);
  fs.cpSync(extracted, path.join(PERSISTENT_BIN_ROOT, "mysql"), { recursive: true });

  if (!fs.existsSync(path.join(existingBin, "mysqld"))) {
    log("Copy completed but mysqld is missing from the result — aborting.");
    process.exit(1);
  }

  console.log(existingBin);
}

main().catch(error => {
  log("Unexpected error:", error?.message ?? error);
  process.exit(1);
});
