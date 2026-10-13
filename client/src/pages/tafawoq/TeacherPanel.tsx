// BAC platform — the teacher's written + spoken conversation: messages in
// the fixed format (title, explanation, law shown one step at a time,
// example, question), read aloud on request or automatically in "talk"
// mode, and the student's quick requests.
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { teacherMessageSpeech, type TeacherAction, type TeacherMessage } from "@shared/bacPlatform";
import type { PublicQuestion } from "@shared/tafawoq";
import type { TeacherStyle } from "./teacherStyle";
import { trpc } from "@/lib/trpc";
import { M, QuestionRunner, ResultItems, type SubmitResult } from "./components";
import { Content, useT } from "./i18n";
import { bacError, useB } from "./bacI18n";
import { canSpeak, speakArabic, unlockAudio } from "./speech";

export type VoiceMode = "talk" | "write";
const VOICE_KEY = "tfq-voice-mode";

export function useVoiceMode(): [VoiceMode, (mode: VoiceMode) => void] {
  const [mode, setMode] = useState<VoiceMode>(() => {
    try {
      return localStorage.getItem(VOICE_KEY) === "talk" ? "talk" : "write";
    } catch {
      return "write";
    }
  });
  const update = useCallback((next: VoiceMode) => {
    setMode(next);
    try {
      localStorage.setItem(VOICE_KEY, next);
    } catch {
      // Not persisted (private mode): the choice still applies now.
    }
  }, []);
  return [mode, update];
}


export function StructuredMessage({ message, autoRead }: { message: TeacherMessage; autoRead: boolean }) {
  const b = useB();
  const [visible, setVisible] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const read = useCallback(() => {
    stopRef.current();
    setSpeaking(true);
    stopRef.current = speakArabic(teacherMessageSpeech(message), { onEnd: () => setSpeaking(false) });
  }, [message]);
  useEffect(() => {
    if (autoRead && canSpeak()) read();
    return () => stopRef.current();
    // Only when the message first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const steps = message.formula;
  return (
    <div className="tfq-tmsg">
      <div className="tfq-tmsg-head">
        <span className="tfq-kicker">{b.msgTitle}</span>
        {canSpeak() && (
          <button
            type="button"
            className="tfq-btn ghost small"
            onClick={() => {
              if (speaking) {
                stopRef.current();
                setSpeaking(false);
              } else {
                unlockAudio();
                read();
              }
            }}
            aria-label={speaking ? b.stop : b.readAloud}
          >
            {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />} {speaking ? b.stop : b.readAloud}
          </button>
        )}
      </div>
      <Content>
        <h4 className="tfq-tmsg-title">
          <M>{message.title}</M>
        </h4>
      </Content>
      <div className="tfq-tmsg-section">
        <span className="tfq-tmsg-label">{b.msgExplanation}</span>
        <Content>
          <p>
            <M>{message.explanation}</M>
          </p>
        </Content>
      </div>
      <div className="tfq-tmsg-section">
        <span className="tfq-tmsg-label">{b.msgFormula}</span>
        <Content>
          <ol className="tfq-tmsg-steps">
            {steps.slice(0, visible).map((step, index) => (
              <li key={index} className="tfq-math-box">
                <M>{step}</M>
              </li>
            ))}
          </ol>
        </Content>
        {visible < steps.length && (
          <div className="tfq-row">
            <button type="button" className="tfq-btn small" onClick={() => setVisible(visible + 1)}>
              {b.nextStep} ({visible}/{steps.length})
            </button>
            <button type="button" className="tfq-btn ghost small" onClick={() => setVisible(steps.length)}>
              {b.allSteps}
            </button>
          </div>
        )}
      </div>
      {message.example && (
        <div className="tfq-tmsg-section">
          <span className="tfq-tmsg-label">{b.msgExample}</span>
          <Content className="tfq-example">
            <p className="tfq-math-box">
              <M>{message.example.problem}</M>
            </p>
            {message.example.steps.length > 0 && (
              <ol>
                {message.example.steps.map((step, index) => (
                  <li key={index} className="tfq-math-box">
                    <M>{step}</M>
                  </li>
                ))}
              </ol>
            )}
            <p>
              ✔ <M>{message.example.answer}</M>
            </p>
          </Content>
        </div>
      )}
      <div className="tfq-tmsg-section question">
        <span className="tfq-tmsg-label">{b.msgQuestion}</span>
        <Content>
          <p style={{ whiteSpace: "pre-line" }}>
            <M>{message.question}</M>
          </p>
        </Content>
      </div>
    </div>
  );
}

/** The student's quick requests, the write/talk switch, and a similar exercise inline. */
export function TeacherQuickActions({
  lessonKey,
  style,
  voiceMode,
  setVoiceMode,
  onQuiz,
  onUnderstood,
  busy,
}: {
  lessonKey: string;
  style: TeacherStyle;
  voiceMode: VoiceMode;
  setVoiceMode: (mode: VoiceMode) => void;
  onQuiz: () => void;
  onUnderstood: (understood: boolean) => void;
  busy: boolean;
}) {
  const b = useB();
  const t = useT();
  const utils = trpc.useUtils();
  const [exercise, setExercise] = useState<{ assessmentId: number; questions: PublicQuestion[] } | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const action = trpc.bac.teacherAction.useMutation({
    onSuccess: async data => {
      if (data.exercise) {
        setExercise(data.exercise);
        setResult(null);
      }
      await utils.tafawoq.workspace.invalidate({ lessonKey });
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async data => {
      setResult(data);
      setExercise(null);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const run = (name: TeacherAction) => {
    unlockAudio();
    action.mutate({ lessonKey, action: name, style });
  };
  const disabled = busy || action.isPending;
  return (
    <div className="tfq-quick">
      <div className="tfq-kicker">{b.teacherRequests}</div>
      <div className="tfq-row">
        <button type="button" className="tfq-btn ghost small" disabled={disabled} onClick={() => run("simpler")}>
          {b.actions.simpler}
        </button>
        <button type="button" className="tfq-btn ghost small" disabled={disabled} onClick={() => run("example")}>
          {b.actions.example}
        </button>
        <button type="button" className="tfq-btn ghost small" disabled={disabled} onClick={() => run("stepHelp")}>
          {b.actions.stepHelp}
        </button>
        <button type="button" className="tfq-btn ghost small" disabled={disabled} onClick={onQuiz}>
          {b.actions.quiz}
        </button>
        <button type="button" className="tfq-btn ghost small" disabled={disabled} onClick={() => run("similar")}>
          {b.actions.similar}
        </button>
        <button type="button" className="tfq-btn ghost small" disabled={disabled} onClick={() => run("summary")}>
          {b.actions.summary}
        </button>
      </div>
      <div className="tfq-row" style={{ marginTop: 8 }}>
        <button type="button" className={`tfq-btn small ${voiceMode === "write" ? "" : "ghost"}`} aria-pressed={voiceMode === "write"} onClick={() => setVoiceMode("write")}>
          {b.actions.writeOnly}
        </button>
        <button
          type="button"
          className={`tfq-btn small ${voiceMode === "talk" ? "" : "ghost"}`}
          aria-pressed={voiceMode === "talk"}
          disabled={!canSpeak()}
          onClick={() => {
            unlockAudio();
            setVoiceMode("talk");
          }}
        >
          {b.actions.talk}
        </button>
        <span className="tfq-muted" style={{ fontSize: 13 }}>
          {voiceMode === "talk" ? b.voiceOn : b.voiceOff}
        </span>
      </div>
      <div className="tfq-row" style={{ marginTop: 8 }}>
        <button type="button" className="tfq-btn ghost small" disabled={busy} onClick={() => onUnderstood(true)}>
          ✓ {b.understood}
        </button>
        <button type="button" className="tfq-btn ghost small" disabled={busy || action.isPending} onClick={() => run("simpler")}>
          ✗ {b.notUnderstood}
        </button>
      </div>
      {exercise && (
        <div style={{ marginTop: 12 }}>
          <QuestionRunner
            questions={exercise.questions}
            submitting={submit.isPending}
            submitLabel={t.checkAnswers}
            onSubmit={answers => submit.mutate({ assessmentId: exercise.assessmentId, answers })}
          />
        </div>
      )}
      {result && (
        <div className="tfq-card" style={{ marginTop: 12 }}>
          <ResultItems items={result.items} />
        </div>
      )}
    </div>
  );
}
