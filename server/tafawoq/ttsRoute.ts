// POST /api/tafawoq/tts { text, voice: "male" | "female" } → the teacher's natural voice (audio/mpeg),
// for signed-in users only (it costs server time, or paid quota), rate
// limited. 503 when no natural voice is available: the client then uses
// the browser's own voice.
import type { Express, Request, Response } from "express";
import { authenticateRequest } from "../_core/session";
import { getTafawoqStudentByUser } from "../db/tafawoq";
import { hasActiveSubscription } from "./platform/access";
import { checkRateLimit } from "../rateLimit";
import { MAX_TTS_CHARS, speak, ttsProviders } from "./tts";
import { startTtsWarmup } from "./ttsWarmup";

/** The student's name, so a prepared voice can leave it out (./tts.ts); cached a few minutes. */
const names = new Map<number, { name: string | undefined; at: number }>();
async function studentName(userId: number): Promise<string | undefined> {
  const hit = names.get(userId);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.name;
  const name = (await getTafawoqStudentByUser(userId).catch(() => undefined))?.displayName ?? undefined;
  if (names.size > 5000) names.clear();
  names.set(userId, { name, at: Date.now() });
  return name;
}

export function registerTafawoqTtsRoutes(app: Express) {
  startTtsWarmup();
  app.get("/api/tafawoq/tts/status", (_req: Request, res: Response) => {
    const providers = ttsProviders();
    res.json({ available: providers.pack || providers.azure || providers.google || providers.piper });
  });

  app.post("/api/tafawoq/tts", async (req: Request, res: Response) => {
    let userId: number;
    try {
      const user = await authenticateRequest(req);
      // Same rules as the rest of the platform: no voice for a suspended
      // account, nor without an active subscription (admins pass). A 403
      // lets the client fall back to the device's own voice.
      if (user.accountStatus === "suspended") {
        res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
        return;
      }
      userId = user.id;
    } catch {
      res.status(401).json({ error: "Sign in required." });
      return;
    }
    if (!(await hasActiveSubscription(userId).catch(() => false))) {
      res.status(403).json({ error: "SUBSCRIPTION_REQUIRED" });
      return;
    }
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const gender = req.body?.voice === "female" ? "female" : "male";
    if (!text.trim() || text.length > MAX_TTS_CHARS) {
      res.status(400).json({ error: `Text must be 1–${MAX_TTS_CHARS} characters.` });
      return;
    }
    // One request per spoken sentence (~4 s): the teacher talking non-stop
    // is ~900 an hour; 2000 leaves room for prefetching and replays (most
    // are cached files) while still stopping a runaway client.
    if (!(await checkRateLimit(`tafawoq-tts:${userId}`, 2000, 60 * 60 * 1000))) {
      res.status(429).json({ error: "Too many requests." });
      return;
    }
    try {
      const voice = await speak(text, gender, await studentName(userId));
      if (!voice) {
        res.status(503).json({ error: "No natural voice available." });
        return;
      }
      res.setHeader("Content-Type", voice.contentType);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.setHeader("X-Tafawoq-Voice", `${voice.provider}; ${voice.gender}`);
      res.send(voice.audio);
    } catch (error) {
      console.warn("[tafawoq] TTS failed:", error instanceof Error ? error.message : error);
      res.status(503).json({ error: "Voice unavailable." });
    }
  });
}
