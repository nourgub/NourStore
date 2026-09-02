// Real (not cosmetic) validation for lesson asset uploads.
// The tRPC input schema in routers.ts already restricts mimeType to an enum
// and bounds the raw sizes, but that alone does not verify that:
//   - the decoded byte length actually matches what the client claims,
//   - the file extension is consistent with the declared MIME type,
//   - the filename isn't a disguised executable (e.g. "notes.pdf.exe").
// This module performs those checks against the *decoded* bytes, server-side.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB, matches the tRPC input bound for non-video files
// Video specifically gets a higher cap — see the comment on VIDEO_MIME_TYPES
// below for why this is still nowhere near "upload a full lecture
// recording" territory.
export const MAX_VIDEO_UPLOAD_BYTES = 120 * 1024 * 1024; // 120MB

export const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

function maxBytesFor(mimeType: string): number {
  return VIDEO_MIME_TYPES.has(mimeType) ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
}

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "text/plain": ["txt"],
  "text/markdown": ["md", "markdown"],
  "application/zip": ["zip"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
};

// Executable / script extensions that must never be accepted regardless of the
// declared MIME type, including when hidden behind a double extension.
const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "sh",
  "bash",
  "app",
  "apk",
  "jar",
  "js",
  "mjs",
  "cjs",
  "vbs",
  "wsf",
  "reg",
  "lnk",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "iso",
  "bin",
  "com",
]);

function extensionsOf(fileName: string): string[] {
  return fileName.toLowerCase().split(".").slice(1);
}

// Real file-signature ("magic bytes") verification — the extension↔MIME
// cross-check above only proves the *name* is self-consistent; it says
// nothing about whether the actual bytes are what they claim to be. A
// file renamed "diagram.png" with an extension-mimetype match would pass
// every check above even if its real content is something else entirely
// (garbage, a corrupted upload, or — the case this specifically closes —
// a deliberately mislabeled file). Text formats (txt/md) have no reliable
// binary signature by nature and are intentionally not checked here; the
// blocked-extension list above is what actually matters for those.
const MAGIC_BYTES: Record<string, (bytes: Buffer) => boolean> = {
  "application/pdf": bytes => bytes.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/png": bytes =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a,
  "image/jpeg": bytes =>
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff,
  "image/webp": bytes =>
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP",
  "application/zip": bytes =>
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07),
  "video/webm": bytes =>
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3,
  "video/mp4": bytes =>
    // MP4's signature isn't at byte 0 — it's the 4-byte box size, then
    // the literal ASCII "ftyp" at offset 4. Real MP4 files across
    // encoders/exporters vary in the brand that follows (isom, mp42,
    // qt, M4V, etc.), so this checks for "ftyp" itself, not one brand.
    bytes.length >= 8 && bytes.subarray(4, 8).toString("latin1") === "ftyp",
  // .docx is a ZIP container (Office Open XML) — same signature as
  // application/zip above, just declared under the Word MIME type.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    bytes =>
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07),
  // Legacy binary .doc — OLE Compound File Binary Format signature.
  "application/msword": bytes =>
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1,
};

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateUploadBytes(input: {
  fileName: string;
  mimeType: string;
  declaredSizeBytes: number;
  decodedByteLength: number;
  bytes?: Buffer;
}): UploadValidationResult {
  const parts = extensionsOf(input.fileName);
  if (!parts.length) return { ok: false, reason: "missing_extension" };

  // Reject any segment of a (possibly double) extension that is a known executable/script type,
  // e.g. "report.pdf.exe" or "photo.jpg.sh".
  if (parts.some(ext => BLOCKED_EXTENSIONS.has(ext)))
    return { ok: false, reason: "blocked_extension" };

  const finalExtension = parts[parts.length - 1];
  const allowedExtensions = MIME_TO_EXTENSIONS[input.mimeType];
  if (!allowedExtensions) return { ok: false, reason: "unsupported_mime_type" };
  if (!allowedExtensions.includes(finalExtension))
    return { ok: false, reason: "extension_mime_mismatch" };

  if (input.decodedByteLength <= 0) return { ok: false, reason: "empty_file" };
  if (input.decodedByteLength > maxBytesFor(input.mimeType))
    return { ok: false, reason: "file_too_large" };

  // The client-declared sizeBytes must roughly match what was actually decoded
  // (base64 has small, bounded rounding — allow a modest tolerance, no more).
  const tolerance = Math.max(16, Math.ceil(input.declaredSizeBytes * 0.02));
  if (Math.abs(input.decodedByteLength - input.declaredSizeBytes) > tolerance) {
    return { ok: false, reason: "size_mismatch" };
  }

  // Real content verification, not just a name/label check: a file whose
  // extension and declared MIME type agree with each other can still be
  // something else entirely underneath — a renamed/mislabeled file, a
  // corrupted upload, or a deliberate disguise. This checks the actual
  // first bytes against the real signature for that format. Skipped for
  // formats that genuinely have no reliable magic bytes (plain text) —
  // the extension/blocked-extension checks above are what protect those.
  const magicCheck = MAGIC_BYTES[input.mimeType];
  if (magicCheck && input.bytes && !magicCheck(input.bytes)) {
    return { ok: false, reason: "content_does_not_match_declared_type" };
  }

  return { ok: true };
}
