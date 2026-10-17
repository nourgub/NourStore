import fs from "node:fs";
import path from "node:path";
import {
  RECEIPTS_DIR,
  activateTeacherSubscription,
  findLatestPaymentRequestForTeacher,
  findPaymentRequest,
  findTeacherById,
  insertPaymentRequest,
  listPendingPaymentRequests,
  updatePaymentRequestStatus,
  updateTeacherPlan,
  updateTeacherSubscriptionStatus,
} from "./db";
import { isPlanId } from "./plans";
import type { PaymentRequest, PlanId } from "./types";

export class BillingError extends Error {}

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB
export const SUBSCRIPTION_PERIOD_DAYS = 30;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function submitPaymentReceipt(
  teacherId: string,
  file: File,
  planId: string,
  receiptDate: string,
): Promise<PaymentRequest> {
  if (!isPlanId(planId)) throw new BillingError("يجب اختيار باقة صالحة");
  if (!DATE_PATTERN.test(receiptDate)) throw new BillingError("يجب تحديد تاريخ الوصل");
  if (receiptDate !== todayDateString()) {
    throw new BillingError("يجب أن يكون تاريخ الوصل هو تاريخ اليوم — ارفع وصل دفع تم اليوم فقط");
  }
  if (file.size === 0) throw new BillingError("الملف فارغ");
  if (file.size > MAX_RECEIPT_BYTES) throw new BillingError("حجم الملف يتجاوز الحد المسموح (10 ميغابايت)");

  const ext = ALLOWED_MIME_TO_EXT[file.type];
  if (!ext) throw new BillingError("صيغة الملف غير مدعومة — يُقبل فقط JPG أو PNG أو PDF");

  const teacherDir = path.join(RECEIPTS_DIR, teacherId);
  fs.mkdirSync(teacherDir, { recursive: true });

  const requestId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const receiptPath = path.join(teacherDir, `${requestId}.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(receiptPath, buffer);

  const request: PaymentRequest = {
    id: requestId,
    teacherId,
    requestedPlanId: planId as PlanId,
    receiptPath,
    receiptMimeType: file.type,
    receiptDate,
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  };
  insertPaymentRequest(request);

  // A teacher renewing while still inside an active, unexpired period keeps
  // full access during review — only a first-time, lapsed, or rejected
  // subscriber gets parked as "pending" until the admin decides.
  const teacher = findTeacherById(teacherId);
  const hasActiveUnexpiredSubscription =
    teacher?.subscriptionStatus === "active" &&
    (!teacher.subscriptionExpiresAt || new Date(teacher.subscriptionExpiresAt).getTime() > Date.now());
  if (!hasActiveUnexpiredSubscription) {
    updateTeacherSubscriptionStatus(teacherId, "pending");
  }

  return request;
}

export function getLatestPaymentRequest(teacherId: string): PaymentRequest | null {
  return findLatestPaymentRequestForTeacher(teacherId);
}

export function listPendingRequestsForAdmin() {
  return listPendingPaymentRequests();
}

export function approvePaymentRequest(id: string): PaymentRequest {
  const request = findPaymentRequest(id);
  if (!request) throw new BillingError("الطلب غير موجود");

  // Renewing before the current period ends extends it from its existing
  // expiry — a teacher who pays early never loses the days they already paid
  // for. Any other case (first activation, lapsed, rejected) starts a fresh
  // period from today.
  const teacher = findTeacherById(request.teacherId);
  const now = Date.now();
  const currentExpiry =
    teacher?.subscriptionStatus === "active" && teacher.subscriptionExpiresAt
      ? new Date(teacher.subscriptionExpiresAt).getTime()
      : 0;
  const periodStart = currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(periodStart + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  updatePaymentRequestStatus(id, "approved");
  updateTeacherPlan(request.teacherId, request.requestedPlanId);
  activateTeacherSubscription(request.teacherId, expiresAt);
  return { ...request, status: "approved" };
}

export function rejectPaymentRequest(id: string): PaymentRequest {
  const request = findPaymentRequest(id);
  if (!request) throw new BillingError("الطلب غير موجود");
  updatePaymentRequestStatus(id, "rejected");
  updateTeacherSubscriptionStatus(request.teacherId, "rejected");
  return { ...request, status: "rejected" };
}
