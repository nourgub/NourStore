// A phone-call lesson with the subject teacher — a conversation, not a
// lecture: the teacher says one short thing, then waits for the student.
// "ألو؟ تسمعني؟" → "واش راك؟" → today's topic, "مستعد؟" → the dialogue that
// leads the student to the rule → three graded oral questions (after a
// wrong answer: the correction, then "واضح؟" and a wait) → a summary.
// The student can cut in at any time ("دوري"), say «عاود» to repeat, or
// type. If the microphone is blocked or nothing is heard twice, the teacher
// stops talking and waits — it never talks on by itself.
// Browser speech APIs only — free, no call service, nothing recorded.
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, RotateCcw, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { M } from "./components";
import { useT } from "./i18n";
import type { TeacherStyle } from "./teacherStyle";
import { RECOGNITION_LANG, canListen, listenOnce, speakArabic, unlockAudio, useSpeechLesson } from "./speech";

type Phase = "ringing" | "connecting" | "speaking" | "listening" | "thinking" | "ended";

const QUESTIONS_PER_CALL = 3;
const REPEAT = /أعد|اعد|كرر|كرّر|عاود|répète|repete|repeat|again/i;
// Graded-answer openings, in Fusha and in Darja (server/tafawoq/darja.ts).
const GRADED = /^(✔|ليس تماماً|لا بأس\. الجواب الصحيح|ماشي هكا|ماعليش\. الجواب الصحيح)/;
const SAY = {
  fusha: {
    hello: (name: string, teacher: string) => `ألو؟ السلام عليكم يا ${name}! معك ${teacher}. هل تسمعني جيداً؟`,
    howAreYou: "كيف حالك اليوم؟",
    topic: (skill: string, mistake: string | null) =>
      `الحمد لله. اليوم سنعمل على «${skill}».${mistake ? ` لاحظت أنك تخطئ أحياناً في هذا: ${mistake}.` : ""} هل أنت مستعد؟`,
    go: "هيا بنا!",
    helloAgain: "ألو؟ هل تسمعني؟",
    clear: "هل هذا واضح؟",
    next: "حسناً، السؤال التالي.",
    askAgain: "والآن، أعيد السؤال.",
    checkUnderstood: "والآن لنتأكد أنك فهمت.",
  },
  darja: {
    hello: (name: string, teacher: string) => `ألو؟ السلام عليكم يا ${name}! معاك ${teacher}. راك تسمعني مليح؟`,
    howAreYou: "واش راك، لاباس؟",
    topic: (skill: string, mistake: string | null) =>
      `الحمد لله. اليوم نخدمو على «${skill}».${mistake ? ` لاحظت بلي ساعات تغلط في هادي: ${mistake}.` : ""} راك واجد؟`,
    go: "يالاه!",
    helloAgain: "ألو؟ راك تسمعني؟",
    clear: "واضحة؟",
    next: "مليح، السؤال الجاي.",
    askAgain: "ودوك، نعاودلك السؤال.",
    checkUnderstood: "ودوك نشوفو إذا فهمت.",
  },
};

/** Microphone errors after which listening again is pointless. */
const MIC_BLOCKED = new Set(["not-allowed", "service-not-allowed", "audio-capture", "not-supported", "start-failed"]);

/** What the teacher says aloud: the worked solution stays on screen only. */
function spokenPart(text: string) {
  return text.split(/\n(?:الحل|Solution|Solution) ?:/)[0].trim();
}

/** Marks the message that closes a dialogue (server/tafawoq/dialogue.ts). */
const DIALOGUE_DONE = "🎯";
const DIALOGUE_STEP = "❓ (";

/** The tutor's "say «اختبرني»…" tails make no sense mid-call. */
function forCall(text: string) {
  return text.replace(/\n?(قل|قول) «اختبرني»[^\n]*/g, "").trim();
}

/** Two-tone ring, synthesised (no audio file). Returns a stop function. */
function ring(): () => void {
  const AudioContextClass =
    typeof window !== "undefined"
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioContextClass) return () => {};
  const context = new AudioContextClass();
  let stopped = false;
  const burst = () => {
    if (stopped) return;
    const now = context.currentTime;
    for (const [offset, frequency] of [[0, 440], [0.4, 480]] as const) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.4);
    }
  };
  burst();
  const timer = setInterval(burst, 2200);
  return () => {
    stopped = true;
    clearInterval(timer);
    void context.close();
  };
}

function TeacherFace({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  return (
    <svg className={`tfq-face ${speaking ? "speaking" : ""} ${listening ? "listening" : ""}`} viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="url(#tfq-face-bg)" />
      <defs>
        <linearGradient id="tfq-face-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4a72c" />
          <stop offset="1" stopColor="#f1ce63" />
        </linearGradient>
      </defs>
      <path d="M30 42 Q60 14 90 42" stroke="#3b2a05" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="56" r="5" fill="#1b1305" className="tfq-face-eye" />
      <circle cx="76" cy="56" r="5" fill="#1b1305" className="tfq-face-eye" />
      <rect x="34" y="50" width="20" height="13" rx="5" fill="none" stroke="#1b1305" strokeWidth="2.5" />
      <rect x="66" y="50" width="20" height="13" rx="5" fill="none" stroke="#1b1305" strokeWidth="2.5" />
      <line x1="54" y1="56" x2="66" y2="56" stroke="#1b1305" strokeWidth="2.5" />
      <ellipse cx="60" cy="84" rx="13" ry="5" fill="#3b2a05" className="tfq-face-mouth" />
    </svg>
  );
}

export function CallScreen({
  lessonKey,
  lang,
  style,
  teacherName,
  onClose,
}: {
  lessonKey: string;
  lang: "ar" | "fr" | "en";
  style: TeacherStyle;
  teacherName: string;
  onClose: () => void;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const intro = trpc.tafawoq.callIntro.useMutation();
  const send = trpc.tafawoq.sendMessage.useMutation();
  const summary = trpc.tafawoq.callSummary.useMutation();
  useSpeechLesson(lessonKey);

  const [phase, setPhase] = useState<Phase>("ringing");
  const [caption, setCaption] = useState("");
  const [heard, setHeard] = useState("");
  const [asked, setAsked] = useState(0);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  /** Nothing heard twice, or the mic is blocked: the teacher waits for a tap or typing. */
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const stopRef = useRef<() => void>(() => {});
  const ringRef = useRef<() => void>(() => {});
  const closedRef = useRef(false);
  const callStart = useRef<number | null>(null);
  const lastQuestion = useRef("");
  const askedRef = useRef(0);
  const mutedRef = useRef(false);
  const misses = useRef(0);
  /**
   * Where the conversation is: the opening turns, the dialogue, the quiz,
   * or right after a correction (waiting for "واضح؟" to be answered).
   */
  const stage = useRef<"hello" | "howAreYou" | "ready" | "dialogue" | "quiz" | "afterFeedback">("hello");
  const opening = useRef<{ name: string; skillName: string; mistake: string | null }>({ name: "", skillName: "", mistake: null });
  /** The last thing the teacher said, for «عاود». */
  const lastSaid = useRef("");
  mutedRef.current = muted;

  const stopAll = () => {
    stopRef.current();
    stopRef.current = () => {};
  };

  useEffect(() => {
    ringRef.current = ring();
    return () => {
      closedRef.current = true;
      ringRef.current();
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "ringing" || phase === "ended" || phase === "connecting") return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase === "ringing" || phase === "ended" || phase === "connecting"]);

  /** Says one turn. The caption shows `text`; only `spoken` (default: the same) is read aloud. */
  const say = (text: string, then?: () => void, spoken: string = text) => {
    if (closedRef.current) return;
    stopAll();
    setCaption(text);
    lastSaid.current = spoken;
    setPhase("speaking");
    stopRef.current = speakArabic(spoken, {
      onEnd: () => {
        if (closedRef.current) return;
        then?.();
      },
    });
  };

  const listen = () => {
    if (closedRef.current) return;
    stopAll();
    setHeard("");
    setWaiting(false);
    setPhase("listening");
    if (mutedRef.current || !canListen()) {
      if (!canListen()) setNotice(t.callNoMic);
      return; // typed answer
    }
    let got = false;
    let error = "";
    let cancelled = false;
    const stopListening = listenOnce(RECOGNITION_LANG[lang], {
      onInterim: text => setHeard(text),
      onFinal: text => {
        got = true;
        void respond(text);
      },
      onError: code => {
        error = code;
      },
      onEnd: () => {
        // Stopped on purpose (the student cut in, typed, or hung up): not a silence.
        if (got || cancelled || closedRef.current || error === "aborted") return;
        if (MIC_BLOCKED.has(error)) {
          // Blocked microphone: say nothing more, switch to typing.
          setNotice(t.callMicBlocked);
          mutedRef.current = true;
          setMuted(true);
          setPhase("listening");
          return;
        }
        misses.current += 1;
        if (misses.current === 1) say(SAY[style].helloAgain, listen);
        else {
          // Still nothing: stop and wait for the student — never talk on alone.
          setWaiting(true);
          setPhase("listening");
        }
      },
    });
    stopRef.current = () => {
      cancelled = true;
      stopListening();
    };
  };

  const startDialogue = async () => {
    if (closedRef.current) return;
    stage.current = "dialogue";
    setPhase("thinking");
    const { reply } = await send.mutateAsync({ lessonKey, message: "علّمني بالحوار", style });
    if (!reply.includes(DIALOGUE_STEP)) {
      // No dialogue for this skill: straight to the questions.
      stage.current = "quiz";
      await askNext();
      return;
    }
    // The topic was already announced: skip the dialogue's own introduction.
    const parts = reply.split("\n\n");
    const short = parts.length > 2 ? parts.slice(1).join("\n\n") : reply;
    lastQuestion.current = reply.slice(reply.lastIndexOf(DIALOGUE_STEP));
    say(short, listen);
  };

  const askNext = async () => {
    if (closedRef.current) return;
    if (askedRef.current >= QUESTIONS_PER_CALL) {
      await finish();
      return;
    }
    stage.current = "quiz";
    setPhase("thinking");
    const { reply } = await send.mutateAsync({ lessonKey, message: "اختبرني", style });
    lastQuestion.current = reply;
    askedRef.current += 1;
    setAsked(askedRef.current);
    say(reply, listen);
  };

  const respond = async (text: string) => {
    if (!text.trim() || closedRef.current) return;
    misses.current = 0;
    setWaiting(false);
    setHeard(text);
    if (REPEAT.test(text)) {
      say(lastSaid.current, listen);
      return;
    }
    const words = SAY[style];
    // The opening: short turns, whatever the student answers.
    if (stage.current === "hello") {
      stage.current = "howAreYou";
      say(words.howAreYou, listen);
      return;
    }
    if (stage.current === "howAreYou") {
      stage.current = "ready";
      say(words.topic(opening.current.skillName, opening.current.mistake), listen);
      return;
    }
    if (stage.current === "ready") {
      say(words.go, () => void startDialogue());
      return;
    }
    if (stage.current === "afterFeedback") {
      say(words.next, () => void askNext());
      return;
    }
    setPhase("thinking");
    const { reply } = await send.mutateAsync({ lessonKey, message: text, style });
    void utils.tafawoq.workspace.invalidate({ lessonKey });
    if (stage.current === "dialogue") {
      if (reply.includes(DIALOGUE_DONE)) {
        stage.current = "quiz";
        const done = `${forCall(reply)}\n${words.checkUnderstood}`;
        say(done, () => void askNext());
      } else if (reply.includes(DIALOGUE_STEP)) {
        lastQuestion.current = reply.slice(reply.lastIndexOf(DIALOGUE_STEP));
        say(reply, listen);
      } else {
        // A question in the middle: the answer, then the same step again.
        say(`${reply}\n${words.askAgain}`, () => say(lastQuestion.current, listen));
      }
      return;
    }
    if (GRADED.test(reply)) {
      const feedback = forCall(reply);
      if (reply.startsWith("✔")) {
        say(feedback, () => void askNext(), spokenPart(feedback));
      } else {
        // After a mistake: the correction (solution on screen), then wait.
        stage.current = "afterFeedback";
        say(`${feedback}\n${words.clear}`, listen, `${spokenPart(feedback)} ${words.clear}`);
      }
    } else {
      // An explanation or example in the middle of a question: answer it,
      // then put the same question back.
      say(`${reply}\n${words.askAgain}`, () => say(lastQuestion.current, listen));
    }
  };

  const finish = async () => {
    stopAll();
    setWaiting(false);
    if (callStart.current === null) {
      setPhase("ended");
      return;
    }
    setPhase("thinking");
    const data = await summary.mutateAsync({ lessonKey, afterId: callStart.current, style });
    setResult({ correct: data.correct, total: data.total });
    void utils.tafawoq.workspace.invalidate({ lessonKey });
    void utils.tafawoq.overview.invalidate();
    say(data.text, () => setPhase("ended"));
  };

  const accept = async () => {
    unlockAudio(); // from the "accept" tap: phones then let the voice play
    ringRef.current();
    setPhase("connecting");
    setNotice(canListen() ? null : t.callNoMic);
    misses.current = 0;
    try {
      const data = await intro.mutateAsync({ lessonKey, style });
      callStart.current = data.afterId;
      opening.current = { name: data.name, skillName: data.skillName, mistake: data.mistake };
      stage.current = "hello";
      say(SAY[style].hello(data.name, teacherName), listen);
    } catch {
      setCaption(t.errors.generic);
      setPhase("ended");
    }
  };

  /** The student cuts in: the teacher stops and listens. */
  const cutIn = () => {
    if (mutedRef.current || !canListen()) return;
    misses.current = 0;
    listen();
  };

  const hangUp = () => {
    stopAll();
    ringRef.current();
    if (phase === "ringing" || (askedRef.current === 0 && stage.current !== "dialogue")) {
      closedRef.current = true;
      onClose();
      return;
    }
    // Close the call properly: the teacher says the summary, which is saved.
    void finish();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) {
      stopAll();
      setPhase("listening");
    } else if (phase === "listening") {
      listen();
    }
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const status =
    phase === "connecting"
      ? t.callConnecting
      : phase === "speaking"
        ? t.callTeacherSpeaking
        : phase === "listening"
          ? waiting || muted || !canListen()
            ? t.callWaiting
            : t.callListening
          : phase === "thinking"
            ? t.callThinking
            : phase === "ended"
              ? t.callEnded
              : t.callIncoming;

  return (
    <div className="tfq-live tfq-call" role="dialog" aria-modal="true" aria-label={teacherName}>
      <div className="tfq-call-panel">
        <div className={`tfq-call-avatar ${phase === "ringing" ? "ringing" : ""}`}>
          <TeacherFace speaking={phase === "speaking"} listening={phase === "listening"} />
        </div>
        <div className="tfq-call-name" dir="rtl" lang="ar">
          {teacherName}
        </div>
        <div className="tfq-live-status" aria-live="polite">
          {status}
          {phase !== "ringing" && phase !== "ended" && <span className="tfq-call-clock"> · {clock}</span>}
        </div>
        {asked > 0 && phase !== "ended" && (
          <div className="tfq-muted" style={{ textAlign: "center", fontSize: 13 }}>
            {t.callQuestion(Math.min(asked, QUESTIONS_PER_CALL), QUESTIONS_PER_CALL)}
          </div>
        )}

        {phase !== "ringing" && (
          <div className="tfq-live-transcript">
            {caption && (
              <div className="tfq-bubble tutor" dir="rtl" lang="ar">
                <M>{caption}</M>
              </div>
            )}
            {heard && (
              <div className="tfq-bubble student" dir="auto">
                {heard}
              </div>
            )}
          </div>
        )}

        {phase === "ended" && result && result.total > 0 && (
          <div className="tfq-banner" style={{ textAlign: "center", fontSize: 18 }}>
            {t.callScore(result.correct, result.total)}
          </div>
        )}

        {notice && phase !== "ended" && <div className="tfq-banner">{notice}</div>}

        {waiting && phase === "listening" && !muted && (
          <button type="button" className="tfq-btn tfq-call-talk" onClick={cutIn}>
            <Mic size={18} /> {t.callTapToTalk}
          </button>
        )}

        {(muted || !canListen() || waiting) && phase === "listening" && (
          <form
            className="tfq-chat-input"
            onSubmit={event => {
              event.preventDefault();
              const text = typed;
              setTyped("");
              stopAll();
              void respond(text);
            }}
          >
            <input className="tfq-input" dir="auto" value={typed} placeholder={t.callTypeInstead} onChange={event => setTyped(event.target.value)} />
            <button type="submit" className="tfq-btn" disabled={!typed.trim()} aria-label={t.send}>
              <Send size={16} className="tfq-flip" />
            </button>
          </form>
        )}

        <div className="tfq-call-actions">
          {phase === "ringing" ? (
            <>
              <button type="button" className="tfq-call-btn decline" onClick={hangUp} aria-label={t.callDecline}>
                <PhoneOff size={28} />
                <span>{t.callDecline}</span>
              </button>
              <button type="button" className="tfq-call-btn accept" onClick={() => void accept()} aria-label={t.callAccept}>
                <Phone size={28} />
                <span>{t.callAccept}</span>
              </button>
            </>
          ) : phase === "ended" ? (
            <>
              <button type="button" className="tfq-call-btn neutral" onClick={onClose} aria-label={t.callClose}>
                <PhoneOff size={24} />
                <span>{t.callClose}</span>
              </button>
              <button
                type="button"
                className="tfq-call-btn accept"
                aria-label={t.callAgain}
                onClick={() => {
                  closedRef.current = false;
                  askedRef.current = 0;
                  setAsked(0);
                  setSeconds(0);
                  setResult(null);
                  setCaption("");
                  setHeard("");
                  setWaiting(false);
                  void accept();
                }}
              >
                <RotateCcw size={24} />
                <span>{t.callAgain}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`tfq-call-btn neutral ${muted ? "on" : ""}`}
                onClick={toggleMute}
                disabled={!canListen()}
                aria-label={muted ? t.callUnmute : t.callMute}
              >
                {muted ? <MicOff size={24} /> : <Mic size={24} />}
                <span>{muted ? t.callUnmute : t.callMute}</span>
              </button>
              {phase === "speaking" && !muted && canListen() && (
                <button type="button" className="tfq-call-btn accept" onClick={cutIn} aria-label={t.callCutIn}>
                  <Mic size={24} />
                  <span>{t.callCutIn}</span>
                </button>
              )}
              <button type="button" className="tfq-call-btn decline" onClick={hangUp} aria-label={t.callHangUp}>
                <PhoneOff size={28} />
                <span>{t.callHangUp}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
