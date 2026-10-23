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
import { existsSync, readFileSync, statSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { Mp3Encoder } from "@breezystack/lamejs";
import { sql } from "drizzle-orm";
import { HAS_WORD, bareWord, spokenSegments, withoutName } from "../../shared/spokenArabic";
import { spellNumbers } from "../../shared/arabicNumbers";
import { ENV } from "../_core/env";
import { getDb } from "../db/shared";
import { storageGetSignedUrl, storagePut } from "../storage";
import { tafawoqTtsUsage } from "../../drizzle/schema";
import { FOREIGN_LANGS, type ForeignLang } from "@shared/taughtLanguages";

export const MAX_TTS_CHARS = 600;

export const CACHE_DIR = path.resolve(process.env.TAFAWOQ_TTS_CACHE_DIR || path.join(process.cwd(), "uploads", "tts-cache"));
const PIPER_DIR = path.resolve(process.env.TAFAWOQ_PIPER_DIR || path.join(process.cwd(), ".replit-data", "piper"));
const PIPER_BIN = process.env.PIPER_BIN || path.join(PIPER_DIR, "piper", "piper");

export type VoiceGender = "male" | "female";
type Provider = "pack" | "tassili" | "azure" | "google" | "piper";
type Paid = "azure" | "google";

/**
 * The teacher speaks Arabic; in a language lesson the taught language's
 * words go to a voice of that language — free and open Piper voices, each
 * recorded by a consenting speaker and released CC0: "Thorsten" (German),
 * "davefx" (Spanish), "Paola" (Italian, a woman's voice; Piper has no good
 * male Italian voice, so she also answers for the male teacher), "SIWIS"
 * (French, CC-BY 4.0, likewise a woman's voice), "Joe" and "Cori" (English,
 * CC0 / public domain). Azure /
 * Google voices of the language when those keys are set.
 */
export type SpeechLang = "ar" | ForeignLang;

const PIPER_MODELS: Record<SpeechLang, Record<VoiceGender, string | undefined>> = {
  ar: {
    male: process.env.PIPER_MODEL || path.join(PIPER_DIR, "ar_JO-kareem-medium.onnx"),
    female: process.env.PIPER_MODEL_FEMALE,
  },
  de: {
    male: process.env.PIPER_MODEL_DE || path.join(PIPER_DIR, "de_DE-thorsten-medium.onnx"),
    female: process.env.PIPER_MODEL_DE_FEMALE,
  },
  es: {
    male: process.env.PIPER_MODEL_ES || path.join(PIPER_DIR, "es_ES-davefx-medium.onnx"),
    female: process.env.PIPER_MODEL_ES_FEMALE,
  },
  it: {
    male: process.env.PIPER_MODEL_IT,
    female: process.env.PIPER_MODEL_IT_FEMALE || path.join(PIPER_DIR, "it_IT-paola-medium.onnx"),
  },
  // SIWIS (CC-BY 4.0, credited in the README): a woman's voice, also for the male teacher.
  fr: {
    male: process.env.PIPER_MODEL_FR,
    female: process.env.PIPER_MODEL_FR_FEMALE || path.join(PIPER_DIR, "fr_FR-siwis-medium.onnx"),
  },
  // Joe (CC0) and Cori (public domain).
  en: {
    male: process.env.PIPER_MODEL_EN || path.join(PIPER_DIR, "en_US-joe-medium.onnx"),
    female: process.env.PIPER_MODEL_EN_FEMALE || path.join(PIPER_DIR, "en_GB-cori-medium.onnx"),
  },
};
const GOOGLE_VOICES: Record<SpeechLang, Record<VoiceGender, string>> = {
  ar: {
    male: process.env.TAFAWOQ_TTS_VOICE || "ar-XA-Wavenet-B",
    female: process.env.TAFAWOQ_TTS_VOICE_FEMALE || "ar-XA-Wavenet-A",
  },
  de: { male: "de-DE-Wavenet-B", female: "de-DE-Wavenet-A" },
  es: { male: "es-ES-Wavenet-B", female: "es-ES-Wavenet-C" },
  it: { male: "it-IT-Wavenet-C", female: "it-IT-Wavenet-A" },
  fr: { male: "fr-FR-Wavenet-B", female: "fr-FR-Wavenet-A" },
  en: { male: "en-GB-Wavenet-B", female: "en-GB-Wavenet-A" },
};
const AZURE_VOICES: Record<SpeechLang, Record<VoiceGender, string>> = {
  ar: {
    male: process.env.TAFAWOQ_AZURE_VOICE_MALE || "ar-DZ-IsmaelNeural",
    female: process.env.TAFAWOQ_AZURE_VOICE_FEMALE || "ar-DZ-AminaNeural",
  },
  de: { male: "de-DE-ConradNeural", female: "de-DE-KatjaNeural" },
  es: { male: "es-ES-AlvaroNeural", female: "es-ES-ElviraNeural" },
  it: { male: "it-IT-DiegoNeural", female: "it-IT-ElsaNeural" },
  fr: { male: "fr-FR-HenriNeural", female: "fr-FR-DeniseNeural" },
  en: { male: "en-GB-RyanNeural", female: "en-GB-SoniaNeural" },
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
export const PACK_RATE = Number(process.env.TAFAWOQ_VOICE_PACK_RATE || 24_000);
const MONTHLY_CAPS: Record<Paid, number> = {
  azure: Number(process.env.TAFAWOQ_AZURE_MONTHLY_CHARS || 450_000),
  google: Number(process.env.TAFAWOQ_TTS_MONTHLY_CHARS || 3_500_000),
};
/** Requests a minute: Azure's free tier allows 20 (not adjustable); a margin for clock drift. */
const REQUESTS_PER_MINUTE: Record<Paid, number> = { azure: 18, google: 300 };
const PAID_RATE = 24_000;

export type Voice = { audio: Buffer; contentType: "audio/mpeg"; provider: Provider; gender: VoiceGender; accent: VoiceAccent };

/**
 * What the student actually hears, said plainly in the interface:
 *   - "algerian": an Algerian voice — Azure's ar-DZ voices, or a voice pack
 *     whose import declared an Algerian speaker (scripts/voice-pack/import.ts);
 *   - "arabic": a natural Arabic voice that is NOT Algerian — Piper's Kareem
 *     (ar_JO, Jordanian), Google's ar-XA, other Azure locales;
 *   - "device": the browser's own voice (decided on the client).
 * Never inferred from the teaching style: Darja text read by Kareem is still
 * a Jordanian voice.
 */
export type VoiceAccent = "algerian" | "arabic";

/**
 * The declaration written by scripts/voice-pack/import.ts next to the
 * recordings: whose voice it is (with a reference to the signed consent),
 * which model rendered it and under what licence. A pack without one is
 * never played: no voice of a person without their recorded permission.
 */
export type VoicePackInfo = {
  accent: VoiceAccent;
  speakerConsentRef: string;
  modelLicence: string;
  importedAt: string;
};
export const PACK_INFO_FILE = "voice-pack-info.json";
let packInfoCache: { at: number; mtime: number; info: VoicePackInfo | null } | null = null;
export function voicePackInfo(): VoicePackInfo | null {
  const file = path.join(CACHE_DIR, PACK_INFO_FILE);
  const now = Date.now();
  if (packInfoCache && now - packInfoCache.at < 60_000) return packInfoCache.info;
  let info: VoicePackInfo | null = null;
  let mtime = 0;
  try {
    mtime = statSync(file).mtimeMs;
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<VoicePackInfo>;
    if (
      (parsed.accent === "algerian" || parsed.accent === "arabic") &&
      typeof parsed.speakerConsentRef === "string" && parsed.speakerConsentRef.trim() &&
      typeof parsed.modelLicence === "string" && parsed.modelLicence.trim()
    )
      info = parsed as VoicePackInfo;
  } catch {
    info = null;
  }
  packInfoCache = { at: now, mtime, info };
  return info;
}

export function engineAccent(engine: Pick<Engine, "provider" | "voice">): VoiceAccent {
  if (engine.provider === "pack") return voicePackInfo()?.accent ?? "arabic";
  // TassiliTTS speaks Algerian Dardja, in the configured reference voice.
  if (engine.provider === "tassili") return "algerian";
  if (engine.provider === "azure") return /^ar-DZ-/i.test(engine.voice) ? "algerian" : "arabic";
  return "arabic";
}

const piperReady = (gender: VoiceGender, lang: SpeechLang = "ar") => {
  const model = PIPER_MODELS[lang][gender];
  return Boolean(model) && existsSync(PIPER_BIN) && existsSync(model!);
};

// ---------------------------------------------------------------------------
// TassiliTTS (services/tassili-tts): an Algerian Dardja voice served by our
// own Python service. Optional: only with TAFAWOQ_TASSILI_URL and
// TAFAWOQ_TASSILI_TOKEN, and only for a teacher voice the service reports
// ready (a reference recording with the speaker's consent). Its /health is
// read at most once a minute; a failure falls through to the next voice.
// ---------------------------------------------------------------------------

const tassiliUrl = () => (process.env.TAFAWOQ_TASSILI_URL || "").replace(/\/+$/, "");
const tassiliToken = () => process.env.TAFAWOQ_TASSILI_TOKEN || "";
const TASSILI_TIMEOUT_MS = () => Number(process.env.TAFAWOQ_TASSILI_TIMEOUT_MS || 90_000);
type TassiliHealth = { at: number; voices: Record<VoiceGender, boolean> };
let tassiliHealth: TassiliHealth | null = null;
let tassiliChecking: Promise<void> | null = null;

/** Reads the service's /health when the last answer is over a minute old. */
export async function refreshTassili(force = false): Promise<void> {
  if (!tassiliUrl() || !tassiliToken()) return;
  if (!force && tassiliHealth && Date.now() - tassiliHealth.at < 60_000) return;
  tassiliChecking ??= (async () => {
    let voices: Record<VoiceGender, boolean> = { male: false, female: false };
    try {
      const response = await fetch(`${tassiliUrl()}/health`, { signal: AbortSignal.timeout(3_000) });
      const body = (await response.json()) as { model_loaded?: boolean; voices?: Record<string, { ready?: boolean }> };
      if (body.model_loaded) voices = { male: !!body.voices?.male?.ready, female: !!body.voices?.female?.ready };
    } catch {
      // unreachable: no TassiliTTS voice until the next check
    }
    tassiliHealth = { at: Date.now(), voices };
  })().finally(() => {
    tassiliChecking = null;
  });
  await tassiliChecking;
}

/** Text TassiliTTS can read: Arabic script only, numbers in words. Null if something Latin is left. */
export function tassiliText(text: string): string | null {
  const spelled = spellNumbers(text)
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[^\u0621-\u063A\u0641-\u064A\u0671-\u06D3\sA-Za-z،؛؟!.,:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!spelled || /[A-Za-z]/.test(spelled)) return null;
  return spelled;
}

let tassiliRate = 24_000;
async function tassiliPcm(text: string, gender: VoiceGender): Promise<Buffer> {
  const readable = tassiliText(text);
  if (!readable) throw new Error("TassiliTTS reads Arabic script only");
  const response = await fetch(`${tassiliUrl()}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tassiliToken()}` },
    body: JSON.stringify({ text: readable, voice: gender }),
    signal: AbortSignal.timeout(TASSILI_TIMEOUT_MS()),
  });
  if (!response.ok) throw new Error(`TassiliTTS ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const wav = Buffer.from(await response.arrayBuffer());
  tassiliRate = wavRate(wav) ?? tassiliRate;
  return wavData(wav);
}

export function ttsProviders() {
  return {
    tassili: Boolean(tassiliUrl() && tassiliToken() && (tassiliHealth?.voices.male || tassiliHealth?.voices.female)),
    pack: Boolean((VOICE_PACKS.male || VOICE_PACKS.female) && voicePackInfo()),
    azure: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    google: Boolean(process.env.GOOGLE_TTS_API_KEY),
    piper: piperReady("male") || piperReady("female"),
    piperFemale: piperReady("female"),
    piperForeign: FOREIGN_LANGS.filter(lang => piperReady("male", lang) || piperReady("female", lang)),
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

/** The sample rate written in a WAV file's header, or null. */
export function wavRate(wav: Buffer): number | null {
  if (wav.subarray(0, 4).toString("ascii") !== "RIFF") return null;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.subarray(offset, offset + 4).toString("ascii");
    const size = wav.readUInt32LE(offset + 4);
    if (id === "fmt ") return wav.readUInt32LE(offset + 12);
    offset += 8 + size + (size % 2);
  }
  return null;
}

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
// time keeps a small server responsive; a bounded queue and a time limit
// keep a burst of requests or a stuck process from piling up (the caller
// then falls back to the next voice, and finally to the browser's own).
// ---------------------------------------------------------------------------

export const PIPER_MAX_WAITING = 40;
export const PIPER_TIMEOUT_MS = 30_000;
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  if (waiting >= PIPER_MAX_WAITING) return Promise.reject(new Error("piper busy"));
  waiting += 1;
  const run = queue.then(task, task).finally(() => {
    waiting -= 1;
  });
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
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("piper timed out"));
        }, PIPER_TIMEOUT_MS);
        const chunks: Buffer[] = [];
        child.stdout.on("data", chunk => chunks.push(chunk));
        child.on("error", error => {
          clearTimeout(timer);
          reject(error);
        });
        child.on("close", code => {
          clearTimeout(timer);
          if (code === 0) resolve(Buffer.concat(chunks));
          else reject(new Error(`piper exited with ${code}`));
        });
        child.stdin.on("error", () => undefined);
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
  const pack = lang === "ar" && voicePackInfo() ? VOICE_PACKS[gender] : undefined;
  if (pack) {
    const notLive = async (): Promise<Buffer> => {
      throw new Error("a voice pack only plays what was prepared");
    };
    list.push({ provider: "pack", voice: pack, gender, mp3: notLive, pcm: notLive, rate: async () => PACK_RATE });
  }
  if (lang === "ar" && tassiliUrl() && tassiliToken() && tassiliHealth?.voices[gender]) {
    list.push({
      provider: "tassili",
      voice: `tassili-${gender}`,
      gender,
      mp3: async text => pcmToMp3(await tassiliPcm(text, gender), tassiliRate),
      pcm: text => tassiliPcm(text, gender),
      rate: async () => tassiliRate,
    });
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

/**
 * TAFAWOQ_VOICE_EXCLUSIVE=female (or male): the teacher speaks only in that
 * one prepared voice — the voice pack, or the TassiliTTS service made from
 * the same consenting speaker — whatever the student chose, and never in
 * another voice: a sentence that voice does not have is shown as text only
 * (the route answers 409 VOICE_NOT_PREPARED and the client stays silent).
 */
export function voiceExclusive(): VoiceGender | null {
  const value = (process.env.TAFAWOQ_VOICE_EXCLUSIVE || "").trim().toLowerCase();
  return value === "female" || value === "male" ? value : null;
}

/** The voices able to speak, in order: the chosen gender first, then any natural voice. */
export function engines(gender: VoiceGender, lang: SpeechLang = "ar"): Engine[] {
  const only = voiceExclusive();
  if (only) return enginesFor(only, lang).filter(engine => engine.provider === "pack" || engine.provider === "tassili");
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
  if (engine.provider === "piper" || engine.provider === "tassili") return true;
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
  // The same sentence asked twice at once (prefetch + play, two students on
  // the same lesson) is synthesised once: the second request waits for the first.
  const running = inFlight.get(file);
  if (running) return running;
  const work = (async () => {
    const hit = await readCached(file);
    if (hit) return hit;
    if (!(await mayRequest(engine, text.length, allowance, waitMs, share))) return null;
    const audio = await engine.mp3(text);
    await store(file, audio);
    return audio;
  })().finally(() => inFlight.delete(file));
  inFlight.set(file, work);
  return work;
}
const inFlight = new Map<string, Promise<Buffer | null>>();

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
  const named = nameless !== clean && HAS_WORD.test(nameless) ? [clean, nameless] : [clean];
  if (lang === "ar") await refreshTassili();
  for (const engine of engines(gender, lang)) {
    // The student's name never goes to an external service (Azure, Google,
    // or a TassiliTTS service that may run elsewhere): they get the sentence
    // without it. Piper runs on this server.
    const external = engine.provider === "azure" || engine.provider === "google" || engine.provider === "tassili";
    if (external && nameless !== clean && !HAS_WORD.test(nameless)) continue;
    const sentences = external ? [nameless] : named;
    const found = (audio: Buffer): Voice => ({ audio, contentType: "audio/mpeg", provider: engine.provider, gender: engine.gender, accent: engineAccent(engine) });
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
