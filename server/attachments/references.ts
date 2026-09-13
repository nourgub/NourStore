// Turns the teacher's saved reference library into attachments for one
// generation.
//
// Word/Excel/text references were unpacked to text once, at upload, and are
// used from the database. Images and PDFs are read back from storage each
// time, because Claude reads those formats itself and needs the bytes.
//
// Two things this refuses to do quietly: exceed a byte budget (every active
// reference rides along on every request, so an unbounded library is an
// unbounded bill), and pretend a file it could not read was included. Both
// come back as notices the teacher sees next to the result.

import { storageReadBytes } from "../storage";
import type { TeacherReference } from "../../drizzle/schema";
import type { ExtractedAttachment, ImageMediaType } from "./extract";

/**
 * How many bytes of stored files may ride along with one generation. Text
 * references do not count against it — they are already bounded by the
 * per-file extraction cap.
 */
export const MAX_REFERENCE_BYTES_PER_REQUEST = 8 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type ReferenceNotice = { name: string; reason: string };

export async function referencesToAttachments(
  rows: TeacherReference[]
): Promise<{
  attachments: ExtractedAttachment[];
  notices: ReferenceNotice[];
}> {
  const attachments: ExtractedAttachment[] = [];
  const notices: ReferenceNotice[] = [];
  let budget = MAX_REFERENCE_BYTES_PER_REQUEST;

  for (const row of rows) {
    const name = `مرجع: ${row.fileName}`;
    if (row.extractedText) {
      attachments.push({
        name,
        kind: "text",
        text: row.extractedText,
        truncated: false,
      });
      continue;
    }
    if (!row.storageKey) {
      notices.push({
        name,
        reason: "المرجع محفوظ بلا محتوى — احذفه وأعد رفعه.",
      });
      continue;
    }
    if (row.sizeBytes > budget) {
      notices.push({
        name,
        reason: `تجاوز حدّ حجم المراجع في الطلب الواحد (${Math.round(MAX_REFERENCE_BYTES_PER_REQUEST / 1024 / 1024)} ميغابايت) — عطّل بعض المراجع.`,
      });
      continue;
    }
    const bytes = await storageReadBytes(row.storageKey);
    if (!bytes) {
      // The row outlived the file. Say so rather than generating as if the
      // syllabus had been read.
      notices.push({ name, reason: "تعذّر قراءة ملف المرجع من التخزين." });
      continue;
    }
    budget -= bytes.byteLength;
    const dataBase64 = bytes.toString("base64");
    if (IMAGE_MIME_TYPES.has(row.mimeType)) {
      attachments.push({
        name,
        kind: "image",
        mediaType: row.mimeType as ImageMediaType,
        dataBase64,
      });
    } else if (row.mimeType === "application/pdf") {
      attachments.push({ name, kind: "pdf", dataBase64 });
    } else {
      notices.push({
        name,
        reason: `صيغة مرجع غير مدعومة: ${row.mimeType}`,
      });
    }
  }
  return { attachments, notices };
}
