// Tafawoq AI Teacher — the teacher's natural voice.
//
// The browser's built-in voice sounds robotic on most phones and bothers
// students, so the teacher's speech is synthesised on the server. The
// student chooses a male or a female teacher; each service below is tried
// in turn for that voice:
//   1. Microsoft Azure Speech (neural) — only when AZURE_SPEECH_KEY and
//      AZURE_SPEECH_REGION are set, up to TAFAWOQ_AZURE_MONTHLY_CHARS
//      characters a month (default 450 k, inside the free F0 tier's 500 k)
//      and 20 requests a minute (the F0 limit). Its Algerian voices (ar-DZ:
//      Ismael ♂, Amina ♀) are the closest to an Algerian teacher;
//      TAFAWOQ_AZURE_VOICE_MALE / _FEMALE pick others (ar-AE-FatimaNeural…);
//   2. Google Cloud Text-to-Speech (WaveNet) — only when GOOGLE_TTS_API_KEY
//      is set, up to TAFAWOQ_TTS_MONTHLY_CHARS a month (default 3.5 M,
//      inside Google's 4 M free quota);
//   3. Piper (MIT, open source, runs on this server, free and unlimited,
//      nothing leaves the server): the Arabic voice "Kareem" (♂), installed
//      by scripts/fetch-piper.mjs, and a female model when PIPER_MODEL_FEMALE
//      points at one (Piper publishes no female Arabic voice yet);
//   4. otherwise the client falls back to the browser's best voice.
//
// So that the free allowance of a paid service never runs out:
//   - every sentence is synthesised once and cached on disk for good: the
//     call's fixed sentences, the lessons and the dialogues are the same for
//     every student (the client sends one sentence per request,
//     shared/spokenArabic.ts), and ./ttsWarmup.ts prepares them ahead;
//   - the allowance is spread over the month: a sentence with maths in it
//     (numbers change from one exercise to the next) is synthesised whole
//     only while the month's usage is under its pro-rata line;
//   - beyond it, that sentence is assembled from cached pieces in the same
//     voice: its prose as one piece, its maths word by word ("3", "إكس",
//     "تربيع"…), a small vocabulary every exercise reuses.
// The voice only changes (to another service) when a paid one fails or is
// truly exhausted.
import { createHash } from "crypto";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { Mp3Encoder } from "@breezystack/lamejs";
import { sql } from "drizzle-orm";
import { HAS_WORD, bareWord, spokenSegments, withoutName } from "../../shared/spokenArabic";
import { ENV } from "../_core/env";
import { getDb } from "../db/shared";
import { storageGetSignedUrl, storagePut } from "../storage";
import { tafawoqTtsUsage } from "../../drizzle/schema";

export const MAX_TTS_CHARS = 600;

export const CACHE_DIR = path.resolve(process.env.TAFAWOQ_TTS_CACHE_DIR ?? path.join(process.cwd(), "uploads", "tts-cache"));
const PIPER_DIR = path.resolve(process.env.TAFAWOQ_PIPER_DIR ?? path.join(process.cwd(), ".replit-data", "piper"));
const PIPER_BIN = process.env.PIPER_BIN ?? path.join(PIPER_DIR, "piper", "piper");

export type VoiceGender = "male" | "female";
type Provider = "pack" | "azure" | "google" | "piper";
type Paid = "azure" | "google";

/**
 * The teacher speaks Arabic; in a language lesson the taught language's
 * words go to a voice of that language (German: Piper's "Thorsten",
 * free and open, recorded by a consenting speaker; Azure/Google when set).
 */
export type SpeechLang = "ar" | "de";

const PIPER_MODELS: Record<SpeechLang, Record<VoiceGender, string | undefined>> = {
  ar: {
    male: process.env.PIPER_MODEL ?? path.join(PIPER_DIR, "ar_JO-kareem-medium.onnx"),
    female: process.env.PIPER_MODEL_FEMALE,
  },
  de: {
    male: process.env.PIPER_MODEL_DE ?? path.join(PIPER_DIR, "de_DE-thorsten-medium.onnx"),
    female: process.env.PIPER_MODEL_DE_FEMALE,
  },
};
const GOOGLE_VOICES: Record<SpeechLang, Record<VoiceGender, string>> = {
  ar: {
    male: process.env.TAFAWOQ_TTS_VOICE ?? "ar-XA-Wavenet-B",
    female: process.env.TAFAWOQ_TTS_VOICE_FEMALE ?? "ar-XA-Wavenet-A",
  },
  de: { male: "de-DE-Wavenet-B", female: "de-DE-Wavenet-A" },
};
const AZURE_VOICES: Record<SpeechLang, Record<VoiceGender, string>> = {
  ar: {
    male: process.env.TAFAWOQ_AZURE_VOICE_MALE ?? "ar-DZ-IsmaelNeural",
    female: process.env.TAFAWOQ_AZURE_VOICE_FEMALE ?? "ar-DZ-AminaNeural",
  },
  de: { male: "de-DE-ConradNeural", female: "de-DE-KatjaNeural" },
};
/**
 * A prepared voice ("voice pack"): every sentence the teacher says, recorded
 * ahead with an open model (voice-dataset/pack/) and imported into the
 * cache. Free and unlimited, but nothing is synthesised live: what it lacks
 * falls to the next voice. The value names the pack (e.g. dz-teacher-f).
 */
const VOICE_PACKS: Record<VoiceGender, string | undefined> = {
  male: process.env.TAFAWOQ_VOICE_PACK_MALE || undefined,
  female: process.env.TAFAWOQ_VOICE_PACK_FEMALE || undefined,
};
export const PACK_RATE = Number(process.env.TAFAWOQ_VOICE_PACK_RATE ?? 24_000);
const MONTHLY_CAPS: Record<Paid, number> = {
  azure: Number(process.env.TAFAWOQ_AZURE_MONTHLY_CHARS ?? 450_000),
  google: Number(process.env.TAFAWOQ_TTS_MONTHLY_CHARS ?? 3_500_000),
};
/** Requests a minute: Azure's free tier allows 20 (not adjustable); a margin for clock drift. */
const REQUESTS_PER_MINUTE: Record<Paid, number> = { azure: 18, google: 300 };
const PAID_RATE = 24_000;

export type Voice = { audio: Buffer; contentType: "audio/mpeg"; provider: Provider; gender: VoiceGender };

const piperReady = (gender: VoiceGender, lang: SpeechLang = "ar") => {
  const model = PIPER_MODELS[lang][gender];
  return Boolean(model) && existsSync(PIPER_BIN) && existsSync(model!);
};

export function ttsProviders() {
  return {
    pack: Boolean(VOICE_PACKS.male || VOICE_PACKS.female),
    azure: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    google: Boolean(process.env.GOOGLE_TTS_API_KEY),
    piper: piperReady("male") || piperReady("female"),
    piperFemale: piperReady("female"),
    piperGerman: piperReady("male", "de") || piperReady("female", "de"),
  };
}

// ---------------------------------------------------------------------------
// Audio helpers: 16-bit little-endian mono PCM.
// ---------------------------------------------------------------------------

/** PCM → MP3 at 48 kbit/s (≈ 7× smaller than WAV, fine for speech). */
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

/** Cuts the silence before and after a word, keeping a short natural margin. */
export function trimSilence(pcm: Buffer, sampleRate: number, threshold = 400): Buffer {
  const count = Math.floor(pcm.length / 2);
  const window = Math.max(1, Math.round(sampleRate / 100)); // 10 ms
  const loud = (start: number) => {
    for (let index = start; index < Math.min(count, start + window); index += 1) {
      if (Math.abs(pcm.readInt16LE(index * 2)) > threshold) return true;
    }
    return false;
  };
  let first = 0;
  while (first < count && !loud(first)) first += window;
  if (first >= count) return Buffer.alloc(0);
  let last = Math.max(first, count - window);
  while (last > first && !loud(last)) last -= window;
  const margin = Math.round(sampleRate * 0.02);
  const start = Math.max(0, first - margin);
  const end = Math.min(count, last + window + margin);
  return pcm.subarray(start * 2, end * 2);
}

const silence = (sampleRate: number, ms: number) => Buffer.alloc(Math.round((sampleRate * ms) / 1000) * 2);

/** The PCM samples of a WAV file (Google's LINEAR16 answer). */
export function wavData(wav: Buffer): Buffer {
  if (wav.subarray(0, 4).toString("ascii") !== "RIFF") return wav;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.subarray(offset, offset + 4).toString("ascii");
    const size = wav.readUInt32LE(offset + 4);
    if (id === "data") return wav.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV without data");
}

// ---------------------------------------------------------------------------
// Piper: raw PCM from the local engine (`--output_raw`). One synthesis at a
// time keeps a small server responsive.
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function piperPcm(model: string, text: string): Promise<Buffer> {
  return oneAtATime(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        const child = spawn(PIPER_BIN, ["--model", model, "--length_scale", "1.05", "--output_raw"], {
          env: { ...process.env, LD_LIBRARY_PATH: path.dirname(PIPER_BIN) },
          stdio: ["pipe", "pipe", "ignore"],
        });
        const chunks: Buffer[] = [];
        child.stdout.on("data", chunk => chunks.push(chunk));
        child.on("error", reject);
        child.on("close", code => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`piper exited with ${code}`))));
        child.stdin.end(text);
      })
  );
}

const piperRates = new Map<string, number>();
async function piperSampleRate(model: string): Promise<number> {
  if (!piperRates.has(model)) {
    const config = JSON.parse(await readFile(`${model}.json`, "utf8")) as { audio?: { sample_rate?: number } };
    piperRates.set(model, config.audio?.sample_rate ?? 22050);
  }
  return piperRates.get(model)!;
}

// ---------------------------------------------------------------------------
// Paid services (Azure, Google).
// ---------------------------------------------------------------------------

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

async function azureSpeak(voice: string, text: string, format: "mp3" | "pcm"): Promise<Buffer> {
  const region = encodeURIComponent(process.env.AZURE_SPEECH_REGION!);
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": format === "mp3" ? "audio-24khz-48kbitrate-mono-mp3" : "raw-24khz-16bit-mono-pcm",
      "User-Agent": "tafawoq",
    },
    body: azureSsml(voice, text),
  });
  if (!response.ok) throw new Error(`Azure TTS HTTP ${response.status}`);
  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length) throw new Error("Azure TTS returned no audio");
  return audio;
}

async function googleSpeak(voice: string, text: string, format: "mp3" | "pcm"): Promise<Buffer> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.split("-").slice(0, 2).join("-"), name: voice },
        audioConfig:
          format === "mp3"
            ? { audioEncoding: "MP3", speakingRate: 0.95 }
            : { audioEncoding: "LINEAR16", sampleRateHertz: PAID_RATE, speakingRate: 0.95 },
      }),
    }
  );
  if (!response.ok) throw new Error(`Google TTS HTTP ${response.status}`);
  const body = (await response.json()) as { audioContent?: string };
  if (!body.audioContent) throw new Error("Google TTS returned no audio");
  const audio = Buffer.from(body.audioContent, "base64");
  return format === "mp3" ? audio : wavData(audio);
}

// ---------------------------------------------------------------------------
// The allowance of a paid service: characters a month, requests a minute.
// ---------------------------------------------------------------------------

/** The quota row: "2026-10" for Google (kept from before Azure), "azure:2026-10". */
const quotaKey = (provider: Paid, now: Date) => {
  const month = now.toISOString().slice(0, 7);
  return provider === "google" ? month : `${provider}:${month}`;
};

/**
 * How much of the month's allowance may be used by now: one day's share at
 * the start of the month, growing evenly to all of it on its last day.
 */
export function pacingLine(cap: number, now: Date = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const days = (end - start) / 86_400_000;
  const elapsed = (now.getTime() - start) / (end - start);
  return Math.min(cap, Math.round(cap * (elapsed + 1 / days)));
}

/**
 * What a request may draw on: the whole month ("month": prose, pieces), the
 * pro-rata line ("paced": whole sentences with maths), or the line minus a
 * margin kept for students ("spare": the warm-up).
 */
export type Allowance = "month" | "paced" | "spare";

function limitFor(provider: Paid, allowance: Allowance, now: Date): number {
  const cap = MONTHLY_CAPS[provider];
  if (allowance === "month") return cap;
  const line = pacingLine(cap, now);
  return allowance === "paced" ? line : line - Math.round(cap * 0.05);
}

/** Reserves `characters` of this month's allowance; false when it would pass the limit. */
async function reserveQuota(provider: Paid, characters: number, allowance: Allowance): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const key = quotaKey(provider, now);
  const current = await db.select().from(tafawoqTtsUsage).where(sql`${tafawoqTtsUsage.month} = ${key}`).limit(1);
  if ((current[0]?.characters ?? 0) + characters > limitFor(provider, allowance, now)) return false;
  await db
    .insert(tafawoqTtsUsage)
    .values({ month: key, characters })
    .onDuplicateKeyUpdate({ set: { characters: sql`${tafawoqTtsUsage.characters} + ${characters}` } });
  return true;
}

const recent: Record<Paid, number[]> = { azure: [], google: [] };

/**
 * A request slot under the service's per-minute limit, waiting up to
 * `waitMs` for one. `share` < 1 keeps part of the minute free (the warm-up
 * leaves room for students).
 */
export async function requestSlot(provider: Paid, waitMs: number, share = 1): Promise<boolean> {
  const limit = Math.max(1, Math.floor(REQUESTS_PER_MINUTE[provider] * share));
  const deadline = Date.now() + waitMs;
  for (;;) {
    const now = Date.now();
    const times = (recent[provider] = recent[provider].filter(time => now - time < 60_000));
    if (times.length < limit) {
      times.push(now);
      return true;
    }
    const wait = 60_000 - (now - times[0]) + 5;
    if (now + wait > deadline) return false;
    await new Promise(resolve => setTimeout(resolve, wait));
  }
}

// ---------------------------------------------------------------------------
// Engines: one voice of one service.
// ---------------------------------------------------------------------------

export type Engine = {
  provider: Provider;
  voice: string;
  gender: VoiceGender;
  /** A whole sentence as MP3. */
  mp3: (text: string) => Promise<Buffer>;
  /** A piece (a word, a phrase) as PCM at `rate()`. */
  pcm: (text: string) => Promise<Buffer>;
  rate: () => Promise<number>;
};

function enginesFor(gender: VoiceGender, lang: SpeechLang): Engine[] {
  const providers = ttsProviders();
  const list: Engine[] = [];
  // Voice packs hold the Arabic teacher's sentences only.
  const pack = lang === "ar" ? VOICE_PACKS[gender] : undefined;
  if (pack) {
    const notLive = async (): Promise<Buffer> => {
      throw new Error("a voice pack only plays what was prepared");
    };
    list.push({ provider: "pack", voice: pack, gender, mp3: notLive, pcm: notLive, rate: async () => PACK_RATE });
  }
  if (providers.azure) {
    const voice = AZURE_VOICES[lang][gender];
    list.push({
      provider: "azure",
      voice,
      gender,
      mp3: text => azureSpeak(voice, text, "mp3"),
      pcm: text => azureSpeak(voice, text, "pcm"),
      rate: async () => PAID_RATE,
    });
  }
  if (providers.google) {
    const voice = GOOGLE_VOICES[lang][gender];
    list.push({
      provider: "google",
      voice,
      gender,
      mp3: text => googleSpeak(voice, text, "mp3"),
      pcm: text => googleSpeak(voice, text, "pcm"),
      rate: async () => PAID_RATE,
    });
  }
  const model = PIPER_MODELS[lang][gender];
  if (model && piperReady(gender, lang)) {
    const rate = () => piperSampleRate(model);
    list.push({
      provider: "piper",
      voice: path.basename(model, ".onnx"),
      gender,
      mp3: async text => pcmToMp3(await piperPcm(model, text), await rate()),
      pcm: text => piperPcm(model, text),
      rate,
    });
  }
  return list;
}

/** The voices able to speak, in order: the chosen gender first, then any natural voice. */
export function engines(gender: VoiceGender, lang: SpeechLang = "ar"): Engine[] {
  return [...enginesFor(gender, lang), ...enginesFor(gender === "male" ? "female" : "male", lang)];
}

// ---------------------------------------------------------------------------
// The cache: whole sentences (MP3), assembled sentences (MP3), pieces (PCM).
// Keyed by the exact voice, so a new voice never replays another's audio.
// On this server's disk, and — with STORAGE_PROVIDER=s3 — in the object
// storage too: a hosted deployment's disk is wiped on every deploy, and a
// recording lost is allowance spent twice.
// ---------------------------------------------------------------------------

type Kind = "sentence" | "assembled" | "piece";

export function cachePath(engine: Pick<Engine, "provider" | "voice">, kind: Kind, text: string) {
  const tag = kind === "sentence" ? "" : `${kind}|`;
  const hash = createHash("sha256").update(`${engine.provider}|${engine.voice}|${tag}${text}`).digest("hex");
  return path.join(CACHE_DIR, hash.slice(0, 2), `${hash}.${kind === "piece" ? "pcm" : "mp3"}`);
}

const durable = () => ENV.storageProvider === "s3";
const durableKey = (file: string) => `tts-cache/${path.basename(file)}`;

async function storeLocally(file: string, audio: Buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  const partial = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.part`;
  await writeFile(partial, audio);
  await rename(partial, file);
}

/** Saves a recording on disk (and in the object storage when configured). */
export async function store(file: string, audio: Buffer) {
  await storeLocally(file, audio);
  if (!durable()) return;
  const type = file.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream";
  await storagePut(durableKey(file), audio, type).catch(error =>
    console.warn("[tafawoq] voice not saved to storage:", error instanceof Error ? error.message : error)
  );
}

async function readCached(file: string): Promise<Buffer | null> {
  const local = await readFile(file).catch(() => null);
  if (local || !durable()) return local;
  try {
    const response = await fetch(await storageGetSignedUrl(durableKey(file)));
    if (!response.ok) return null;
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) return null;
    await storeLocally(file, audio);
    return audio;
  } catch {
    return null;
  }
}

/** A paid request: a slot this minute and characters this month, or false. */
async function mayRequest(engine: Engine, characters: number, allowance: Allowance, waitMs: number, share: number) {
  if (engine.provider === "piper") return true;
  if (engine.provider === "pack") return false;
  return (await requestSlot(engine.provider, waitMs, share)) && (await reserveQuota(engine.provider, characters, allowance));
}

/** A whole sentence, cached or synthesised now; null when the allowance says no. */
export async function synthesizeSentence(
  engine: Engine,
  text: string,
  allowance: Allowance,
  waitMs: number,
  share = 1
): Promise<Buffer | null> {
  const file = cachePath(engine, "sentence", text);
  const hit = await readCached(file);
  if (hit) return hit;
  if (!(await mayRequest(engine, text.length, allowance, waitMs, share))) return null;
  const audio = await engine.mp3(text);
  await store(file, audio);
  return audio;
}

/** A piece (trimmed PCM), cached or synthesised now; null when the allowance says no. */
export async function piece(engine: Engine, text: string, allowance: Allowance, waitMs: number, share = 1): Promise<Buffer | null> {
  const file = cachePath(engine, "piece", text);
  const hit = await readCached(file);
  if (hit) return hit;
  if (!(await mayRequest(engine, text.length, allowance, waitMs, share))) return null;
  const audio = trimSilence(await engine.pcm(text), await engine.rate());
  await store(file, audio);
  return audio;
}

const PAUSE_MS = { word: 40, phrase: 140, punctuation: 260 };

/** The sentence assembled from pieces in this voice: prose whole, maths word by word. */
export async function assemble(engine: Engine, text: string, waitMs: number): Promise<Buffer | null> {
  const rate = await engine.rate();
  const parts: Buffer[] = [];
  for (const segment of spokenSegments(text)) {
    const ending = /[.،,:!؟?]$/.test(segment.text) ? PAUSE_MS.punctuation : PAUSE_MS.phrase;
    if (!HAS_WORD.test(segment.text)) {
      parts.push(silence(rate, ending));
      continue;
    }
    const units = segment.math ? segment.text.split(" ").map(bareWord).filter(Boolean) : [segment.text];
    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      const audio = await piece(engine, unit, "month", waitMs);
      if (!audio) return null;
      parts.push(audio, silence(rate, index === units.length - 1 ? ending : PAUSE_MS.word));
    }
  }
  return parts.length ? pcmToMp3(Buffer.concat(parts), rate) : null;
}

/**
 * The teacher saying `text` in the chosen voice, or null when no natural
 * voice is available. `name` is the student's: a voice that cannot say this
 * student's name (a voice pack) says the sentence without it.
 */
export async function speak(text: string, gender: VoiceGender = "male", name?: string, lang: SpeechLang = "ar"): Promise<Voice | null> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_TTS_CHARS);
  if (!clean) return null;
  const nameless = name ? withoutName(clean, name) : clean;
  const sentences = nameless !== clean && HAS_WORD.test(nameless) ? [clean, nameless] : [clean];
  for (const engine of engines(gender, lang)) {
    const found = (audio: Buffer): Voice => ({ audio, contentType: "audio/mpeg", provider: engine.provider, gender: engine.gender });
    try {
      for (const sentence of sentences) {
        // Maths pieces are an Arabic thing; a German sentence is always said whole.
        const hasMaths = lang === "ar" && spokenSegments(sentence).some(segment => segment.math);
        // Whole: always for prose (shared by every student, cached for good);
        // with maths, while this month's usage is under its pro-rata line.
        const whole = await synthesizeSentence(engine, sentence, hasMaths ? "paced" : "month", 3_000);
        if (whole) return found(whole);
        if (!hasMaths) continue;
        // Beyond the line: the same voice, assembled from cached pieces.
        const file = cachePath(engine, "assembled", sentence);
        const cached = await readCached(file);
        if (cached) return found(cached);
        const assembled = await assemble(engine, sentence, 3_000);
        if (assembled) {
          await store(file, assembled);
          return found(assembled);
        }
      }
    } catch (error) {
      console.warn(`[tafawoq] ${engine.provider} TTS failed, trying the next voice:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
}
