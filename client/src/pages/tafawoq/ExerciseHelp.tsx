// "ارفع تمرينك": the student photographs or types an exercise; a recognised
// typed BAC exercise gets the free solver's step-by-step solution at once,
// anything else reaches a teacher, whose detailed solution appears here.
// TeacherInbox is the other side: teachers answer the waiting exercises.
import { useRef, useState } from "react";
import { Camera, CheckCircle2, Clock, GraduationCap, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { M } from "./components";
import { Content, useT } from "./i18n";

type Outputs = inferRouterOutputs<AppRouter>["tafawoq"];
type Exercise = Outputs["myExercises"][number];

/** Phone photos are large: downscale to 1600 px and re-encode as JPEG (also drops EXIF/location). */
async function photoToJpeg(file: File): Promise<{ mimeType: "image/jpeg"; base64: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.85);
    return { mimeType: "image/jpeg", base64: preview.split(",")[1], preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SolutionView({ exercise }: { exercise: Exercise }) {
  const t = useT();
  if (!exercise.auto) return null;
  return (
    <div className="tfq-ex-solution">
      <div className="tfq-kicker">
        {t.exSolution} — {exercise.auto.title}
      </div>
      <Content>
        <ol>
          {exercise.auto.steps.map((step, index) => (
            <li key={index}>
              <M>{step}</M>
            </li>
          ))}
        </ol>
        <strong>
          {t.exAnswer}: <M>{exercise.auto.answer}</M>
        </strong>
      </Content>
    </div>
  );
}

function ExerciseCard({ exercise, onAskTeacher }: { exercise: Exercise; onAskTeacher?: () => void }) {
  const t = useT();
  const icon =
    exercise.status === "answered" || exercise.status === "auto" ? <CheckCircle2 size={14} /> : <Clock size={14} />;
  return (
    <div className="tfq-card tfq-ex-card">
      <div className="tfq-spread">
        <span className={`tfq-chip ${exercise.status === "open" ? "info" : "good"}`}>
          {icon} {t.exStatus[exercise.status]}
        </span>
        <span className="tfq-muted" style={{ fontSize: 12 }}>
          {exercise.lessonTitle ? <Content as="span">{exercise.lessonTitle} · </Content> : null}
          {new Date(exercise.createdAt).toLocaleDateString()}
        </span>
      </div>
      {exercise.text && (
        <Content className="tfq-ex-text">
          <M>{exercise.text}</M>
        </Content>
      )}
      {exercise.imageUrl && (
        <a href={exercise.imageUrl} target="_blank" rel="noreferrer">
          <img className="tfq-ex-photo" src={exercise.imageUrl} alt={t.exPhoto} loading="lazy" />
        </a>
      )}
      {exercise.note && <p className="tfq-muted" style={{ fontSize: 14 }}>« {exercise.note} »</p>}
      <SolutionView exercise={exercise} />
      {exercise.status === "open" && <p className="tfq-muted">{t.exWaiting}</p>}
      {exercise.answer && (
        <div className="tfq-ex-solution teacher">
          <div className="tfq-kicker">
            <GraduationCap size={14} /> {t.exTeacherAnswer}
          </div>
          <Content className="tfq-ex-answer">
            <M>{exercise.answer}</M>
          </Content>
        </div>
      )}
      {exercise.status === "auto" && onAskTeacher && (
        <button type="button" className="tfq-btn ghost small" onClick={onAskTeacher}>
          <GraduationCap size={14} /> {t.exAskTeacher}
        </button>
      )}
    </div>
  );
}

export function ExerciseHelp({ lessons }: { lessons: Array<{ key: string; title: string }> }) {
  const t = useT();
  const utils = trpc.useUtils();
  const mine = trpc.tafawoq.myExercises.useQuery(undefined, {
    // A teacher's answer shows up without reloading while one is waiting.
    refetchInterval: query => (query.state.data?.some(entry => entry.status === "open") ? 30_000 : false),
  });
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [lessonKey, setLessonKey] = useState("");
  const [photo, setPhoto] = useState<{ mimeType: "image/jpeg"; base64: string; preview: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = trpc.tafawoq.submitExercise.useMutation({
    onSuccess: async () => {
      setText("");
      setNote("");
      setPhoto(null);
      await utils.tafawoq.myExercises.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const askTeacher = trpc.tafawoq.askTeacher.useMutation({
    onSuccess: () => utils.tafawoq.myExercises.invalidate(),
    onError: error => toast.error(error.message),
  });

  return (
    <>
      <div className="tfq-card">
        <h1 style={{ marginTop: 0 }}>{t.exTitle}</h1>
        <p className="tfq-muted">{t.exIntro}</p>
        <form
          className="tfq-form"
          onSubmit={event => {
            event.preventDefault();
            submit.mutate({
              text: text.trim() || null,
              note: note.trim() || null,
              lessonKey: lessonKey || null,
              image: photo ? { mimeType: photo.mimeType, base64: photo.base64 } : null,
            });
          }}
        >
          <textarea
            className="tfq-input"
            dir="auto"
            rows={4}
            maxLength={4000}
            value={text}
            placeholder={t.exTextPh}
            onChange={event => setText(event.target.value)}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            onChange={async event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
                toast.error(t.exPhotoError);
                return;
              }
              try {
                setPhoto(await photoToJpeg(file));
              } catch {
                toast.error(t.exPhotoError);
              }
            }}
          />
          {photo ? (
            <div className="tfq-ex-preview">
              <img src={photo.preview} alt={t.exPhoto} />
              <div className="tfq-row">
                <button type="button" className="tfq-btn ghost small" onClick={() => fileInput.current?.click()}>
                  <Camera size={14} /> {t.exPhotoChange}
                </button>
                <button type="button" className="tfq-btn ghost small" onClick={() => setPhoto(null)}>
                  <Trash2 size={14} /> {t.exPhotoRemove}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="tfq-btn ghost" onClick={() => fileInput.current?.click()}>
              <Camera size={16} /> {t.exPhoto}
            </button>
          )}
          <input className="tfq-input" dir="auto" maxLength={1000} value={note} placeholder={t.exNote} onChange={event => setNote(event.target.value)} />
          <label className="tfq-row" style={{ gap: 8 }}>
            <span className="tfq-muted">{t.exLesson}</span>
            <select className="tfq-input" style={{ maxWidth: 280 }} value={lessonKey} onChange={event => setLessonKey(event.target.value)}>
              <option value="">{t.exNoLesson}</option>
              {lessons.map(lesson => (
                <option key={lesson.key} value={lesson.key}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="tfq-btn" disabled={submit.isPending || (!text.trim() && !photo)}>
            <Send size={16} className="tfq-flip" /> {submit.isPending ? t.exSending : t.exSend}
          </button>
        </form>
      </div>

      <h2 style={{ marginTop: 24 }}>{t.exMine}</h2>
      {mine.data && !mine.data.length && <p className="tfq-muted">{t.exNone}</p>}
      {mine.data?.map(exercise => (
        <ExerciseCard key={exercise.id} exercise={exercise} onAskTeacher={() => askTeacher.mutate({ exerciseId: exercise.id })} />
      ))}
    </>
  );
}

function InboxItem({ exercise }: { exercise: Outputs["teacherInbox"][number] }) {
  const t = useT();
  const utils = trpc.useUtils();
  const [answer, setAnswer] = useState("");
  const send = trpc.tafawoq.answerExercise.useMutation({
    onSuccess: () => utils.tafawoq.teacherInbox.invalidate(),
    onError: error => toast.error(error.message),
  });
  return (
    <div className="tfq-card tfq-ex-card">
      <div className="tfq-spread">
        <strong>{t.inboxFrom(exercise.studentName)}</strong>
        <span className="tfq-muted" style={{ fontSize: 12 }}>
          {exercise.lessonTitle ? <Content as="span">{exercise.lessonTitle} · </Content> : null}
          {new Date(exercise.createdAt).toLocaleString()}
        </span>
      </div>
      {exercise.text && (
        <Content className="tfq-ex-text">
          <M>{exercise.text}</M>
        </Content>
      )}
      {exercise.imageUrl && (
        <a href={exercise.imageUrl} target="_blank" rel="noreferrer">
          <img className="tfq-ex-photo" src={exercise.imageUrl} alt="" loading="lazy" />
        </a>
      )}
      {exercise.note && <p className="tfq-muted">« {exercise.note} »</p>}
      {exercise.auto && (
        <>
          <p className="tfq-muted" style={{ fontSize: 13 }}>{t.inboxAutoHint}</p>
          <SolutionView exercise={exercise} />
        </>
      )}
      <form
        className="tfq-form"
        onSubmit={event => {
          event.preventDefault();
          send.mutate({ exerciseId: exercise.id, answer });
        }}
      >
        <textarea className="tfq-input" dir="auto" rows={6} value={answer} placeholder={t.inboxAnswerPh} onChange={event => setAnswer(event.target.value)} />
        <button type="submit" className="tfq-btn" disabled={send.isPending || answer.trim().length < 10}>
          <Send size={16} className="tfq-flip" /> {t.inboxSend}
        </button>
      </form>
    </div>
  );
}

export function TeacherInbox() {
  const t = useT();
  const inbox = trpc.tafawoq.teacherInbox.useQuery(undefined, { refetchInterval: 60_000 });
  return (
    <>
      <h1>{t.inboxTitle}</h1>
      <p className="tfq-muted">{t.inboxIntro}</p>
      {inbox.data && !inbox.data.length && <div className="tfq-card tfq-empty">{t.inboxEmpty}</div>}
      {inbox.data?.map(exercise => <InboxItem key={exercise.id} exercise={exercise} />)}
    </>
  );
}
