// Tests the admin-grant security fix: before this, isAdmin was derived
// dynamically from `teacher.email === ADMIN_EMAIL` at every request —
// meaning whoever *registered* that exact email first (no email
// verification exists at signup) got permanent, unrecoverable admin
// access, not necessarily its real owner. Now isAdmin is a persisted flag
// set exactly once at signup, only when the email matches AND the secret
// ADMIN_BOOTSTRAP_TOKEN is also supplied correctly.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-adminsecurity-test-"));
process.env.DATA_DIR = tmpDir;
process.env.ADMIN_EMAIL = "admin@nourstore.test";
process.env.ADMIN_BOOTSTRAP_TOKEN = "correct-horse-battery-staple";

let shouldGrantAdminOnSignup: typeof import("../src/lib/billingConfig").shouldGrantAdminOnSignup;
let isAdminTeacher: typeof import("../src/lib/billingConfig").isAdminTeacher;

before(async () => {
  const billingConfig = await import("../src/lib/billingConfig");
  shouldGrantAdminOnSignup = billingConfig.shouldGrantAdminOnSignup;
  isAdminTeacher = billingConfig.isAdminTeacher;
});

test("matching the admin email alone (no token, or a wrong token) never grants admin", () => {
  assert.equal(shouldGrantAdminOnSignup("admin@nourstore.test", ""), false);
  assert.equal(shouldGrantAdminOnSignup("admin@nourstore.test", "guessed-wrong-token"), false);
});

test("the correct token without the matching email never grants admin", () => {
  assert.equal(shouldGrantAdminOnSignup("attacker@test.local", "correct-horse-battery-staple"), false);
});

test("the matching email with the correct token grants admin", () => {
  assert.equal(shouldGrantAdminOnSignup("admin@nourstore.test", "correct-horse-battery-staple"), true);
});

test("email matching is case-insensitive but the token is not", () => {
  assert.equal(shouldGrantAdminOnSignup("ADMIN@NourStore.test", "correct-horse-battery-staple"), true);
  assert.equal(shouldGrantAdminOnSignup("admin@nourstore.test", "CORRECT-HORSE-BATTERY-STAPLE"), false);
});

test("without ADMIN_BOOTSTRAP_TOKEN configured at all, admin can never be granted via signup", () => {
  const saved = process.env.ADMIN_BOOTSTRAP_TOKEN;
  delete process.env.ADMIN_BOOTSTRAP_TOKEN;
  try {
    assert.equal(shouldGrantAdminOnSignup("admin@nourstore.test", "anything"), false);
    assert.equal(shouldGrantAdminOnSignup("admin@nourstore.test", ""), false);
  } finally {
    process.env.ADMIN_BOOTSTRAP_TOKEN = saved;
  }
});

test("isAdminTeacher only trusts the persisted flag, never re-derives from email", () => {
  assert.equal(isAdminTeacher({ isAdmin: true }), true);
  assert.equal(isAdminTeacher({ isAdmin: false }), false);
});
