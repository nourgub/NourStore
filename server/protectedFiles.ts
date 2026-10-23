// Students' photographed exercises are stored under local storage
// (server/storageProviders/local.ts). The tRPC layer restricts who is
// *told* each URL, but the URL itself, once known by anyone (a leaked
// screenshot, browser history sync, a shared link), would work forever for
// anyone if served as a plain static file. This route re-checks real
// authorization on every request. There is no unauthenticated static route
// serving UPLOAD_ROOT at all — this is the only way these files are served.
//
// Only applies when STORAGE_PROVIDER=local (the default). Under
// STORAGE_PROVIDER=s3, files go through storageGetSignedUrl's expiring,
// signed presigned URLs instead.

import type { Express, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { UPLOAD_ROOT } from "./storageProviders/local";
import { getDb } from "./db/shared";
import { tafawoqExercises, tafawoqStudents, tafawoqSubscriptions } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storageGetSignedUrl } from "./storage";
import { authenticateRequest } from "./_core/session";
import type { User } from "../drizzle/schema";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/** Local disk: streamed after the check; S3: a short-lived signed URL, after the same check. */
async function sendStoredFile(res: Response, storageKey: string, mimeType: string | null) {
  if (ENV.storageProvider === "s3") {
    res.setHeader("Cache-Control", "private, no-store");
    res.redirect(302, await storageGetSignedUrl(storageKey));
    return;
  }
  await streamProtectedFile(res, storageKey, mimeType);
}

/** Path-traversal guard, re-verified here independently rather than trusted from write time. */
async function streamProtectedFile(
  res: Response,
  storageKey: string,
  mimeType: string | null
) {
  const fullPath = path.resolve(UPLOAD_ROOT, storageKey);
  if (
    !fullPath.startsWith(UPLOAD_ROOT + path.sep) &&
    fullPath !== UPLOAD_ROOT
  ) {
    res.status(400).json({ error: "Invalid file path." });
    return;
  }
  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    res.setHeader(
      "Content-Type",
      mimeType || CONTENT_TYPES[ext] || "application/octet-stream"
    );
    // Never cached by shared/proxy caches — every file behind this route
    // is scoped to specific people, never a public asset.
    res.setHeader("Cache-Control", "private, no-store");
    res.send(data);
  } catch {
    res.status(404).json({ error: "File not found on disk." });
  }
}

async function requireUser(req: Request, res: Response): Promise<User | null> {
  try {
    return await authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Sign in required." });
    return null;
  }
}

export function registerProtectedFileRoutes(app: Express) {
  // A photographed exercise ("ارفع تمرينك"): the student who sent it, and
  // the teachers who answer it, only.
  app.get(
    "/api/protected-files/tafawoq-exercise/:exerciseId",
    async (req: Request, res: Response) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const exerciseId = Number(req.params.exerciseId);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
        res.status(400).json({ error: "Invalid exercise id." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable." });
        return;
      }
      const rows = await db
        .select({
          storageKey: tafawoqExercises.imageKey,
          mimeType: tafawoqExercises.imageMime,
          ownerUserId: tafawoqStudents.userId,
        })
        .from(tafawoqExercises)
        .innerJoin(tafawoqStudents, eq(tafawoqStudents.id, tafawoqExercises.studentId))
        .where(eq(tafawoqExercises.id, exerciseId))
        .limit(1);
      const exercise = rows[0];
      if (!exercise?.storageKey) {
        res.status(404).json({ error: "Exercise photo not found." });
        return;
      }
      const allowed = exercise.ownerUserId === user.id || user.role === "teacher" || user.role === "admin";
      if (!allowed) {
        res.status(403).json({ error: "Not authorized to view this photo." });
        return;
      }
      await sendStoredFile(res, exercise.storageKey, exercise.mimeType);
    }
  );

  // A payment receipt: the student who sent it, and admins, only.
  app.get("/api/protected-files/payment-receipt/:subscriptionId", async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const subscriptionId = Number(req.params.subscriptionId);
    if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
      res.status(400).json({ error: "Invalid id." });
      return;
    }
    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Database unavailable." });
      return;
    }
    const [row] = await db
      .select({ key: tafawoqSubscriptions.receiptKey, mime: tafawoqSubscriptions.receiptMime, userId: tafawoqSubscriptions.userId })
      .from(tafawoqSubscriptions)
      .where(eq(tafawoqSubscriptions.id, subscriptionId))
      .limit(1);
    // Same answer for "no such receipt" and "not yours".
    if (!row?.key || (row.userId !== user.id && user.role !== "admin")) {
      res.status(404).json({ error: "Receipt not found." });
      return;
    }
    res.setHeader("Content-Disposition", "inline");
    await sendStoredFile(res, row.key, row.mime);
  });
}
