import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { azureSsml, pacingLine, pcmToMp3, speak, trimSilence, ttsProviders, wavData } from "./tts";

const tone = (rate: number, ms: number, amplitude = 8000) => {
  const pcm = Buffer.alloc(Math.round((rate * ms) / 1000) * 2);
  for (let index = 0; index < pcm.length / 2; index += 1) pcm.writeInt16LE(Math.round(amplitude * Math.sin((2 * Math.PI * 220 * index) / rate)), index * 2);
  return pcm;
};

describe("teacher voice", () => {
  it("encodes speech PCM to a small MP3", () => {
    // One second of a 220 Hz tone at 22.05 kHz, 16-bit mono.
    const rate = 22050;
    const pcm = Buffer.alloc(rate * 2);
    for (let index = 0; index < rate; index += 1) pcm.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 220 * index) / rate)), index * 2);
    const mp3 = pcmToMp3(pcm, rate);
    expect(mp3[0]).toBe(0xff); // MPEG frame sync
    expect(mp3[1] & 0xe0).toBe(0xe0);
    expect(mp3.length).toBeLessThan(pcm.length / 5);
  });

  it("says nothing (and the browser takes over) when no natural voice is installed", async () => {
    if (ttsProviders().google || ttsProviders().piper) return; // a real voice is configured here
    expect(await speak("ألو؟")).toBeNull();
    expect(await speak("   ")).toBeNull();
  });

  it("asks Azure for the chosen voice in its own locale, text escaped", () => {
    const ssml = azureSsml("ar-DZ-AminaNeural", "x < 3 & y > 2");
    expect(ssml).toContain('xml:lang="ar-DZ"');
    expect(ssml).toContain('<voice name="ar-DZ-AminaNeural">');
    expect(ssml).toContain("x &lt; 3 &amp; y &gt; 2");
    expect(azureSsml("ar-AE-FatimaNeural", "مرحبا")).toContain('xml:lang="ar-AE"');
  });

  it("a student who chose the female voice still hears a natural voice when only Kareem is installed", async () => {
    const providers = ttsProviders();
    if (!providers.piper || providers.piperFemale || providers.azure || providers.google) return;
    const voice = await speak("مرحبا بيك", "female");
    expect(voice?.provider).toBe("piper");
    expect(voice?.gender).toBe("male");
  }, 30_000);

  it("spreads the month's allowance evenly: a day's share on the 1st, all of it on the last day", () => {
    const cap = 450_000;
    expect(pacingLine(cap, new Date(Date.UTC(2026, 9, 1)))).toBe(Math.round(cap / 31));
    expect(pacingLine(cap, new Date(Date.UTC(2026, 9, 16)))).toBeCloseTo(cap * (16 / 31), -2);
    expect(pacingLine(cap, new Date(Date.UTC(2026, 9, 31, 12)))).toBe(cap);
  });

  it("cuts the silence around a word, keeping a short margin", () => {
    const rate = 24_000;
    const word = Buffer.concat([Buffer.alloc(rate * 0.3 * 2), tone(rate, 200), Buffer.alloc(rate * 0.4 * 2)]);
    const trimmed = trimSilence(word, rate);
    const ms = (trimmed.length / 2 / rate) * 1000;
    expect(ms).toBeGreaterThanOrEqual(200);
    expect(ms).toBeLessThan(260);
    expect(trimSilence(Buffer.alloc(rate * 2), rate).length).toBe(0);
  });

  it("reads the samples out of a WAV file", () => {
    const pcm = tone(24_000, 10);
    const header = Buffer.alloc(44);
    header.write("RIFF", 0, "ascii");
    header.write("WAVEfmt ", 8, "ascii");
    header.writeUInt32LE(16, 16);
    header.write("data", 36, "ascii");
    header.writeUInt32LE(pcm.length, 40);
    expect(wavData(Buffer.concat([header, pcm])).equals(pcm)).toBe(true);
  });

  it("assembles maths sentences from cached pieces: a new exercise only costs its new numbers", async () => {
    vi.resetModules();
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", mkdtempSync(path.join(tmpdir(), "tts-")));
    const tts = await import("./tts");
    const asked: string[] = [];
    const engine = {
      provider: "piper" as const,
      voice: "test",
      gender: "female" as const,
      mp3: async () => Buffer.alloc(0),
      pcm: async (text: string) => {
        asked.push(text);
        return Buffer.concat([Buffer.alloc(2400), tone(24_000, 120), Buffer.alloc(2400)]);
      },
      rate: async () => 24_000,
    };
    const first = await tts.assemble(engine, "إذن الجواب: 3 إكس تربيع.", 0);
    expect(asked).toEqual(["إذن الجواب:", "3", "إكس", "تربيع"]);
    expect(first![0]).toBe(0xff);
    asked.length = 0;
    await tts.assemble(engine, "إذن الجواب: 5 إكس تربيع.", 0);
    expect(asked).toEqual(["5"]);
    vi.unstubAllEnvs();
  });
});
