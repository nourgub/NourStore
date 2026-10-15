import fs from "node:fs";
import path from "node:path";
import {
  RECEIPTS_DIR,
  findLatestPaymentRequestForTeacher,
  findPaymentRequest,
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
  updateTeacherSubscriptionStatus(teacherId, "pending");

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
  updatePaymentRequestStatus(id, "approved");
  updateTeacherPlan(request.teacherId, request.requestedPlanId);
  updateTeacherSubscriptionStatus(request.teacherId, "active");
  return { ...request, status: "approved" };
}

export function rejectPaymentRequest(id: string): PaymentRequest {
  const request = findPaymentRequest(id);
  if (!request) throw new BillingError("الطلب غير موجود");
  updatePaymentRequestStatus(id, "rejected");
  updateTeacherSubscriptionStatus(request.teacherId, "rejected");
  return { ...request, status: "rejected" };
}
