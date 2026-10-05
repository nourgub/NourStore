// Exports everything the teacher says, as a manifest an open TTS model can
// render offline (voice-dataset/pack/README.md):
//
//   npx tsx scripts/voice-pack/export.ts --voice dz-teacher-f [--variants 5] [--out voice-dataset/pack/out]
//
// One JSON line per recording: `file` (where the import puts it in the
// voice cache), `kind` (a whole sentence, or a piece assembled sentences are
// made of), `text` (the cache key) and `say` (what the model reads: numbers
// in words). The pieces (maths words, the prose between them) come first, then the fixed sentences, then the
// spoken exercise variants in order — render as far as time allows.
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { numbersInWords } from "../../shared/arabicNumbers";
import { cachePath, CACHE_DIR } from "../../server/tafawoq/tts";
import { prosePieces, variantSentences, warmupPieces, warmupSentences } from "../../server/tafawoq/ttsWarmup";
import { SPOKEN_VARIANTS } from "../../server/tafawoq/generators/core";

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

const voice = arg("voice");
const variants = Number(arg("variants", String(SPOKEN_VARIANTS)));
const out = path.resolve(arg("out", path.join("voice-dataset", "pack", "out")));
const engine = { provider: "pack" as const, voice };

const lines: string[] = [];
const seen = new Set<string>();
let characters = 0;
const add = (kind: "piece" | "sentence", text: string) => {
  const file = path.relative(CACHE_DIR, cachePath(engine, kind, text));
  if (seen.has(file)) return;
  seen.add(file);
  characters += text.length;
  lines.push(JSON.stringify({ file, kind, text, say: numbersInWords(text) }));
};
const fixed = warmupSentences();
const spoken = variantSentences(variants);
for (const text of [...warmupPieces(), ...prosePieces([...fixed, ...spoken])]) add("piece", text);
for (const text of fixed) add("sentence", text);
for (const text of spoken) add("sentence", text);

mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "manifest.jsonl"), lines.join("\n") + "\n");
console.log(`${lines.length} recordings (${characters.toLocaleString()} characters) → ${path.join(out, "manifest.jsonl")}`);
