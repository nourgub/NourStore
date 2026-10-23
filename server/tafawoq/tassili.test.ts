import { createServer, type Server } from "http";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Node side of TassiliTTS against a stand-in for the Python service
 * (same endpoints and answers, a short tone instead of speech). The real
 * model is exercised separately (services/tassili-tts, see its README).
 */
function wav(samples = 2400, rate = 24_000) {
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i += 1) data.writeInt16LE(Math.round(6000 * Math.sin(i / 4)), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

type Fake = { server: Server; url: string; bodies: Array<{ text: string; voice: string }>; auth: string[]; mode: "ok" | "fail"; voices: { male: boolean; female: boolean } };

async function startFake(): Promise<Fake> {
  const fake = { bodies: [], auth: [], mode: "ok", voices: { male: true, female: false } } as unknown as Fake;
  fake.server = createServer((req, res) => {
    if (req.url === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ model_loaded: true, voices: { male: { ready: fake.voices.male }, female: { ready: fake.voices.female } } }));
      return;
    }
    let raw = "";
    req.on("data", chunk => (raw += chunk));
    req.on("end", () => {
      fake.auth.push(String(req.headers.authorization));
      fake.bodies.push(JSON.parse(raw));
      if (fake.mode === "fail") {
        res.statusCode = 503;
        res.end("model not loaded");
        return;
      }
      // A little delay so concurrent requests overlap.
      setTimeout(() => {
        res.setHeader("Content-Type", "audio/wav");
        res.end(wav());
      }, 50);
    });
  });
  await new Promise<void>(resolve => fake.server.listen(0, "127.0.0.1", resolve));
  const address = fake.server.address() as { port: number };
  fake.url = `http://127.0.0.1:${address.port}`;
  return fake;
}

describe("TassiliTTS engine (Node side)", () => {
  let fake: Fake;
  beforeEach(async () => {
    fake = await startFake();
    vi.resetModules();
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", mkdtempSync(path.join(tmpdir(), "tassili-")));
    vi.stubEnv("PIPER_MODEL", "/nonexistent.onnx");
    vi.stubEnv("TAFAWOQ_PIPER_DIR", path.join(tmpdir(), "no-piper-here"));
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    vi.stubEnv("GOOGLE_TTS_API_KEY", "");
    vi.stubEnv("TAFAWOQ_TASSILI_URL", fake.url);
    vi.stubEnv("TAFAWOQ_TASSILI_TOKEN", "test-token");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    fake.server.close();
  });

  it("speaks with the Algerian voice, numbers in words, never the student's name, with the token", async () => {
    const tts = await import("./tts");
    const voice = await tts.speak("أحسنت يا Yasmine، الجواب هو 2024", "male", "Yasmine");
    expect(voice).toMatchObject({ provider: "tassili", accent: "algerian", gender: "male", contentType: "audio/mpeg" });
    expect(voice!.audio.length).toBeGreaterThan(100);
    expect(fake.bodies).toHaveLength(1);
    expect(fake.bodies[0].text).toBe("أحسنت، الجواب هو ألفان وأربعة وعشرون");
    expect(fake.bodies[0].text).not.toMatch(/[0-9A-Za-z]/);
    expect(fake.auth[0]).toBe("Bearer test-token");
  });

  it("synthesises a sentence once, even when asked twice at the same time, then serves the cache", async () => {
    const tts = await import("./tts");
    const [a, b] = await Promise.all([tts.speak("واش راك خويا", "male"), tts.speak("واش راك خويا", "male")]);
    expect(a?.provider).toBe("tassili");
    expect(b?.audio.equals(a!.audio)).toBe(true);
    await tts.speak("واش راك خويا", "male");
    expect(fake.bodies).toHaveLength(1);
  });

  it("falls through when the service fails: the lesson goes on (here with no other voice: null, the device speaks)", async () => {
    fake.mode = "fail";
    const tts = await import("./tts");
    expect(await tts.speak("واش راك خويا", "male")).toBeNull();
  });

  it("is not used when the service is unreachable", async () => {
    vi.stubEnv("TAFAWOQ_TASSILI_URL", "http://127.0.0.1:9");
    const tts = await import("./tts");
    expect(await tts.speak("واش راك خويا", "male")).toBeNull();
    expect(tts.ttsProviders().tassili).toBe(false);
  });

  it("a teacher voice the service has no consented reference for is not offered as such", async () => {
    const tts = await import("./tts");
    await tts.refreshTassili(true);
    expect(tts.engines("female").filter(engine => engine.provider === "tassili").map(engine => engine.gender)).toEqual(["male"]);
  });

  it("refuses text with Latin left in it instead of sending it", async () => {
    const tts = await import("./tts");
    expect(tts.tassiliText("ça va bien")).toBeNull();
    expect(tts.tassiliText("عندي 3 خاوتي")).toBe("عندي ثلاثة خاوتي");
  });
});
