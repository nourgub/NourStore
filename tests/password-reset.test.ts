// Tests the self-service password-reset token lifecycle and the
// email-not-configured fallback path — no real SMTP send (that's an
// external-service integration like the Claude/Gemini calls, not something
// this suite fakes a result for; see DELIVERY_SUMMARY.md). Everything here
// runs against a temporary, isolated SQLite database, no network calls.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-reset-test-"));
process.env.DATA_DIR = tmpDir;
// Explicitly unconfigured for this suite — exercises the admin-assisted
// fallback that every existing teacher already relies on.
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let findTeacherByEmail: typeof import("../src/lib/db").findTeacherByEmail;
let insertPasswordResetToken: typeof import("../src/lib/db").insertPasswordResetToken;
let findValidPasswordResetToken: typeof import("../src/lib/db").findValidPasswordResetToken;
let markPasswordResetTokenUsed: typeof import("../src/lib/db").markPasswordResetTokenUsed;
let listPendingPasswordResetsForAdmin: typeof import("../src/lib/passwordReset").listPendingPasswordResetsForAdmin;
let requestPasswordReset: typeof import("../src/lib/passwordReset").requestPasswordReset;
let confirmPasswordResetWithToken: typeof import("../src/lib/passwordReset").confirmPasswordResetWithToken;
let PasswordResetError: typeof import("../src/lib/passwordReset").PasswordResetError;
let isEmailConfigured: typeof import("../src/lib/email").isEmailConfigured;
let verifyPassword: typeof import("../src/lib/auth").verifyPassword;
let generateToken: typeof import("../src/lib/auth").generateToken;

before(async () => {
  const db = await import("../src/lib/db");
  const passwordReset = await import("../src/lib/passwordReset");
  const email = await import("../src/lib/email");
  const auth = await import("../src/lib/auth");
  insertTeacher = db.insertTeacher;
  findTeacherByEmail = db.findTeacherByEmail;
  insertPasswordResetToken = db.insertPasswordResetToken;
  findValidPasswordResetToken = db.findValidPasswordResetToken;
  markPasswordResetTokenUsed = db.markPasswordResetTokenUsed;
  listPendingPasswordResetsForAdmin = passwordReset.listPendingPasswordResetsForAdmin;
  requestPasswordReset = passwordReset.requestPasswordReset;
  confirmPasswordResetWithToken = passwordReset.confirmPasswordResetWithToken;
  PasswordResetError = passwordReset.PasswordResetError;
  isEmailConfigured = email.isEmailConfigured;
  verifyPassword = auth.verifyPassword;
  generateToken = auth.generateToken;
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeTeacher(id: string, email: string) {
  return {
    id,
    fullName: "أستاذ تجريبي",
    email,
    passwordHash: "old-hash",
    passwordSalt: "old-salt",
    subscriptionStatus: "active" as const,
    planId: "full" as const,
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
}

test("isEmailConfigured() is false without SMTP_* env vars set", () => {
  assert.equal(isEmailConfigured(), false);
});

test("requestPasswordReset falls back to the admin-assisted flow when email is not configured", async () => {
  const teacherId = "t_fallback";
  const teacherEmail = "fallback@test.local";
  insertTeacher(makeTeacher(teacherId, teacherEmail));

  await requestPasswordReset(teacherEmail, "http://localhost:3000");

  const pending = listPendingPasswordResetsForAdmin();
  assert.ok(pending.some((r) => r.teacherId === teacherId));
});

test("requestPasswordReset never reveals whether an email exists (no-op, no throw, for an unknown email)", async () => {
  const before = listPendingPasswordResetsForAdmin().length;
  await requestPasswordReset("does-not-exist@test.local", "http://localhost:3000");
  const after = listPendingPasswordResetsForAdmin().length;
  assert.equal(after, before);
});

test("findValidPasswordResetToken: valid token is found, expired/used/unknown tokens are not", () => {
  const teacherId = "t_tokens";
  insertTeacher(makeTeacher(teacherId, "tokens@test.local"));

  const validToken = generateToken();
  insertPasswordResetToken({
    token: validToken,
    teacherId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  assert.ok(findValidPasswordResetToken(validToken));

  const expiredToken = generateToken();
  insertPasswordResetToken({
    token: expiredToken,
    teacherId,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });
  assert.equal(findValidPasswordResetToken(expiredToken), null);

  const usedToken = generateToken();
  insertPasswordResetToken({
    token: usedToken,
    teacherId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  markPasswordResetTokenUsed(usedToken);
  assert.equal(findValidPasswordResetToken(usedToken), null);

  assert.equal(findValidPasswordResetToken("no-such-token"), null);
});

test("confirmPasswordResetWithToken changes the password, consumes the token, and rejects reuse", () => {
  const teacherId = "t_confirm";
  const teacherEmail = "confirm@test.local";
  insertTeacher(makeTeacher(teacherId, teacherEmail));

  const token = generateToken();
  insertPasswordResetToken({
    token,
    teacherId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  confirmPasswordResetWithToken(token, "brandNewPassword1");

  const teacher = findTeacherByEmail(teacherEmail)!;
  assert.ok(verifyPassword("brandNewPassword1", teacher.passwordHash, teacher.passwordSalt));
  assert.ok(!verifyPassword("old-password", teacher.passwordHash, teacher.passwordSalt));

  // The token must be single-use.
  assert.throws(() => confirmPasswordResetWithToken(token, "anotherPassword2"), PasswordResetError);
});

test("confirmPasswordResetWithToken rejects a too-short password without consuming the token", () => {
  const teacherId = "t_short";
  insertTeacher(makeTeacher(teacherId, "short@test.local"));

  const token = generateToken();
  insertPasswordResetToken({
    token,
    teacherId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  assert.throws(() => confirmPasswordResetWithToken(token, "short"), PasswordResetError);
  // Token must still be valid — the rejection happened before consuming it.
  assert.ok(findValidPasswordResetToken(token));
});

test("confirmPasswordResetWithToken rejects an unknown token", () => {
  assert.throws(() => confirmPasswordResetWithToken("unknown-token-xyz", "validPassword1"), PasswordResetError);
});
