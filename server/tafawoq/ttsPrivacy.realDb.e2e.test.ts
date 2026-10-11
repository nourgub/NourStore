import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * REAL DATABASE (the paid-voice quota lives in MySQL): the student's name is
 * never sent to an external voice service. Azure is "configured" with a fake
 * key and its HTTP call is intercepted — nothing leaves this machine.
 * SKIPPED without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("REAL DB — voice privacy", () => {
  const sent: string[] = [];
  const realFetch = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = realFetch;
    vi.unstubAllEnvs();
  });

  it("sends Azure the sentence without the student's name", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "fake-key-for-test");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", mkdtempSync(path.join(tmpdir(), "tts-privacy-")));
    vi.stubEnv("TAFAWOQ_PIPER_DIR", path.join(tmpdir(), "no-piper-here"));
    globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
      const url = String(input);
      if (url.includes("tts.speech.microsoft.com")) {
        sent.push(String(init?.body ?? ""));
        return new Response(new Uint8Array([0xff, 0xf3, 0x44, 0xc4]), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
      }
      return realFetch(input as RequestInfo, init as RequestInit);
    }) as typeof fetch;
    const { speak } = await import("./tts");
    const run = Date.now().toString(36);
    const voice = await speak(`أحسنت يا Yasmine، هذه إجابة صحيحة رقم ${run}`, "male", "Yasmine Benali");
    expect(voice?.provider).toBe("azure");
    expect(sent.length).toBeGreaterThan(0);
    for (const body of sent) {
      expect(body).not.toContain("Yasmine");
      expect(body).toContain("إجابة صحيحة");
    }
  });
});
