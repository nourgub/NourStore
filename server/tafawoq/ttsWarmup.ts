// Tafawoq AI Teacher — the teacher's voice, prepared ahead.
//
// What every student hears — the teacher's fixed sentences, the lessons'
// dialogues and explanations, the maths words sentences are assembled from
// (./tts.ts) — is synthesised in the background, a little at a time, in
// both voices. Once cached it costs nothing again, so the month's free
// allowance goes further every month. The warm-up only spends what the
// month's pro-rata line leaves spare (minus a margin kept for students) and
// at most half of each minute's requests. TAFAWOQ_TTS_WARMUP=0 turns it off.
import { STRONG_MATH, spokenChunks } from "../../shared/spokenArabic";
import { LESSONS } from "./curriculum";
import { PHRASES, toDarja } from "./darja";
import { engines, piece, synthesizeSentence, type Engine, type VoiceGender } from "./tts";

/** The maths vocabulary assembled sentences are made of: words and the common numbers. */
export function warmupPieces(): string[] {
  return [...Array.from(STRONG_MATH), ...Array.from({ length: 101 }, (_, number) => String(number))];
}

/** Every fixed sentence the teacher says, as the client sends it (one spoken sentence each), most heard first. */
export function warmupSentences(): string[] {
  const texts: string[] = [];
  for (const [fusha, darja] of PHRASES) if (/[.!؟:]$/.test(fusha)) texts.push(fusha, darja);
  for (const lesson of LESSONS) {
    for (const skill of lesson.skills) {
      const dialogue = skill.dialogue;
      if (dialogue) texts.push(dialogue.opening, ...dialogue.steps.flatMap(step => [step.ask, step.hint, step.then ?? ""]), dialogue.rule);
    }
  }
  for (const lesson of LESSONS) for (const skill of lesson.skills) texts.push(skill.explanation);
  const sentences = texts.flatMap(text => [text, toDarja(text)]).flatMap(text => spokenChunks(text));
  return Array.from(new Set(sentences));
}

/** The first paid voice of each gender: the one students hear. */
function paidEngines(): Engine[] {
  return (["male", "female"] as VoiceGender[])
    .map(gender => engines(gender).find(engine => engine.gender === gender && engine.provider !== "piper"))
    .filter((engine): engine is Engine => Boolean(engine));
}

let running = false;

/** One pass: pieces first (they make assembling possible), then sentences. Stops when the spare allowance is spent. */
export async function warmUp(): Promise<{ made: number; stopped: boolean }> {
  if (running) return { made: 0, stopped: false };
  running = true;
  let made = 0;
  try {
    for (const engine of paidEngines()) {
      for (const text of warmupPieces()) {
        if (!(await piece(engine, text, "spare", 60_000, 0.5))) return { made, stopped: true };
        made += 1;
      }
    }
    const sentences = warmupSentences();
    for (const text of sentences) {
      for (const engine of paidEngines()) {
        if (!(await synthesizeSentence(engine, text, "spare", 60_000, 0.5))) return { made, stopped: true };
        made += 1;
      }
    }
    return { made, stopped: false };
  } catch (error) {
    console.warn("[tafawoq] voice warm-up paused:", error instanceof Error ? error.message : error);
    return { made, stopped: true };
  } finally {
    running = false;
  }
}

/** Runs the warm-up a minute after start, then every six hours. */
export function startTtsWarmup() {
  if (process.env.TAFAWOQ_TTS_WARMUP === "0" || process.env.NODE_ENV === "test") return;
  const run = () => {
    if (!paidEngines().length) return;
    void warmUp().then(({ made }) => made && console.log(`[tafawoq] voice warm-up: ${made} new recordings cached`));
  };
  setTimeout(run, 60_000).unref();
  setInterval(run, 6 * 60 * 60 * 1000).unref();
}
