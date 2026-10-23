// Voice pack coverage: which of the recordings the teacher needs are in the
// voice cache, by kind, with the file formats found and the pack's
// declarations (consent, model licence). Reads the same list as export.ts.
//
//   TAFAWOQ_TTS_CACHE_DIR=uploads/tts-cache npx tsx scripts/voice-pack/coverage.ts --voice dz-teacher-f \
//     [--seconds-per-clip 120] [--out docs/VOICE_COVERAGE.md]
//
// Pieces (maths words, the prose between them) are stored as raw PCM, whole
// sentences as MP3: a pack rendered in order (pieces first) therefore holds
// mostly .pcm files at the start. Nothing here says the voice sounds right:
// that needs a listening test by people (docs/VOICE_LISTENING_TEST.md).
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { cachePath, CACHE_DIR, PACK_INFO_FILE } from "../../server/tafawoq/tts";
import { prosePieces, teacherMessageSentences, variantSentences, warmupPieces, warmupSentences } from "../../server/tafawoq/ttsWarmup";
import { SPOKEN_VARIANTS } from "../../server/tafawoq/generators/core";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const voice = arg("voice", "dz-teacher-f")!;
const secondsPerClip = Number(arg("seconds-per-clip", "120"));
const out = arg("out");
const engine = { provider: "pack" as const, voice };

type Group = { name: string; kind: "piece" | "sentence"; texts: string[] };
const fixed = warmupSentences();
const spoken = [...teacherMessageSentences(1), ...variantSentences(SPOKEN_VARIANTS), ...teacherMessageSentences(SPOKEN_VARIANTS)];
const groups: Group[] = [
  { name: "Maths words and symbols (pieces)", kind: "piece", texts: warmupPieces() },
  { name: "Prose between maths words (pieces)", kind: "piece", texts: prosePieces([...fixed, ...spoken]) },
  { name: "Fixed teacher sentences", kind: "sentence", texts: fixed },
  { name: "Teacher messages and spoken exercise variants", kind: "sentence", texts: spoken },
];

const seen = new Set<string>();
const rows = groups.map(group => {
  let required = 0;
  let present = 0;
  const missingExamples: string[] = [];
  for (const text of group.texts) {
    const file = cachePath(engine, group.kind, text);
    if (seen.has(file)) continue;
    seen.add(file);
    required++;
    if (existsSync(file) && statSync(file).size > 0) present++;
    else if (missingExamples.length < 3) missingExamples.push(text.slice(0, 60));
  }
  return { ...group, required, present, missingExamples };
});

// File formats actually in the cache directory.
const formats = new Map<string, number>();
const walk = (dir: string) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else formats.set(path.extname(entry.name) || "(none)", (formats.get(path.extname(entry.name) || "(none)") ?? 0) + 1);
  }
};
walk(CACHE_DIR);

const infoFile = path.join(CACHE_DIR, PACK_INFO_FILE);
const info = existsSync(infoFile) ? (JSON.parse(readFileSync(infoFile, "utf8")) as Record<string, unknown>) : null;

const required = rows.reduce((sum, row) => sum + row.required, 0);
const present = rows.reduce((sum, row) => sum + row.present, 0);
const missing = required - present;
const percent = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)} %` : "—");
const days = (missing * secondsPerClip) / 86_400;

const lines = [
  `# Voice pack coverage — ${voice}`,
  "",
  `Generated ${new Date().toISOString()} from ${path.isAbsolute(process.env.TAFAWOQ_TTS_CACHE_DIR ?? "") ? "a local voice cache" : `\`${CACHE_DIR}\``}.`,
  "",
  `**${present} of ${required} recordings present (${percent(present, required)}); ${missing} missing.**`,
  "",
  "| Group | Present | Required | Coverage | Examples missing |",
  "|---|---:|---:|---:|---|",
  ...rows.map(row => `| ${row.name} | ${row.present} | ${row.required} | ${percent(row.present, row.required)} | ${row.missingExamples.map(text => `«${text}»`).join(" · ") || "—"} |`),
  "",
  "## Files in the cache",
  "",
  ...(formats.size ? [...formats.entries()].map(([ext, n]) => `- \`${ext}\`: ${n}`) : ["- (empty)"]),
  "",
  "Pieces are raw PCM (`.pcm`), whole sentences MP3 (`.mp3`); `voice-pack-info.json` holds the declarations.",
  "",
  "## Declarations",
  "",
  info
    ? `- Speaker consent: ${String(info.speakerConsentRef ?? "—")}\n- Model licence: ${String(info.modelLicence ?? "—")}\n- Accent shown to students: ${String(info.accent ?? "—")}`
    : "- **No voice-pack-info.json: the server does not play this pack.**",
  "",
  "## Time to finish",
  "",
  `At ${secondsPerClip} s per recording (measured on this CPU: 70–190 s), the ${missing} missing recordings take about **${days.toFixed(0)} days** of one CPU; a GPU is far faster. The renderer resumes where it stopped (voice-dataset/pack/render_tassili.py).`,
  "",
  "## What this does not say",
  "",
  "- Whether the voice sounds natural in Darja, or reads numbers, fractions, roots, derivatives and French words correctly: that needs the listening test (docs/VOICE_LISTENING_TEST.md), not done yet.",
  "- With `TAFAWOQ_VOICE_EXCLUSIVE=female`, a missing recording is never replaced by another voice: the student sees the text and a notice that this sentence has no recording yet.",
];

const report = lines.join("\n") + "\n";
if (out) writeFileSync(out, report);
process.stdout.write(report);
