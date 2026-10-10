// Imports a rendered voice pack into the teacher's voice cache (and the
// object storage, with STORAGE_PROVIDER=s3), checking every recording:
//
//   npx tsx scripts/voice-pack/import.ts --manifest voice-dataset/pack/out/manifest.jsonl --wavs path/to/wavs
//
// WAV files are expected where the manifest's `file` says, with .wav for
// the extension: mono, 16-bit or float, at TAFAWOQ_VOICE_PACK_RATE (24 kHz).
// A recording whose length does not fit its text (cut short, or the model
// rambling on) is refused and listed in rejected.jsonl, to render again.
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { CACHE_DIR, PACK_RATE, pcmToMp3, store, trimSilence } from "../../server/tafawoq/tts";

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

/** 16-bit mono PCM and its sample rate from a WAV file (PCM16 or float32). */
export function readWav(wav: Buffer): { pcm: Buffer; rate: number } {
  if (wav.subarray(0, 4).toString("ascii") !== "RIFF" || wav.subarray(8, 12).toString("ascii") !== "WAVE") throw new Error("not a WAV file");
  let offset = 12;
  let format = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.subarray(offset, offset + 4).toString("ascii");
    const size = wav.readUInt32LE(offset + 4);
    const body = wav.subarray(offset + 8, offset + 8 + size);
    if (id === "fmt ") {
      format = body.readUInt16LE(0);
      channels = body.readUInt16LE(2);
      rate = body.readUInt32LE(4);
      bits = body.readUInt16LE(14);
      if (format === 0xfffe) format = body.readUInt16LE(24); // WAVE_FORMAT_EXTENSIBLE
    }
    if (id === "data") {
      if (channels !== 1) throw new Error(`expected mono, got ${channels} channels`);
      if (format === 1 && bits === 16) return { pcm: Buffer.from(body), rate };
      if (format === 3 && bits === 32) {
        const pcm = Buffer.alloc((body.length / 4) * 2);
        for (let index = 0; index < body.length / 4; index += 1) {
          const sample = Math.max(-1, Math.min(1, body.readFloatLE(index * 4)));
          pcm.writeInt16LE(Math.round(sample * 32767), index * 2);
        }
        return { pcm, rate };
      }
      throw new Error(`unsupported WAV format ${format}/${bits} bits`);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV without data");
}

/** Why a recording does not fit its text, or null when it does. */
export function checkRecording(text: string, seconds: number): string | null {
  if (seconds < 0.15) return "silent";
  if (text.length < 8) return seconds > 3 ? "too long for a word" : null;
  const perSecond = text.length / seconds;
  if (perSecond < 4) return `too slow (${perSecond.toFixed(1)} characters/s): the model may have rambled on`;
  if (perSecond > 30) return `too fast (${perSecond.toFixed(1)} characters/s): probably cut short`;
  return null;
}

async function main() {
  const manifest = arg("manifest");
  const wavs = path.resolve(arg("wavs"));
  const entries = readFileSync(manifest, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line) as { file: string; kind: "piece" | "sentence"; text: string; say: string });
  let imported = 0;
  let missing = 0;
  const rejected: string[] = [];
  for (const entry of entries) {
    const target = path.join(CACHE_DIR, entry.file);
    if (existsSync(target)) continue;
    const source = path.join(wavs, entry.file.replace(/\.(mp3|pcm)$/, ".wav"));
    if (!existsSync(source)) {
      missing += 1;
      continue;
    }
    try {
      const { pcm, rate } = readWav(readFileSync(source));
      if (rate !== PACK_RATE) throw new Error(`sample rate ${rate}, expected ${PACK_RATE}`);
      const speech = trimSilence(pcm, rate);
      const problem = checkRecording(entry.text, speech.length / 2 / rate);
      if (problem) throw new Error(problem);
      await store(target, entry.kind === "piece" ? speech : pcmToMp3(pcm, rate));
      imported += 1;
    } catch (error) {
      rejected.push(JSON.stringify({ ...entry, reason: error instanceof Error ? error.message : String(error) }));
    }
  }
  const rejectedFile = path.join(path.dirname(manifest), "rejected.jsonl");
  writeFileSync(rejectedFile, rejected.join("\n") + (rejected.length ? "\n" : ""));
  console.log(`${imported} imported, ${rejected.length} refused (→ ${rejectedFile}), ${missing} not rendered yet.`);
}

if (process.argv[1]?.endsWith("import.ts")) void main();
