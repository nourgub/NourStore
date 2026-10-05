// POST /api/tafawoq/tts { text, voice: "male" | "female" } → the teacher's natural voice (audio/mpeg),
// for signed-in users only (it costs server time, or paid quota), rate
// limited. 503 when no natural voice is available: the client then uses
// the browser's own voice.
import type { Express, Request, Response } from "express";
import { authenticateRequest } from "../_core/session";
import { getTafawoqStudentByUser } from "../db/tafawoq";
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
      userId = (await authenticateRequest(req)).id;
    } catch {
      res.status(401).json({ error: "Sign in required." });
      return;
    }
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const gender = req.body?.voice === "female" ? "female" : "male";
    if (!text.trim() || text.length > MAX_TTS_CHARS) {
      res.status(400).json({ error: `Text must be 1–${MAX_TTS_CHARS} characters.` });
      return;
    }
    // A call is ~40 sentences; 600 an hour leaves room for several lessons.
    if (!(await checkRateLimit(`tafawoq-tts:${userId}`, 600, 60 * 60 * 1000))) {
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
