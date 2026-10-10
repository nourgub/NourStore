// Downloads Piper (free, open-source, MIT — github.com/rhasspy/piper) and
// its Arabic voice "Kareem" (ar_JO, medium) for the Tafawoq teacher's
// natural voice, then the voices that read the language lessons' own words:
// "Thorsten" (German), "davefx" (Spanish), "Paola" (Italian) — all CC0,
// recorded by consenting speakers. Idempotent: does nothing when all are there.
// Prints the directory on success; exits non-zero (and the app falls back
// to the browser's voice) on failure.
//
// Usage: node scripts/fetch-piper.mjs [targetDir]   (default .replit-data/piper)
import { execFileSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const PIPER_URL = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz";
const VOICE_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ar/ar_JO/kareem/medium/ar_JO-kareem-medium";
const LANGUAGE_VOICES = ["de/de_DE/thorsten/medium/de_DE-thorsten-medium", "es/es_ES/davefx/medium/es_ES-davefx-medium", "it/it_IT/paola/medium/it_IT-paola-medium"];
const VOICES_ROOT = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0";

const target = path.resolve(process.argv[2] ?? path.join(process.cwd(), ".replit-data", "piper"));
mkdirSync(target, { recursive: true });

async function download(url, file) {
  if (existsSync(file) && statSync(file).size > 0) return;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`${url} → HTTP ${response.status}`);
  const partial = `${file}.part`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  renameSync(partial, file);
}

try {
  if (process.platform !== "linux" || process.arch !== "x64") throw new Error(`unsupported platform ${process.platform}/${process.arch}`);
  const binary = path.join(target, "piper", "piper");
  if (!existsSync(binary)) {
    const archive = path.join(target, "piper.tar.gz");
    await download(PIPER_URL, archive);
    execFileSync("tar", ["-xzf", archive, "-C", target]);
  }
  await download(`${VOICE_BASE}.onnx`, path.join(target, "ar_JO-kareem-medium.onnx"));
  await download(`${VOICE_BASE}.onnx.json`, path.join(target, "ar_JO-kareem-medium.onnx.json"));
  // The language voices are a bonus: without one, that language's words fall back to the device's voice.
  for (const voice of LANGUAGE_VOICES) {
    const name = path.basename(voice);
    try {
      await download(`${VOICES_ROOT}/${voice}.onnx.json`, path.join(target, `${name}.onnx.json`));
      await download(`${VOICES_ROOT}/${voice}.onnx`, path.join(target, `${name}.onnx`));
    } catch (error) {
      console.error(`[fetch-piper] ${name} not installed:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(target);
} catch (error) {
  console.error("[fetch-piper] could not install the natural voice:", error instanceof Error ? error.message : error);
  process.exit(1);
}
