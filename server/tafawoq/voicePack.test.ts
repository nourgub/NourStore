import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { checkRecording, packDeclaration, readWav } from "../../scripts/voice-pack/import";

const tone = (rate: number, ms: number) => {
  const pcm = Buffer.alloc(Math.round((rate * ms) / 1000) * 2);
  for (let index = 0; index < pcm.length / 2; index += 1) pcm.writeInt16LE(Math.round(8000 * Math.sin(index / 5)), index * 2);
  return pcm;
};

function wav(samples: Buffer, rate: number, format: 1 | 3) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + samples.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(format, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt16LE(format === 1 ? 16 : 32, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(samples.length, 40);
  return Buffer.concat([header, samples]);
}

describe("voice pack", () => {
  it("reads 16-bit and float WAV files from the renderer", () => {
    const pcm = tone(24_000, 50);
    expect(readWav(wav(pcm, 24_000, 1))).toEqual({ pcm, rate: 24_000 });
    const float = Buffer.alloc(8);
    float.writeFloatLE(0.5, 0);
    float.writeFloatLE(-1, 4);
    const read = readWav(wav(float, 24_000, 3));
    expect(read.pcm.readInt16LE(0)).toBe(16384);
    expect(read.pcm.readInt16LE(2)).toBe(-32767);
  });

  it("refuses recordings that do not fit their text", () => {
    expect(checkRecording("أتمنى أن تكون بخير.", 1.6)).toBeNull();
    expect(checkRecording("أتمنى أن تكون بخير.", 9)).toMatch(/too slow/);
    expect(checkRecording("أتمنى أن تكون بخير.", 0.3)).toMatch(/too fast/);
    expect(checkRecording("إكس", 0.4)).toBeNull();
    expect(checkRecording("إكس", 0.05)).toBe("silent");
  });

  it("refuses to import a pack without the speaker's consent, the model licence and an honest accent", () => {
    expect(() => packDeclaration("jordanian", "contract signed 2026-03", "Chatterbox, MIT")).toThrow(/accent/);
    expect(() => packDeclaration("algerian", "", "Chatterbox, MIT")).toThrow(/consent/);
    expect(() => packDeclaration("algerian", "contract signed 2026-03", "")).toThrow(/licence/);
    expect(packDeclaration("algerian", "contract signed 2026-03", "Chatterbox, MIT").accent).toBe("algerian");
  });

  it("never plays a pack without its consent declaration, and labels accents honestly", async () => {
    vi.resetModules();
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", mkdtempSync(path.join(tmpdir(), "pack-")));
    vi.stubEnv("TAFAWOQ_VOICE_PACK_FEMALE", "test-pack");
    vi.stubEnv("PIPER_MODEL", "/nonexistent.onnx");
    try {
      const tts = await import("./tts");
      expect(tts.ttsProviders().pack).toBe(false);
      expect(tts.engines("female").some(engine => engine.provider === "pack")).toBe(false);
      // Kareem (Piper ar_JO) and Google ar-XA are Arabic, not Algerian; Azure ar-DZ is Algerian.
      expect(tts.engineAccent({ provider: "piper", voice: "ar_JO-kareem-medium" })).toBe("arabic");
      expect(tts.engineAccent({ provider: "google", voice: "ar-XA-Wavenet-B" })).toBe("arabic");
      expect(tts.engineAccent({ provider: "azure", voice: "ar-DZ-IsmaelNeural" })).toBe("algerian");
      expect(tts.engineAccent({ provider: "azure", voice: "ar-AE-FatimaNeural" })).toBe("arabic");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("plays what was prepared: sentences, a student's sentence without the name, maths assembled from its pieces", async () => {
    vi.resetModules();
    const cacheDir = mkdtempSync(path.join(tmpdir(), "pack-"));
    writeFileSync(path.join(cacheDir, "voice-pack-info.json"), JSON.stringify(packDeclaration("algerian", "test consent reference", "test model, MIT")));
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", cacheDir);
    vi.stubEnv("TAFAWOQ_VOICE_PACK_FEMALE", "test-pack");
    vi.stubEnv("PIPER_MODEL", "/nonexistent.onnx");
    try {
      const tts = await import("./tts");
      const engine = { provider: "pack" as const, voice: "test-pack" };
      const sentence = (text: string) => tts.store(tts.cachePath(engine, "sentence", text), tts.pcmToMp3(tone(24_000, 600), 24_000));
      const piece = (text: string) => tts.store(tts.cachePath(engine, "piece", text), tone(24_000, 200));
      await sentence("أتمنى أن تكون بخير.");
      await sentence("السلام عليكم!");
      for (const text of ["إذن الجواب:", "6", "إكس", "ناقص", "5"]) await piece(text);

      expect(await tts.speak("أتمنى أن تكون بخير.", "female")).toMatchObject({ provider: "pack", accent: "algerian" });
      expect((await tts.speak("السلام عليكم يا سارة!", "female", "سارة"))?.provider).toBe("pack");
      expect((await tts.speak("إذن الجواب: 6 إكس ناقص 5.", "female"))?.provider).toBe("pack");
      // Not prepared, and no other voice here: the browser takes over.
      expect(await tts.speak("جملة لم تُسجَّل بعد.", "female")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("one voice only: with TAFAWOQ_VOICE_EXCLUSIVE the pack's voice speaks for both teachers, and nothing else ever does", async () => {
    vi.resetModules();
    const cacheDir = mkdtempSync(path.join(tmpdir(), "pack-only-"));
    writeFileSync(path.join(cacheDir, "voice-pack-info.json"), JSON.stringify(packDeclaration("algerian", "owner's own voice, consent recorded", "TassiliTTS, MIT per card")));
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", cacheDir);
    vi.stubEnv("TAFAWOQ_VOICE_PACK_FEMALE", "dz-teacher-f");
    vi.stubEnv("TAFAWOQ_VOICE_EXCLUSIVE", "female");
    // Another voice is configured, and must still never be used.
    vi.stubEnv("AZURE_SPEECH_KEY", "fake-key");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    vi.stubEnv("PIPER_MODEL", "/nonexistent.onnx");
    try {
      const tts = await import("./tts");
      expect(tts.voiceExclusive()).toBe("female");
      for (const gender of ["male", "female"] as const) {
        expect(tts.engines(gender).map(engine => `${engine.provider}:${engine.gender}`)).toEqual(["pack:female"]);
        expect(tts.engines(gender, "de")).toEqual([]);
      }
      const engine = { provider: "pack" as const, voice: "dz-teacher-f" };
      await tts.store(tts.cachePath(engine, "sentence", "صحيت."), tts.pcmToMp3(tone(24_000, 400), 24_000));
      expect(await tts.speak("صحيت.", "male")).toMatchObject({ provider: "pack", gender: "female", accent: "algerian" });
      // Not prepared: no voice at all (the route answers 409, the client stays silent).
      expect(await tts.speak("جملة غير محضرة.", "female")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
