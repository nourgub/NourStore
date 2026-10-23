import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";

/**
 * Node.js against the real Python service (services/tassili-tts) over HTTP.
 * Runs only when TASSILI_TEST_URL and TASSILI_TEST_TOKEN point at a running
 * service (with TASSILI_FAKE=1 for a quick check, or the real model):
 *   TASSILI_TEST_URL=http://127.0.0.1:8008 TASSILI_TEST_TOKEN=... npx vitest run server/tafawoq/tassili.service.e2e.test.ts
 */
const URL = process.env.TASSILI_TEST_URL;
const TOKEN = process.env.TASSILI_TEST_TOKEN;

describe.skipIf(!URL || !TOKEN)("TassiliTTS — Node.js ↔ Python service", () => {
  it("speaks a lesson sentence with maths through the service, then from the cache", async () => {
    vi.resetModules();
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", mkdtempSync(path.join(tmpdir(), "tassili-e2e-")));
    vi.stubEnv("PIPER_MODEL", "/nonexistent.onnx");
    vi.stubEnv("TAFAWOQ_PIPER_DIR", path.join(tmpdir(), "no-piper-here"));
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    vi.stubEnv("GOOGLE_TTS_API_KEY", "");
    vi.stubEnv("TAFAWOQ_TASSILI_URL", URL!);
    vi.stubEnv("TAFAWOQ_TASSILI_TOKEN", TOKEN!);
    try {
      const tts = await import("./tts");
      const { toSpokenArabic } = await import("../../shared/spokenArabic");
      const spoken = toSpokenArabic("المشتقة: f’(x) = 2x + 3");
      const started = Date.now();
      const first = await tts.speak(spoken, "male");
      const firstMs = Date.now() - started;
      expect(first).toMatchObject({ provider: "tassili", accent: "algerian", contentType: "audio/mpeg" });
      expect(first!.audio.length).toBeGreaterThan(500);
      const again = Date.now();
      const second = await tts.speak(spoken, "male");
      expect(second!.audio.equals(first!.audio)).toBe(true);
      expect(Date.now() - again).toBeLessThan(Math.max(200, firstMs));
    } finally {
      vi.unstubAllEnvs();
    }
  }, 600_000);
});
