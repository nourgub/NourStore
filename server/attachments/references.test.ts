import { describe, expect, it, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import { storagePut } from "../storage";
import {
  MAX_REFERENCE_BYTES_PER_REQUEST,
  referencesToAttachments,
} from "./references";
import type { TeacherReference } from "../../drizzle/schema";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function reference(overrides: Partial<TeacherReference>): TeacherReference {
  return {
    id: 1,
    teacherId: 1,
    fileName: "syllabus.txt",
    mimeType: "text/plain",
    sizeBytes: 10,
    storageKey: null,
    extractedText: null,
    scope: "all",
    active: true,
    createdAt: new Date(),
    ...overrides,
  } as TeacherReference;
}

const writtenKeys: string[] = [];

describe("reference library → attachments", () => {
  it("uses the text unpacked at upload time, without touching storage", async () => {
    const { attachments, notices } = await referencesToAttachments([
      reference({ extractedText: "المنهاج: المعادلات، الدوال" }),
    ]);
    expect(notices).toEqual([]);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].kind).toBe("text");
    if (attachments[0].kind === "text") {
      expect(attachments[0].text).toBe("المنهاج: المعادلات، الدوال");
      // Labelled so the model can tell a standing reference from the paper
      // it is being asked to work on right now.
      expect(attachments[0].name).toBe("مرجع: syllabus.txt");
    }
  });

  it("reads a stored image back out of storage for each generation", async () => {
    const stored = await storagePut(
      "teacher-references/test/ref.png",
      PNG,
      "image/png"
    );
    writtenKeys.push(stored.key);
    const { attachments, notices } = await referencesToAttachments([
      reference({
        fileName: "board.png",
        mimeType: "image/png",
        sizeBytes: PNG.byteLength,
        storageKey: stored.key,
      }),
    ]);
    expect(notices).toEqual([]);
    expect(attachments[0].kind).toBe("image");
    if (attachments[0].kind === "image")
      expect(attachments[0].dataBase64).toBe(PNG.toString("base64"));
  });

  it("says so when the row outlived the file, instead of generating as if it had been read", async () => {
    const { attachments, notices } = await referencesToAttachments([
      reference({
        fileName: "gone.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        storageKey: "teacher-references/test/does-not-exist.pdf",
      }),
    ]);
    expect(attachments).toEqual([]);
    expect(notices[0].reason).toContain("تعذّر قراءة ملف المرجع");
  });

  it("refuses to blow the per-request byte budget, and names the reference it dropped", async () => {
    const { attachments, notices } = await referencesToAttachments([
      reference({
        fileName: "huge.pdf",
        mimeType: "application/pdf",
        sizeBytes: MAX_REFERENCE_BYTES_PER_REQUEST + 1,
        storageKey: "teacher-references/test/huge.pdf",
      }),
    ]);
    expect(attachments).toEqual([]);
    expect(notices[0].name).toContain("huge.pdf");
    expect(notices[0].reason).toContain("حدّ حجم المراجع");
  });

  afterAll(async () => {
    for (const key of writtenKeys) {
      await fs
        .unlink(path.resolve(process.cwd(), "uploads", key))
        .catch(() => undefined);
    }
  });
});
