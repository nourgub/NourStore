import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export class UploadValidationError extends Error {}

/** Validates and saves an uploaded image under public/uploads, returning its public path. */
export async function saveUploadedImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadValidationError("حجم الصورة كبير جدًا (الحد الأقصى 5 ميجا)");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new UploadValidationError("صيغة الصورة غير مدعومة (PNG, JPG, WEBP فقط)");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileName = `${nanoid(16)}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, fileName), bytes);

  return `/uploads/${fileName}`;
}
