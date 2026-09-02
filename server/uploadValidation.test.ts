import { describe, expect, it } from "vitest";
import { validateUploadBytes } from "./uploadValidation";

describe("upload validation", () => {
  it("accepts a matching PDF with a correct declared size and real PDF bytes", () => {
    const bytes = Buffer.from("%PDF-1.4\n%fake but real header rest of file...");
    const result = validateUploadBytes({
      fileName: "lesson-notes.pdf",
      mimeType: "application/pdf",
      declaredSizeBytes: bytes.length,
      decodedByteLength: bytes.length,
      bytes,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects a mismatched extension for the declared MIME type", () => {
    const result = validateUploadBytes({
      fileName: "video.pdf",
      mimeType: "video/mp4",
      declaredSizeBytes: 1000,
      decodedByteLength: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "extension_mime_mismatch" });
  });

  it("rejects a disguised executable behind a legitimate-looking double extension", () => {
    const result = validateUploadBytes({
      fileName: "notes.pdf.exe",
      mimeType: "application/pdf",
      declaredSizeBytes: 1000,
      decodedByteLength: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "blocked_extension" });
  });

  it("rejects when the declared size doesn't match the actually decoded byte length", () => {
    const result = validateUploadBytes({
      fileName: "notes.pdf",
      mimeType: "application/pdf",
      declaredSizeBytes: 1000,
      decodedByteLength: 5000,
    });
    expect(result).toEqual({ ok: false, reason: "size_mismatch" });
  });

  it("rejects a non-video file larger than the real maximum regardless of declared size", () => {
    const oversized = 16 * 1024 * 1024;
    const result = validateUploadBytes({
      fileName: "notes.pdf",
      mimeType: "application/pdf",
      declaredSizeBytes: oversized,
      decodedByteLength: oversized,
    });
    expect(result).toEqual({ ok: false, reason: "file_too_large" });
  });

  // Video gets a higher cap (MAX_VIDEO_UPLOAD_BYTES) than every other type —
  // a real recorded lesson clip is expected to exceed the general 15MB cap.
  it("accepts a video file above the general 15MB cap but under the video-specific cap", () => {
    const size = 16 * 1024 * 1024;
    const bytes = Buffer.concat([
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("ftyp"),
      Buffer.alloc(size - 8),
    ]);
    const result = validateUploadBytes({
      fileName: "lesson-recording.mp4",
      mimeType: "video/mp4",
      declaredSizeBytes: size,
      decodedByteLength: size,
      bytes,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects a video file above the video-specific maximum", () => {
    const oversized = 130 * 1024 * 1024;
    const result = validateUploadBytes({
      fileName: "lesson-recording.mp4",
      mimeType: "video/mp4",
      declaredSizeBytes: oversized,
      decodedByteLength: oversized,
    });
    expect(result).toEqual({ ok: false, reason: "file_too_large" });
  });

  it("rejects a MIME type outside the allowlist", () => {
    const result = validateUploadBytes({
      fileName: "notes.dat",
      mimeType: "application/octet-stream",
      declaredSizeBytes: 10,
      decodedByteLength: 10,
    });
    expect(result).toEqual({ ok: false, reason: "unsupported_mime_type" });
  });

  it("accepts a real .docx (Office Open XML, a ZIP container) upload", () => {
    const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
    const result = validateUploadBytes({
      fileName: "report-card.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      declaredSizeBytes: bytes.length,
      decodedByteLength: bytes.length,
      bytes,
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts a real legacy .doc (OLE compound file) upload", () => {
    const bytes = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 5, 6,
    ]);
    const result = validateUploadBytes({
      fileName: "report-card.doc",
      mimeType: "application/msword",
      declaredSizeBytes: bytes.length,
      decodedByteLength: bytes.length,
      bytes,
    });
    expect(result).toEqual({ ok: true });
  });

  describe("magic-byte (real file signature) verification", () => {
    it("rejects a file renamed to look like a PNG but whose actual bytes are plain text", () => {
      const fakeBytes = Buffer.from("just some plain text, not a real png");
      const result = validateUploadBytes({
        fileName: "diagram.png",
        mimeType: "image/png",
        declaredSizeBytes: fakeBytes.length,
        decodedByteLength: fakeBytes.length,
        bytes: fakeBytes,
      });
      expect(result).toEqual({
        ok: false,
        reason: "content_does_not_match_declared_type",
      });
    });

    it("accepts a real PNG signature", () => {
      const realPng = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from("rest of a real png file's bytes"),
      ]);
      const result = validateUploadBytes({
        fileName: "diagram.png",
        mimeType: "image/png",
        declaredSizeBytes: realPng.length,
        decodedByteLength: realPng.length,
        bytes: realPng,
      });
      expect(result).toEqual({ ok: true });
    });

    it("accepts a real JPEG signature", () => {
      const realJpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.from("rest of a real jpeg file's bytes"),
      ]);
      const result = validateUploadBytes({
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        declaredSizeBytes: realJpeg.length,
        decodedByteLength: realJpeg.length,
        bytes: realJpeg,
      });
      expect(result).toEqual({ ok: true });
    });

    it("rejects a fake JPEG (wrong magic bytes) even with a perfectly matching extension and MIME type", () => {
      const fakeJpeg = Buffer.from("PK\x03\x04this is actually a zip file's header");
      const result = validateUploadBytes({
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        declaredSizeBytes: fakeJpeg.length,
        decodedByteLength: fakeJpeg.length,
        bytes: fakeJpeg,
      });
      expect(result).toEqual({
        ok: false,
        reason: "content_does_not_match_declared_type",
      });
    });

    it("accepts a real ZIP signature", () => {
      const realZip = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from("rest of a real zip file's bytes"),
      ]);
      const result = validateUploadBytes({
        fileName: "archive.zip",
        mimeType: "application/zip",
        declaredSizeBytes: realZip.length,
        decodedByteLength: realZip.length,
        bytes: realZip,
      });
      expect(result).toEqual({ ok: true });
    });

    it("accepts a real MP4 signature (ftyp box)", () => {
      const realMp4 = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from("ftyp"),
        Buffer.from("isom rest of a real mp4 file"),
      ]);
      const result = validateUploadBytes({
        fileName: "lesson.mp4",
        mimeType: "video/mp4",
        declaredSizeBytes: realMp4.length,
        decodedByteLength: realMp4.length,
        bytes: realMp4,
      });
      expect(result).toEqual({ ok: true });
    });

    it("accepts a real WEBM signature (EBML header)", () => {
      const realWebm = Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        Buffer.from("rest of a real webm file"),
      ]);
      const result = validateUploadBytes({
        fileName: "lesson.webm",
        mimeType: "video/webm",
        declaredSizeBytes: realWebm.length,
        decodedByteLength: realWebm.length,
        bytes: realWebm,
      });
      expect(result).toEqual({ ok: true });
    });

    it("accepts a real WEBP signature (RIFF....WEBP)", () => {
      const realWebp = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from("WEBP"),
        Buffer.from("rest of a real webp file"),
      ]);
      const result = validateUploadBytes({
        fileName: "diagram.webp",
        mimeType: "image/webp",
        declaredSizeBytes: realWebp.length,
        decodedByteLength: realWebp.length,
        bytes: realWebp,
      });
      expect(result).toEqual({ ok: true });
    });

    it("skips the magic-byte check for text formats (no reliable binary signature exists)", () => {
      const plainText = Buffer.from("قصة قصيرة عن المعادلات — أي محتوى نصي حر");
      const result = validateUploadBytes({
        fileName: "notes.txt",
        mimeType: "text/plain",
        declaredSizeBytes: plainText.length,
        decodedByteLength: plainText.length,
        bytes: plainText,
      });
      expect(result).toEqual({ ok: true });
    });

    it("still enforces every other check even when bytes are omitted (backward-compatible, not a bypass)", () => {
      // Omitting `bytes` skips only the magic-byte layer — every other
      // real check (extension/MIME cross-match, blocked extensions, size)
      // still applies exactly as before.
      const result = validateUploadBytes({
        fileName: "video.pdf",
        mimeType: "video/mp4",
        declaredSizeBytes: 1000,
        decodedByteLength: 1000,
      });
      expect(result).toEqual({ ok: false, reason: "extension_mime_mismatch" });
    });
  });
});
