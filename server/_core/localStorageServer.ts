// Serves files written by storageProviders/local.ts. Needed because local
// storage's URLs (/local-storage/{key}) point at files on this server's own
// disk — something has to actually serve them back over HTTP. S3 storage
// doesn't need this at all (its URLs point directly at the S3-compatible
// endpoint), so this route is a no-op when STORAGE_PROVIDER=s3.

import type { Express, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { UPLOAD_ROOT } from "../storageProviders/local";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain",
};

export function registerLocalStorageServer(app: Express) {
  app.get("/local-storage/*", async (req: Request, res: Response) => {
    // Real path-traversal guard, independent of the one already applied at
    // write time in storageProviders/local.ts — this route resolves an
    // incoming URL, not a server-generated key, so it re-verifies rather
    // than trusting the write-time guard alone.
    const requestedKey = req.params[0] ?? "";
    const fullPath = path.resolve(UPLOAD_ROOT, requestedKey);
    if (!fullPath.startsWith(UPLOAD_ROOT + path.sep) && fullPath !== UPLOAD_ROOT) {
      res.status(400).send("Invalid path");
      return;
    }
    try {
      const data = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      res.setHeader(
        "Content-Type",
        CONTENT_TYPES[ext] || "application/octet-stream"
      );
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(data);
    } catch (error) {
      res.status(404).send("File not found");
    }
  });
}
