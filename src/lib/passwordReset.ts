import {
  findPasswordResetRequest,
  findTeacherByEmail,
  insertPasswordResetRequest,
  listPendingPasswordResetRequests,
  resolvePasswordResetRequestStatus,
  updateTeacherPassword,
} from "./db";
import { hashPassword } from "./auth";
import type { PasswordResetRequest } from "./types";

export class PasswordResetError extends Error {}

// No email service exists in this platform, so this mirrors the existing
// manual-payment pattern: the teacher requests a reset, the admin sets a new
// password by hand and relays it to the teacher directly (WhatsApp/phone).
export function requestPasswordReset(email: string): void {
  const teacher = findTeacherByEmail(email.trim().toLowerCase());
  // Silently no-op for an unknown email — never reveal whether an account
  // exists from this endpoint.
  if (!teacher) return;

  const request: PasswordResetRequest = {
    id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId: teacher.id,
    status: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  insertPasswordResetRequest(request);
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
