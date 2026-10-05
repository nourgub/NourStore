// Tafawoq AI Teacher — the teacher's voice, prepared ahead.
//
// What every student hears — the teacher's fixed sentences, the lessons'
// dialogues and explanations, the maths words sentences are assembled from
// (./tts.ts) — is synthesised in the background, a little at a time, in
// both voices. Once cached it costs nothing again, so the month's free
// allowance goes further every month. The warm-up only spends what the
// month's pro-rata line leaves spare (minus a margin kept for students) and
// at most half of each minute's requests. TAFAWOQ_TTS_WARMUP=0 turns it off.
import { HAS_WORD, STRONG_MATH, spokenChunks, spokenSegments, withoutName } from "../../shared/spokenArabic";
import { TIERS } from "../../shared/tafawoq";
import type { StudentContext } from "./context";
import { LESSONS } from "./curriculum";
import { PHRASES, toDarja } from "./darja";
import { DIALOGUE_DONE } from "./dialogue";
import { SPOKEN_VARIANTS } from "./generators/core";
import { instantiate } from "./generators/instantiate";
import { oralQuestionText } from "./service";
import { callIntroText, formatExample, generatedExamples } from "./templates";
import { engines, piece, synthesizeSentence, type Engine, type VoiceGender } from "./tts";

/** The maths vocabulary assembled sentences are made of: words and the common numbers. */
export function warmupPieces(): string[] {
  return [...Array.from(STRONG_MATH), ...Array.from({ length: 101 }, (_, number) => String(number))];
}

/** Stands for the student's name: sentences with it are said without it by a prepared voice. */
const SOMEONE = "ظظظ";

/** Texts → the sentences the client sends, in Fusha and Darja, names left out, each once. */
function sentencesOf(texts: string[]): string[] {
  const sentences = texts
    .flatMap(text => [text, toDarja(text)])
    .flatMap(text => spokenChunks(text))
    .map(sentence => withoutName(sentence, SOMEONE))
    .filter(sentence => HAS_WORD.test(sentence));
  return Array.from(new Set(sentences));
}

/** The teacher's sentences that name the student (said without the name by a prepared voice). */
const NAMED = [
  `السلام عليكم يا ${SOMEONE}! معك أستاذ الرياضيات. أتمنى أن تكون بخير.`,
  `✔ صحيح، أحسنت يا ${SOMEONE}!`,
  `${DIALOGUE_DONE} رائع يا ${SOMEONE}، لقد وصلت إلى القاعدة بنفسك:`,
  `انتهت حصتنا يا ${SOMEONE}.`,
  `بالتوفيق يا ${SOMEONE}! أنا هنا متى احتجتني.`,
  `أحسنت يا ${SOMEONE}! جرّب قسم «التمارين» لتثبيت ما تعلمته.`,
  `مرحباً ${SOMEONE}.`,
  `أحسنت يا ${SOMEONE}.`,
];

/**
 * The prose between the maths of these sentences ("إذن الجواب:", "احسب"…):
 * with the maths vocabulary, what a sentence no one recorded whole is
 * assembled from (./tts.ts).
 */
export function prosePieces(sentences: string[]): string[] {
  const pieces = sentences.flatMap(sentence => {
    const segments = spokenSegments(sentence);
    return segments.some(segment => segment.math) ? segments.filter(segment => !segment.math && HAS_WORD.test(segment.text)).map(segment => segment.text) : [];
  });
  return Array.from(new Set(pieces));
}

/** Every fixed sentence the teacher says, as the client sends it (one spoken sentence each), most heard first. */
export function warmupSentences(): string[] {
  const texts: string[] = [...NAMED];
  for (const [fusha, darja] of PHRASES) if (/[.!؟:]$/.test(fusha)) texts.push(fusha, darja);
  for (const lesson of LESSONS) {
    for (const skill of lesson.skills) {
      const dialogue = skill.dialogue;
      if (dialogue) texts.push(dialogue.opening, ...dialogue.steps.flatMap(step => [step.ask, step.hint, step.then ?? ""]), dialogue.rule);
    }
  }
  for (const lesson of LESSONS) for (const skill of lesson.skills) texts.push(skill.explanation);
  return sentencesOf(texts);
}

/**
 * The generated exercises the teacher says aloud, in every spoken variant
 * (./generators/core.ts): the call's example, the tutor's worked examples,
 * the oral quiz's questions and corrections. Fusha and Darja.
 */
export function variantSentences(variants = SPOKEN_VARIANTS): string[] {
  const texts: string[] = [];
  // Variant 1 of everything first: students meet the variants in order.
  for (let seed = 1; seed <= variants; seed += 1) {
    for (const lesson of LESSONS) {
      for (const skill of lesson.skills) {
        const summary = { key: skill.key, name: skill.name, mastery: 0.2 };
        const context = { name: SOMEONE, skills: [summary], focusSkills: [summary], recurringErrors: [] } as unknown as StudentContext;
        if (!skill.dialogue) texts.push(callIntroText(lesson, context, seed));
        for (const tier of TIERS) {
          const example = generatedExamples(lesson, skill.key, tier, seed)?.[0];
          if (example) texts.push(formatExample(example));
        }
      }
      for (const generator of lesson.generators ?? []) {
        const item = instantiate(generator, seed);
        texts.push(oralQuestionText(item), `الجواب: ${item.answer}.`, `الجواب الصحيح: ${item.answer}.`, item.explanation);
      }
    }
  }
  return sentencesOf(texts);
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
      for (const text of [...warmupPieces(), ...prosePieces(variantSentences())]) {
        if (!(await piece(engine, text, "spare", 60_000, 0.5))) return { made, stopped: true };
        made += 1;
      }
    }
    // The fixed sentences first (every student hears them), then the spoken variants.
    for (const text of [...warmupSentences(), ...variantSentences()]) {
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
