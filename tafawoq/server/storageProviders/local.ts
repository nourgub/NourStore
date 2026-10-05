// Real local-disk file storage — zero external service, zero account,
// zero API key. Files are written directly to a folder on the same server
// running this app. This is the option for someone who wants uploads
// (lesson files, payment receipts) working without signing up for AWS,
// Cloudflare, or anything else first.
//
// Trade-off, stated honestly: this only works correctly on a single,
// persistent server with a real disk — not on most serverless/ephemeral
// hosting (where the filesystem resets on every deploy or scale event).
// If this app is later moved to serverless hosting, switch
// STORAGE_PROVIDER to "s3" instead (see storageProviders/s3.ts).

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

function normalizeKey(relKey: string): string {
  // Strip leading slashes and any ".." traversal segments — an upload key
  // is server-generated internally, but this is a real, verified guard
  // against path traversal regardless.
  return relKey
    .replace(/^\/+/, "")
    .split("/")
    .filter(segment => segment && segment !== "..")
    .join("/");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const fullPath = path.join(UPLOAD_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, data);
  return { key, url: `/local-storage/${key}` };
}

export async function localGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/local-storage/${key}` };
}

/** No presigning concept for local disk storage — this key-shaped path is never served as-is; every real caller rewrites it to the authenticated proxy path (server/protectedFiles.ts) before handing it to a client. */
export async function localGetSignedUrl(relKey: string): Promise<string> {
  return `/local-storage/${normalizeKey(relKey)}`;
}

export { UPLOAD_ROOT };
