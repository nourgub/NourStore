import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_STORED_CHARS = 20000; // keeps prompt size + storage bounded

export type ExtractionStatus = "none" | "extracted" | "unsupported" | "failed" | "scanned_no_text";

// A PDF page with no embedded text layer (a scan or photo saved as PDF)
// still parses "successfully" — pdf-parse just returns an empty or
// near-empty string, with no exception to catch. Below this many
// non-whitespace characters, treat it as "no real text", not "extracted",
// so it's never silently used as reference material and the teacher is told
// their file needs OCR instead.
const MIN_MEANINGFUL_CHARS = 20;

export interface ExtractionResult {
  status: ExtractionStatus;
  text: string;
}

function isPdf(fileName: string, mimeType: string): boolean {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

function isDocx(fileName: string, mimeType: string): boolean {
  return (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx")
  );
}

export async function extractTextFromUpload(file: File): Promise<ExtractionResult> {
  if (!isPdf(file.name, file.type) && !isDocx(file.name, file.type)) {
    return { status: "unsupported", text: "" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (isPdf(file.name, file.type)) {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        if (result.text.trim().length < MIN_MEANINGFUL_CHARS) {
          return { status: "scanned_no_text", text: "" };
        }
        return { status: "extracted", text: result.text.slice(0, MAX_STORED_CHARS) };
      } finally {
        await parser.destroy();
      }
    }

    const result = await mammoth.extractRawText({ buffer });
    return { status: "extracted", text: result.value.slice(0, MAX_STORED_CHARS) };
  } catch {
    // Never log the raw error — it can embed parsed document content.
    return { status: "failed", text: "" };
  }
}
