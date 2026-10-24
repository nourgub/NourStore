import {
  findPasswordResetRequest,
  findTeacherByEmail,
  findValidPasswordResetToken,
  insertPasswordResetRequest,
  insertPasswordResetToken,
  listPendingPasswordResetRequests,
  markPasswordResetTokenUsed,
  resolvePasswordResetRequestStatus,
  updateTeacherPassword,
} from "./db";
import { generateToken, hashPassword } from "./auth";
import { isEmailConfigured, sendPasswordResetEmail } from "./email";
import type { PasswordResetRequest } from "./types";

export class PasswordResetError extends Error {}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Self-service when SMTP_* is configured (src/lib/email.ts): emails a
// time-limited, single-use reset link. Otherwise — or if sending the email
// fails for any reason (bad SMTP config, provider outage) — falls back to
// the original admin-assisted flow: the teacher's request reaches the admin,
// who sets a new password by hand and relays it directly (WhatsApp/phone).
// Either way the caller gets the same generic response, so this endpoint
// never reveals whether an email address has an account.
export async function requestPasswordReset(email: string, baseUrl: string): Promise<void> {
  const teacher = findTeacherByEmail(email.trim().toLowerCase());
  if (!teacher) return;

  if (isEmailConfigured()) {
    try {
      const token = generateToken();
      const now = new Date();
      insertPasswordResetToken({
        token,
        teacherId: teacher.id,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
      });
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail({ to: teacher.email, resetUrl });
      return;
    } catch {
      // Fall through to the admin-assisted path below — never surface the
      // email failure to the caller (same generic response either way).
    }
  }

  const request: PasswordResetRequest = {
    id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId: teacher.id,
    status: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  insertPasswordResetRequest(request);
}

export function confirmPasswordResetWithToken(token: string, newPassword: string): void {
  if (newPassword.length < 8) {
    throw new PasswordResetError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف");
  }
  const entry = findValidPasswordResetToken(token);
  if (!entry) {
    throw new PasswordResetError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية — اطلب رابطًا جديدًا");
  }
  const { hash, salt } = hashPassword(newPassword);
  updateTeacherPassword(entry.teacherId, hash, salt);
  markPasswordResetTokenUsed(token);
}

export function listPendingPasswordResetsForAdmin() {
  return listPendingPasswordResetRequests();
}

export function resolvePasswordReset(id: string, newPassword: string): void {
  if (newPassword.length < 8) {
    throw new PasswordResetError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف");
  }
  const request = findPasswordResetRequest(id);
  if (!request) throw new PasswordResetError("الطلب غير موجود");

  const { hash, salt } = hashPassword(newPassword);
  updateTeacherPassword(request.teacherId, hash, salt);
  resolvePasswordResetRequestStatus(id);
}
