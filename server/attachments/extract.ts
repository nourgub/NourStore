// Turns a file the teacher uploaded into something the assistant can
// actually read.
//
// Three destinations, decided by what the format really is:
//   - Images and PDFs go to Claude AS FILES. The Messages API reads both
//     natively, which is what makes "photograph the pupil's paper and grade
//     it" work without this codebase owning an OCR pipeline.
//   - Word (.docx), Excel (.xlsx) and plain text are unpacked to text here,
//     because the API cannot read those formats directly.
//   - A .zip is opened and each file inside goes through the same rules —
//     one level deep, so a whole class's papers can be handed over at once.
//
// What this module refuses to do is guess. A legacy .doc/.xls (the old
// binary Office formats) is reported as unsupported, with the fix to apply,
// rather than half-parsed into plausible-looking nonsense that would then be
// graded as if it were a pupil's answer.

import { unzipSync, type UnzipFileInfo } from "fflate";
import ExcelJS from "exceljs";
import { validateUploadBytes } from "../uploadValidation";

/** One uploaded file, as it arrives from the client. */
export type AttachmentInput = {
  fileName: string;
  mimeType: string;
  /** Base64, without a data: URL prefix. */
  dataBase64: string;
  /** What the client says the decoded size is — cross-checked against reality. */
  sizeBytes: number;
};

export type ExtractedAttachment =
  /** Unpacked to text (docx, xlsx, txt, md, csv). */
  | { name: string; kind: "text"; text: string; truncated: boolean }
  /** Handed to Claude as an image block. */
  | {
      name: string;
      kind: "image";
      mediaType: ImageMediaType;
      dataBase64: string;
    }
  /** Handed to Claude as a document block. */
  | { name: string; kind: "pdf"; dataBase64: string }
  /** Understood, but deliberately not processed — `reason` is shown to the teacher. */
  | { name: string; kind: "unsupported"; reason: string };

export type ImageMediaType = "image/png" | "image/jpeg" | "image/webp";

const IMAGE_MIME_TYPES = new Set<ImageMediaType>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LEGACY_DOC_MIME = "application/msword";
const LEGACY_XLS_MIME = "application/vnd.ms-excel";
const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "text/csv"]);

/** Per file. Long enough for a real exam or lesson, short enough not to blow the context window. */
export const MAX_EXTRACTED_CHARS = 60_000;
/** How many files one archive may yield. A class is ~40 pupils. */
export const MAX_ARCHIVE_ENTRIES = 50;
/**
 * Total decompressed bytes allowed out of one archive. Checked against each
 * entry's declared uncompressed size BEFORE decompressing it, which is what
 * stops a zip bomb (a few KB that expands to gigabytes) from ever being
 * unpacked into memory.
 */
export const MAX_ARCHIVE_BYTES = 40 * 1024 * 1024;

const LEGACY_OFFICE_ADVICE =
  "صيغة Office القديمة (.doc/.xls) غير مدعومة — احفظ الملف بصيغة .docx أو .xlsx أو PDF ثم أعد رفعه.";

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/** Archive entries carry no MIME type — only a name — so it is inferred here. */
function mimeFromExtension(fileName: string): string | null {
  switch (extensionOf(fileName)) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "docx":
      return DOCX_MIME;
    case "xlsx":
      return XLSX_MIME;
    case "txt":
      return "text/plain";
    case "md":
    case "markdown":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "doc":
      return LEGACY_DOC_MIME;
    case "xls":
      return LEGACY_XLS_MIME;
    default:
      return null;
  }
}

function capText(name: string, text: string): ExtractedAttachment {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_EXTRACTED_CHARS)
    return { name, kind: "text", text: trimmed, truncated: false };
  // Cut, but never silently: both Claude and the teacher are told.
  return {
    name,
    kind: "text",
    text:
      trimmed.slice(0, MAX_EXTRACTED_CHARS) +
      "\n\n[⚠ تم قطع النص هنا: الملف أطول من الحد المسموح به]",
    truncated: true,
  };
}

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

/**
 * Word text extraction. A .docx is a ZIP of XML, and the text lives in
 * word/document.xml: `<w:p>` is a paragraph, `<w:br>`/`<w:tab>` are breaks.
 * This keeps those boundaries and drops every other tag — enough to read an
 * exam or a lesson, without a heavyweight converter. Formatting, images and
 * equation objects are not recovered; a document that is mostly equation
 * images should be uploaded as PDF instead, where Claude reads the page.
 */
export function docxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, {
    filter: (file: UnzipFileInfo) => file.name === "word/document.xml",
  });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("word/document.xml missing — not a readable .docx");
  return Buffer.from(xml)
    .toString("utf8")
    .replace(/<w:(?:br|tab)\b[^>]*\/?>/g, " ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(
      /&[a-z]+;|&#\d+;/gi,
      entity =>
        XML_ENTITIES[entity] ??
        (entity.startsWith("&#")
          ? String.fromCodePoint(Number(entity.slice(2, -1)))
          : entity)
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Excel → one tab-separated block per sheet, so rows stay rows for the model. */
export async function xlsxToText(bytes: Uint8Array): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  const blocks: string[] = [];
  workbook.eachSheet(sheet => {
    const rows: string[] = [];
    sheet.eachRow(row => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, cell => {
        const value = cell.value;
        cells.push(
          value === null || value === undefined
            ? ""
            : typeof value === "object" && "result" in value
              ? String((value as { result?: unknown }).result ?? "")
              : typeof value === "object" && "text" in value
                ? String((value as { text?: unknown }).text ?? "")
                : String(value)
        );
      });
      rows.push(cells.join("\t"));
    });
    blocks.push(`# ${sheet.name}\n${rows.join("\n")}`);
  });
  return blocks.join("\n\n");
}

async function extractOne(
  name: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<ExtractedAttachment> {
  if (IMAGE_MIME_TYPES.has(mimeType as ImageMediaType)) {
    return {
      name,
      kind: "image",
      mediaType: mimeType as ImageMediaType,
      dataBase64: Buffer.from(bytes).toString("base64"),
    };
  }
  if (mimeType === "application/pdf") {
    return {
      name,
      kind: "pdf",
      dataBase64: Buffer.from(bytes).toString("base64"),
    };
  }
  if (TEXT_MIME_TYPES.has(mimeType)) {
    return capText(name, Buffer.from(bytes).toString("utf8"));
  }
  if (mimeType === DOCX_MIME) {
    try {
      return capText(name, docxToText(bytes));
    } catch (error) {
      return {
        name,
        kind: "unsupported",
        reason: `تعذّرت قراءة ملف Word: ${(error as Error).message}`,
      };
    }
  }
  if (mimeType === XLSX_MIME) {
    try {
      return capText(name, await xlsxToText(bytes));
    } catch (error) {
      return {
        name,
        kind: "unsupported",
        reason: `تعذّرت قراءة ملف Excel: ${(error as Error).message}`,
      };
    }
  }
  if (mimeType === LEGACY_DOC_MIME || mimeType === LEGACY_XLS_MIME) {
    return { name, kind: "unsupported", reason: LEGACY_OFFICE_ADVICE };
  }
  return {
    name,
    kind: "unsupported",
    reason: `صيغة غير مدعومة في المساعد: ${mimeType}`,
  };
}

/**
 * Opens an archive and extracts the files inside, one level deep (a .zip
 * within a .zip is reported, not followed). Both the entry count and the
 * total decompressed size are capped, and the size cap is applied to each
 * entry's DECLARED uncompressed size before anything is decompressed.
 */
async function extractArchive(
  archiveName: string,
  bytes: Uint8Array
): Promise<ExtractedAttachment[]> {
  let budget = MAX_ARCHIVE_BYTES;
  let taken = 0;
  const skipped: string[] = [];
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes, {
      filter: (file: UnzipFileInfo) => {
        // Directory entries, macOS resource forks and dotfiles are noise.
        if (file.name.endsWith("/")) return false;
        const base = file.name.split("/").pop() ?? file.name;
        if (!base || base.startsWith(".") || file.name.startsWith("__MACOSX/"))
          return false;
        if (taken >= MAX_ARCHIVE_ENTRIES) {
          skipped.push(file.name);
          return false;
        }
        if (file.originalSize > budget) {
          skipped.push(file.name);
          return false;
        }
        budget -= file.originalSize;
        taken += 1;
        return true;
      },
    });
  } catch (error) {
    return [
      {
        name: archiveName,
        kind: "unsupported",
        reason: `تعذّر فتح الأرشيف: ${(error as Error).message}`,
      },
    ];
  }
  const results: ExtractedAttachment[] = [];
  for (const [entryName, entryBytes] of Object.entries(unzipped)) {
    const label = `${archiveName} › ${entryName}`;
    const entryMime = mimeFromExtension(entryName);
    if (!entryMime) {
      results.push({
        name: label,
        kind: "unsupported",
        reason: "صيغة غير معروفة داخل الأرشيف.",
      });
      continue;
    }
    if (entryMime === "application/zip") {
      results.push({
        name: label,
        kind: "unsupported",
        reason: "أرشيف داخل أرشيف — فُكّه أولاً.",
      });
      continue;
    }
    results.push(await extractOne(label, entryMime, entryBytes));
  }
  if (skipped.length) {
    results.push({
      name: archiveName,
      kind: "unsupported",
      reason: `تم تجاوز ${skipped.length} ملفاً داخل الأرشيف (تجاوز الحد: ${MAX_ARCHIVE_ENTRIES} ملفاً أو ${Math.round(MAX_ARCHIVE_BYTES / 1024 / 1024)} ميغابايت).`,
    });
  }
  return results;
}

/**
 * The entry point: validates one uploaded file with the same server-side
 * checks the lesson-asset uploads use (size, extension/MIME agreement,
 * blocked executables, real magic bytes), then extracts it. A .zip fans out
 * into one result per file inside, which is why this returns an array.
 */
export async function extractAttachment(
  input: AttachmentInput
): Promise<ExtractedAttachment[]> {
  const bytes = Buffer.from(input.dataBase64, "base64");
  const validation = validateUploadBytes({
    fileName: input.fileName,
    mimeType: input.mimeType,
    declaredSizeBytes: input.sizeBytes,
    decodedByteLength: bytes.byteLength,
    bytes,
  });
  if (!validation.ok) {
    return [
      {
        name: input.fileName,
        kind: "unsupported",
        reason: `رُفض الملف: ${validation.reason}`,
      },
    ];
  }
  if (input.mimeType === "application/zip") {
    return extractArchive(input.fileName, bytes);
  }
  return [await extractOne(input.fileName, input.mimeType, bytes)];
}
