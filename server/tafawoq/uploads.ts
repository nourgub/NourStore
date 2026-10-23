// Uploaded files checked by their content, not their name or declared type:
// the first bytes must be those of the declared format.
import { TRPCError } from "@trpc/server";

export const UPLOAD_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;
export type UploadType = keyof typeof UPLOAD_TYPES;

export function looksLike(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

/** The decoded file, or a BAD_REQUEST naming what is wrong (type, size, content). */
export function checkedUpload(
  file: { mimeType: string; base64: string },
  allowed: readonly UploadType[],
  maxBytes: number
): { bytes: Buffer; extension: string; mimeType: UploadType } {
  if (!(allowed as readonly string[]).includes(file.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "FILE_TYPE" });
  const bytes = Buffer.from(file.base64, "base64");
  if (!bytes.length) throw new TRPCError({ code: "BAD_REQUEST", message: "FILE_EMPTY" });
  if (bytes.length > maxBytes) throw new TRPCError({ code: "BAD_REQUEST", message: "FILE_TOO_LARGE" });
  if (!looksLike(bytes, file.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "FILE_CONTENT" });
  const mimeType = file.mimeType as UploadType;
  return { bytes, extension: UPLOAD_TYPES[mimeType], mimeType };
}
