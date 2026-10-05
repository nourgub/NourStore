// Tafawoq — speech: speech recognition (the student talks, in the browser)
// and the teacher's voice (synthesised on the server, the browser's own
// voice as a fallback). Maths is rewritten for the ear first
// (shared/spokenArabic.ts).
import { spokenChunks } from "@shared/spokenArabic";
import { readTeacherVoice } from "./teacherStyle";

export { toSpokenArabic } from "@shared/spokenArabic";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

/**
 * The device's most natural Arabic voice, for when the server voice is
 * unavailable: network/neural voices ("Google", "Natural", "Online"…) sound
 * far less robotic than the default local ones.
 */
function arabicVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith("ar"));
  const natural = /natural|neural|online|google|premium|enhanced|siri/i;
  const score = (voice: SpeechSynthesisVoice) =>
    (natural.test(voice.name) ? 4 : 0) + (voice.lang.toLowerCase().startsWith("ar-dz") ? 2 : 0) + (voice.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

type SpeakHandlers = { onStart?: () => void; onEnd?: () => void };

/** The browser's own voice (fallback). */
function browserSpeak(chunks: string[], handlers: SpeakHandlers, started: boolean) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !chunks.length) {
    handlers.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let stopped = false;
  const voice = arabicVoice();
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "ar-SA";
    utterance.rate = 0.95;
    if (index === 0 && !started) utterance.onstart = () => !stopped && handlers.onStart?.();
    if (index === chunks.length - 1) {
      utterance.onend = () => !stopped && handlers.onEnd?.();
      utterance.onerror = () => !stopped && handlers.onEnd?.();
    }
    synth.speak(utterance);
  });
  return () => {
    stopped = true;
    synth.cancel();
  };
}

// ---------------------------------------------------------------------------
// The teacher's natural voice, synthesised on the server (server/tafawoq/tts.ts).
// ---------------------------------------------------------------------------

/** null = not tried yet; false = the server has no natural voice (use the browser's). */
let serverVoice: boolean | null = null;
let player: HTMLAudioElement | null = null;
const SILENT_MP3 = "data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80LEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQsQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NCxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function audioPlayer() {
  if (!player) {
    player = new Audio();
    player.preload = "auto";
  }
  return player;
}

/**
 * Call from a tap (accepting the call, opening a session, pressing play):
 * phones only let a page play sound it started from a user gesture.
 */
export function unlockAudio() {
  if (typeof Audio === "undefined") return;
  try {
    const audio = audioPlayer();
    audio.src = SILENT_MP3;
    void audio.play().catch(() => {});
  } catch {
    // nothing to unlock
  }
}

async function fetchVoice(text: string, signal: AbortSignal): Promise<Blob | null> {
  if (serverVoice === false) return null;
  try {
    const response = await fetch("/api/tafawoq/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text, voice: readTeacherVoice() }),
      signal,
    });
    if (response.status === 503 || response.status === 404 || response.status === 401) {
      serverVoice = false;
      return null;
    }
    if (!response.ok) return null;
    serverVoice = true;
    return await response.blob();
  } catch {
    return null;
  }
}

function play(blob: Blob): Promise<boolean> {
  return new Promise(resolve => {
    const audio = audioPlayer();
    const url = URL.createObjectURL(blob);
    const done = (ok: boolean) => {
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.src = url;
    audio.play().catch(() => done(false));
  });
}

/**
 * Speaks Arabic teaching text (math rewritten for the ear) in the teacher's
 * natural voice, sentence by sentence — the next sentence is fetched while
 * the current one plays. Falls back to the browser's best voice when the
 * server has none. Returns a stop function.
 */
export function speakArabic(text: string, handlers: SpeakHandlers = {}) {
  const chunks = spokenChunks(text);
  if (!chunks.length) {
    handlers.onEnd?.();
    return () => {};
  }
  if (serverVoice === false || typeof Audio === "undefined") return browserSpeak(chunks, handlers, false);

  let stopped = false;
  let stopFallback: () => void = () => {};
  const controller = new AbortController();
  const pending = new Map<number, Promise<Blob | null>>();
  const fetchAt = (index: number) => {
    if (index < chunks.length && !pending.has(index)) pending.set(index, fetchVoice(chunks[index], controller.signal));
    return pending.get(index);
  };

  void (async () => {
    fetchAt(0);
    fetchAt(1);
    for (let index = 0; index < chunks.length; index += 1) {
      const blob = await fetchAt(index);
      if (stopped) return;
      fetchAt(index + 1);
      fetchAt(index + 2);
      const ok = blob ? await (index === 0 ? (handlers.onStart?.(), play(blob)) : play(blob)) : false;
      if (stopped) return;
      if (!ok) {
        // No natural voice (or it can't play here): say the rest with the browser's.
        stopFallback = browserSpeak(chunks.slice(index), handlers, index > 0);
        return;
      }
    }
    if (!stopped) handlers.onEnd?.();
  })();

  return () => {
    stopped = true;
    controller.abort();
    player?.pause();
    stopFallback();
  };
}

// ---------------------------------------------------------------------------
// Speech recognition (Chrome, Edge, Safari, Android — not Firefox)
// ---------------------------------------------------------------------------

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionConstructor() !== null;
}

export const RECOGNITION_LANG = { ar: "ar-DZ", fr: "fr-FR", en: "en-US" } as const;

/**
 * Listens for one utterance. Calls onInterim with the live transcript and
 * onFinal once the student stops talking. Returns a stop function.
 */
export function listenOnce(
  lang: string,
  handlers: {
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }
) {
  const Constructor = recognitionConstructor();
  if (!Constructor) {
    handlers.onError("not-supported");
    handlers.onEnd();
    return () => {};
  }
  const recognition = new Constructor();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  let finalText = "";
  recognition.onresult = event => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    handlers.onInterim((finalText + interim).trim());
  };
  recognition.onerror = event => handlers.onError(event.error);
  recognition.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim());
    handlers.onEnd();
  };
  try {
    recognition.start();
  } catch {
    handlers.onError("start-failed");
    handlers.onEnd();
  }
  return () => {
    try {
      recognition.stop();
    } catch {
      // already stopped
    }
  };
}
