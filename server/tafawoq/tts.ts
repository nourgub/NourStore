// Tafawoq AI Teacher — the teacher's natural voice.
//
// The browser's built-in voice sounds robotic on most phones and bothers
// students, so the teacher's speech is synthesised on the server. The
// student chooses a male or a female teacher; each service below is tried
// in turn for that voice:
//   1. Microsoft Azure Speech (neural) — only when AZURE_SPEECH_KEY and
//      AZURE_SPEECH_REGION are set, and only up to TAFAWOQ_AZURE_MONTHLY_CHARS
//      characters a month (default 450 k, inside the free F0 tier's 500 k).
//      Its Algerian voices (ar-DZ: Ismael ♂, Amina ♀) are the closest to an
//      Algerian teacher; TAFAWOQ_AZURE_VOICE_MALE / _FEMALE pick others
//      (e.g. ar-AE-FatimaNeural);
//   2. Google Cloud Text-to-Speech (WaveNet) — only when GOOGLE_TTS_API_KEY
//      is set, up to TAFAWOQ_TTS_MONTHLY_CHARS a month (default 3.5 M,
//      inside Google's 4 M free quota);
//   3. Piper (MIT, open source, runs on this server, free and unlimited,
//      nothing leaves the server): the Arabic voice "Kareem" (♂), installed
//      by scripts/fetch-piper.mjs, and a female model when PIPER_MODEL_FEMALE
//      points at one (Piper publishes no female Arabic voice yet);
//   4. otherwise the client falls back to the browser's best voice.
// A student who chose the female voice still hears a natural (male) voice
// rather than the robotic one when no female voice is available.
// Every sentence is synthesised once and cached on disk: the call's fixed
// sentences and the lessons' dialogues are the same for every student.
import { createHash } from "crypto";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { Mp3Encoder } from "@breezystack/lamejs";
import { sql } from "drizzle-orm";
import { getDb } from "../db/shared";
import { tafawoqTtsUsage } from "../../drizzle/schema";

export const MAX_TTS_CHARS = 600;

const CACHE_DIR = path.resolve(process.env.TAFAWOQ_TTS_CACHE_DIR ?? path.join(process.cwd(), "uploads", "tts-cache"));
const PIPER_DIR = path.resolve(process.env.TAFAWOQ_PIPER_DIR ?? path.join(process.cwd(), ".replit-data", "piper"));
const PIPER_BIN = process.env.PIPER_BIN ?? path.join(PIPER_DIR, "piper", "piper");

export type VoiceGender = "male" | "female";
type Provider = "azure" | "google" | "piper";

const PIPER_MODELS: Record<VoiceGender, string | undefined> = {
  male: process.env.PIPER_MODEL ?? path.join(PIPER_DIR, "ar_JO-kareem-medium.onnx"),
  female: process.env.PIPER_MODEL_FEMALE,
};
const GOOGLE_VOICES: Record<VoiceGender, string> = {
  male: process.env.TAFAWOQ_TTS_VOICE ?? "ar-XA-Wavenet-B",
  female: process.env.TAFAWOQ_TTS_VOICE_FEMALE ?? "ar-XA-Wavenet-A",
};
const AZURE_VOICES: Record<VoiceGender, string> = {
  male: process.env.TAFAWOQ_AZURE_VOICE_MALE ?? "ar-DZ-IsmaelNeural",
  female: process.env.TAFAWOQ_AZURE_VOICE_FEMALE ?? "ar-DZ-AminaNeural",
};
const MONTHLY_CAPS: Record<"azure" | "google", number> = {
  azure: Number(process.env.TAFAWOQ_AZURE_MONTHLY_CHARS ?? 450_000),
  google: Number(process.env.TAFAWOQ_TTS_MONTHLY_CHARS ?? 3_500_000),
};

export type Voice = { audio: Buffer; contentType: "audio/mpeg"; provider: Provider; gender: VoiceGender };

const piperReady = (gender: VoiceGender) => {
  const model = PIPER_MODELS[gender];
  return Boolean(model) && existsSync(PIPER_BIN) && existsSync(model!);
};

export function ttsProviders() {
  return {
    azure: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    google: Boolean(process.env.GOOGLE_TTS_API_KEY),
    piper: piperReady("male") || piperReady("female"),
    piperFemale: piperReady("female"),
  };
}

// ---------------------------------------------------------------------------
// Piper: WAV from the local engine, encoded to MP3 (≈ 7× smaller for phones).
// One synthesis at a time keeps a small server responsive.
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Raw 16-bit mono PCM from the local engine (`--output_raw`). */
function piperPcm(model: string, text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(PIPER_BIN, ["--model", model, "--length_scale", "1.05", "--output_raw"], {
      env: { ...process.env, LD_LIBRARY_PATH: path.dirname(PIPER_BIN) },
      stdio: ["pipe", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", chunk => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", code => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`piper exited with ${code}`))));
    child.stdin.end(text);
  });
}

const piperRates = new Map<string, number>();
async function piperSampleRate(model: string): Promise<number> {
  if (!piperRates.has(model)) {
    const config = JSON.parse(await readFile(`${model}.json`, "utf8")) as { audio?: { sample_rate?: number } };
    piperRates.set(model, config.audio?.sample_rate ?? 22050);
  }
  return piperRates.get(model)!;
}

/** 16-bit little-endian mono PCM → MP3 at 48 kbit/s (≈ 7× smaller than WAV, fine for speech). */
export function pcmToMp3(pcm: Buffer, sampleRate: number): Buffer {
  const samples = new Int16Array(Math.floor(pcm.length / 2));
  for (let index = 0; index < samples.length; index += 1) samples[index] = pcm.readInt16LE(index * 2);
  const encoder = new Mp3Encoder(1, sampleRate, 48);
  const parts: Buffer[] = [];
  for (let index = 0; index < samples.length; index += 1152) {
    const part = encoder.encodeBuffer(samples.subarray(index, index + 1152));
    if (part.length) parts.push(Buffer.from(part));
  }
  parts.push(Buffer.from(encoder.flush()));
  return Buffer.concat(parts);
}

async function piperSpeak(model: string, text: string): Promise<Buffer> {
  const rate = await piperSampleRate(model);
  return oneAtATime(async () => pcmToMp3(await piperPcm(model, text), rate));
}

// ---------------------------------------------------------------------------
// Paid services (Azure, Google), each within its monthly free allowance.
// ---------------------------------------------------------------------------

/** The quota row: "2026-10" for Google (kept from before Azure), "azure:2026-10". */
const quotaKey = (provider: "azure" | "google") => {
  const month = new Date().toISOString().slice(0, 7);
  return provider === "google" ? month : `${provider}:${month}`;
};

/** Reserves `characters` of this month's quota; false when the cap would be passed. */
async function reserveQuota(provider: "azure" | "google", characters: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const key = quotaKey(provider);
  const current = await db.select().from(tafawoqTtsUsage).where(sql`${tafawoqTtsUsage.month} = ${key}`).limit(1);
  if ((current[0]?.characters ?? 0) + characters > MONTHLY_CAPS[provider]) return false;
  await db
    .insert(tafawoqTtsUsage)
    .values({ month: key, characters })
    .onDuplicateKeyUpdate({ set: { characters: sql`${tafawoqTtsUsage.characters} + ${characters}` } });
  return true;
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** SSML for the voice: its own locale (ar-DZ, ar-AE…), a calm teaching pace. */
export function azureSsml(voice: string, text: string): string {
  const locale = voice.split("-").slice(0, 2).join("-");
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${escapeXml(voice)}"><prosody rate="-5%">${escapeXml(text)}</prosody></voice></speak>`
  );
}

async function azureSpeak(voice: string, text: string): Promise<Buffer> {
  const region = encodeURIComponent(process.env.AZURE_SPEECH_REGION!);
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "tafawoq",
    },
    body: azureSsml(voice, text),
  });
  if (!response.ok) throw new Error(`Azure TTS HTTP ${response.status}`);
  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length) throw new Error("Azure TTS returned no audio");
  return audio;
}

async function googleSpeak(voice: string, text: string): Promise<Buffer> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ar-XA", name: voice },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
      }),
    }
  );
  if (!response.ok) throw new Error(`Google TTS HTTP ${response.status}`);
  const body = (await response.json()) as { audioContent?: string };
  if (!body.audioContent) throw new Error("Google TTS returned no audio");
  return Buffer.from(body.audioContent, "base64");
}

// ---------------------------------------------------------------------------

/** Cached by the exact voice: a new voice never replays another's audio. */
function cachePath(provider: Provider, voice: string, text: string) {
  const hash = createHash("sha256").update(`${provider}|${voice}|${text}`).digest("hex");
  return path.join(CACHE_DIR, hash.slice(0, 2), `${hash}.mp3`);
}

async function cached(file: string, make: () => Promise<Buffer>): Promise<Buffer> {
  try {
    return await readFile(file);
  } catch {
    // not cached yet
  }
  const audio = await make();
  await mkdir(path.dirname(file), { recursive: true });
  const partial = `${file}.${process.pid}.part`;
  await writeFile(partial, audio);
  await rename(partial, file);
  return audio;
}

type Attempt = { provider: Provider; voice: string; gender: VoiceGender; make: (text: string) => Promise<Buffer> };

/** The services able to say it, in order: the chosen gender first, then any natural voice. */
function attempts(gender: VoiceGender): Attempt[] {
  const providers = ttsProviders();
  const list: Attempt[] = [];
  const add = (wanted: VoiceGender) => {
    if (providers.azure) list.push({ provider: "azure", voice: AZURE_VOICES[wanted], gender: wanted, make: text => azureSpeak(AZURE_VOICES[wanted], text) });
    if (providers.google) list.push({ provider: "google", voice: GOOGLE_VOICES[wanted], gender: wanted, make: text => googleSpeak(GOOGLE_VOICES[wanted], text) });
    const model = PIPER_MODELS[wanted];
    if (model && piperReady(wanted)) list.push({ provider: "piper", voice: path.basename(model, ".onnx"), gender: wanted, make: text => piperSpeak(model, text) });
  };
  add(gender);
  add(gender === "male" ? "female" : "male");
  return list;
}

/** The teacher saying `text` in the chosen voice, or null when no natural voice is available. */
export async function speak(text: string, gender: VoiceGender = "male"): Promise<Voice | null> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_TTS_CHARS);
  if (!clean) return null;
  for (const attempt of attempts(gender)) {
    const file = cachePath(attempt.provider, attempt.voice, clean);
    // Already-cached sentences cost nothing; new ones count against the paid services' caps.
    if (attempt.provider !== "piper" && !existsSync(file) && !(await reserveQuota(attempt.provider, clean.length))) continue;
    try {
      const audio = await cached(file, () => attempt.make(clean));
      return { audio, contentType: "audio/mpeg", provider: attempt.provider, gender: attempt.gender };
    } catch (error) {
      console.warn(`[tafawoq] ${attempt.provider} TTS failed, trying the next voice:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
}
