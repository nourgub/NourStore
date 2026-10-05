import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { checkRecording, readWav } from "../../scripts/voice-pack/import";

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

  it("plays what was prepared: sentences, a student's sentence without the name, maths assembled from its pieces", async () => {
    vi.resetModules();
    vi.stubEnv("TAFAWOQ_TTS_CACHE_DIR", mkdtempSync(path.join(tmpdir(), "pack-")));
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

      expect((await tts.speak("أتمنى أن تكون بخير.", "female"))?.provider).toBe("pack");
      expect((await tts.speak("السلام عليكم يا سارة!", "female", "سارة"))?.provider).toBe("pack");
      expect((await tts.speak("إذن الجواب: 6 إكس ناقص 5.", "female"))?.provider).toBe("pack");
      // Not prepared, and no other voice here: the browser takes over.
      expect(await tts.speak("جملة لم تُسجَّل بعد.", "female")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
