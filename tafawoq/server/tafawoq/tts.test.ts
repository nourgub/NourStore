import { describe, expect, it } from "vitest";
import { pcmToMp3, speak, ttsProviders } from "./tts";

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
});
