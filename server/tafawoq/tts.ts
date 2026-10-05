// Tafawoq AI Teacher — the teacher's natural voice.
//
// The browser's built-in voice sounds robotic on most phones and bothers
// students, so the teacher's speech is synthesised on the server:
//   1. Google Cloud Text-to-Speech (WaveNet, natural) — only when
//      GOOGLE_TTS_API_KEY is set, and only up to TAFAWOQ_TTS_MONTHLY_CHARS
//      characters a month (default 3.5 M, inside Google's 4 M free quota);
//   2. Piper (MIT, open source, runs on this server, free and unlimited,
//      nothing leaves the server) with the Arabic voice "Kareem" —
//      installed by scripts/fetch-piper.mjs;
//   3. otherwise the client falls back to the browser's best voice.
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
const PIPER_MODEL = process.env.PIPER_MODEL ?? path.join(PIPER_DIR, "ar_JO-kareem-medium.onnx");
const GOOGLE_VOICE = process.env.TAFAWOQ_TTS_VOICE ?? "ar-XA-Wavenet-B";
const MONTHLY_CAP = Number(process.env.TAFAWOQ_TTS_MONTHLY_CHARS ?? 3_500_000);

export type Voice = { audio: Buffer; contentType: "audio/mpeg"; provider: "google" | "piper" };

export function ttsProviders() {
  return {
    google: Boolean(process.env.GOOGLE_TTS_API_KEY),
    piper: existsSync(PIPER_BIN) && existsSync(PIPER_MODEL),
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
function piperPcm(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(PIPER_BIN, ["--model", PIPER_MODEL, "--length_scale", "1.05", "--output_raw"], {
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

let piperRate: number | null = null;
async function piperSampleRate(): Promise<number> {
  if (piperRate === null) {
    const config = JSON.parse(await readFile(`${PIPER_MODEL}.json`, "utf8")) as { audio?: { sample_rate?: number } };
    piperRate = config.audio?.sample_rate ?? 22050;
  }
  return piperRate;
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

async function piperSpeak(text: string): Promise<Buffer> {
  const rate = await piperSampleRate();
  return oneAtATime(async () => pcmToMp3(await piperPcm(text), rate));
}

// ---------------------------------------------------------------------------
// Google Cloud Text-to-Speech, within a monthly character cap.
// ---------------------------------------------------------------------------

const month = () => new Date().toISOString().slice(0, 7);

/** Reserves `characters` of this month's quota; false when the cap would be passed. */
async function reserveQuota(characters: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const current = await db.select().from(tafawoqTtsUsage).where(sql`${tafawoqTtsUsage.month} = ${month()}`).limit(1);
  if ((current[0]?.characters ?? 0) + characters > MONTHLY_CAP) return false;
  await db
    .insert(tafawoqTtsUsage)
    .values({ month: month(), characters })
    .onDuplicateKeyUpdate({ set: { characters: sql`${tafawoqTtsUsage.characters} + ${characters}` } });
  return true;
}

async function googleSpeak(text: string): Promise<Buffer> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ar-XA", name: GOOGLE_VOICE },
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

function cachePath(provider: string, text: string) {
  const hash = createHash("sha256").update(`${provider}|${provider === "google" ? GOOGLE_VOICE : "kareem"}|${text}`).digest("hex");
  return path.join(CACHE_DIR, hash.slice(0, 2), `${hash}.mp3`);
}

async function cached(provider: "google" | "piper", text: string, make: () => Promise<Buffer>): Promise<Buffer> {
  const file = cachePath(provider, text);
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

/** The teacher saying `text`, or null when no natural voice is available. */
export async function speak(text: string): Promise<Voice | null> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_TTS_CHARS);
  if (!clean) return null;
  const providers = ttsProviders();
  if (providers.google) {
    // Already-cached sentences cost nothing; new ones count against the cap.
    if (existsSync(cachePath("google", clean)) || (await reserveQuota(clean.length))) {
      try {
        return { audio: await cached("google", clean, () => googleSpeak(clean)), contentType: "audio/mpeg", provider: "google" };
      } catch (error) {
        console.warn("[tafawoq] Google TTS failed, using the local voice:", error instanceof Error ? error.message : error);
      }
    }
  }
  if (providers.piper) {
    try {
      return { audio: await cached("piper", clean, () => piperSpeak(clean)), contentType: "audio/mpeg", provider: "piper" };
    } catch (error) {
      console.warn("[tafawoq] Piper failed:", error instanceof Error ? error.message : error);
    }
  }
  return null;
}
