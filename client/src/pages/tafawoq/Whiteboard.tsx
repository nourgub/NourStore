// The lesson whiteboard. Two separate parts:
// - the board itself: free drawing (pen, finger or mouse), eraser, text and
//   typed equations, axes and curves y = f(x); undo/redo; saved on the
//   device at once and on the server shortly after, so nothing is lost when
//   the connection drops. Free drawing is never "read": answers that are
//   graded go through the answer boxes.
// - the teacher's worked example (hand-written, reviewed content), written
//   step by step; the current step is highlighted and can be read aloud, the
//   next one appearing when the voice ends. «لم أفهم هذه الخطوة» asks the
//   tutor where that step comes from.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Pencil, Redo2, Trash2, Type, Undo2, Sigma, Volume2, VolumeX } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BOARD_COLORS, EMPTY_BOARD, type BoardState, type BoardStroke } from "@shared/boardState";
import { compileFunction, sampleCurve } from "@shared/plot";
import { Content, useT } from "./i18n";
import { canSpeak, speakArabic, unlockAudio } from "./speech";

type Tool = "pen" | "eraser" | "text" | "math";
type Saved = { state: BoardState; savedAt: number; synced: boolean };
type SaveStatus = "saved" | "saving" | "offline" | "error";

const RATIO = 3 / 4; // height / width
const RANGE = 6; // axes from -6 to 6
const HISTORY = 60;

const storageKey = (lessonKey: string) => `tfq-board:${lessonKey}`;

function readLocal(lessonKey: string): Saved | null {
  try {
    const raw = localStorage.getItem(storageKey(lessonKey));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeLocal(lessonKey: string, saved: Saved) {
  try {
    localStorage.setItem(storageKey(lessonKey), JSON.stringify(saved));
  } catch {
    // Storage full or blocked: the server copy still works.
  }
}

/** Board units (0..1) → axis units (-RANGE..RANGE), y up. */
const toAxis = (x: number, y: number) => [x * 2 * RANGE - RANGE, (1 - y) * 2 * RANGE * RATIO - RANGE * RATIO] as const;
const fromAxis = (ax: number, ay: number) => [(ax + RANGE) / (2 * RANGE), 1 - (ay + RANGE * RATIO) / (2 * RANGE * RATIO)] as const;

function draw(canvas: HTMLCanvasElement, state: BoardState, live: BoardStroke | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 600;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#16251e";
  ctx.fillRect(0, 0, w, h);

  if (state.axes) {
    ctx.save();
    ctx.strokeStyle = "rgba(245,241,230,0.12)";
    ctx.lineWidth = 1;
    for (let unit = -RANGE; unit <= RANGE; unit++) {
      const [gx] = fromAxis(unit, 0);
      ctx.beginPath();
      ctx.moveTo(gx * w, 0);
      ctx.lineTo(gx * w, h);
      ctx.stroke();
    }
    for (let unit = -Math.floor(RANGE * RATIO); unit <= RANGE * RATIO; unit++) {
      const [, gy] = fromAxis(0, unit);
      ctx.beginPath();
      ctx.moveTo(0, gy * h);
      ctx.lineTo(w, gy * h);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(245,241,230,0.7)";
    ctx.lineWidth = 1.5 * scale;
    const [ox, oy] = fromAxis(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, oy * h);
    ctx.lineTo(w, oy * h);
    ctx.moveTo(ox * w, 0);
    ctx.lineTo(ox * w, h);
    ctx.stroke();
    ctx.fillStyle = "rgba(245,241,230,0.8)";
    ctx.font = `${12 * scale}px sans-serif`;
    ctx.direction = "ltr";
    ctx.fillText("x", w - 14 * scale, oy * h - 6 * scale);
    ctx.fillText("y", ox * w + 6 * scale, 14 * scale);
    ctx.fillText("O", ox * w + 4 * scale, oy * h + 14 * scale);
    ctx.restore();
  }

  state.curves.forEach((expr, index) => {
    const fn = compileFunction(expr);
    if (!fn) return;
    ctx.save();
    ctx.strokeStyle = BOARD_COLORS[(index + 2) % BOARD_COLORS.length];
    ctx.lineWidth = 2.5 * scale;
    for (const piece of sampleCurve(fn, -RANGE, RANGE, RANGE * RATIO)) {
      ctx.beginPath();
      piece.forEach(([x, y], point) => {
        const [bx, by] = fromAxis(x, y);
        if (point === 0) ctx.moveTo(bx * w, by * h);
        else ctx.lineTo(bx * w, by * h);
      });
      ctx.stroke();
    }
    ctx.restore();
  });

  // Strokes on their own layer so the eraser removes ink, not the axes.
  const ink = document.createElement("canvas");
  ink.width = w;
  ink.height = h;
  const inkCtx = ink.getContext("2d")!;
  for (const stroke of live ? [...state.strokes, live] : state.strokes) {
    if (stroke.points.length < 2) continue;
    inkCtx.save();
    inkCtx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    inkCtx.strokeStyle = stroke.color;
    inkCtx.lineWidth = stroke.width * scale;
    inkCtx.lineCap = "round";
    inkCtx.lineJoin = "round";
    inkCtx.beginPath();
    inkCtx.moveTo(stroke.points[0] * w, stroke.points[1] * h);
    for (let index = 2; index < stroke.points.length; index += 2) inkCtx.lineTo(stroke.points[index] * w, stroke.points[index + 1] * h);
    if (stroke.points.length === 2) inkCtx.lineTo(stroke.points[0] * w + 0.1, stroke.points[1] * h);
    inkCtx.stroke();
    inkCtx.restore();
  }
  ctx.drawImage(ink, 0, 0);

  for (const text of state.texts) {
    ctx.save();
    ctx.fillStyle = text.color;
    ctx.font = `${(text.math ? 20 : 18) * scale}px ${text.math ? "serif" : "sans-serif"}`;
    // Equations read left to right; words follow their script.
    ctx.direction = text.math || !/[؀-ۿ]/.test(text.text) ? "ltr" : "rtl";
    ctx.textAlign = ctx.direction === "rtl" ? "right" : "left";
    ctx.fillText(text.text, text.x * w, text.y * h);
    ctx.restore();
  }
}

export function Whiteboard({ lessonKey }: { lessonKey: string }) {
  const t = useT();
  const s = t.board;
  const board = trpc.tafawoq.board.useQuery({ lessonKey }, { refetchOnWindowFocus: false });
  const save = trpc.tafawoq.saveBoard.useMutation();
  const ask = trpc.tafawoq.sendMessage.useMutation();

  const [state, setState] = useState<BoardState>(EMPTY_BOARD);
  const [past, setPast] = useState<BoardState[]>([]);
  const [future, setFuture] = useState<BoardState[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<(typeof BOARD_COLORS)[number]>(BOARD_COLORS[0]);
  const [width, setWidth] = useState(3);
  const [pendingText, setPendingText] = useState("");
  const [curve, setCurve] = useState("");
  const [curveError, setCurveError] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [loaded, setLoaded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [askedStep, setAskedStep] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const live = useRef<BoardStroke | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const stopVoice = useRef<() => void>(() => {});
  const latest = useRef(state);
  latest.current = state;

  // Load: the newer of this device's copy and the server's.
  useEffect(() => {
    if (!board.data || loaded) return;
    const local = readLocal(lessonKey);
    const serverAt = board.data.updatedAt ? new Date(board.data.updatedAt).getTime() : 0;
    const useLocal = local && (!local.synced || local.savedAt > serverAt) && local.savedAt >= serverAt;
    const initial = useLocal ? local!.state : board.data.state;
    setState(initial.example ? initial : { ...initial, example: board.data.focusSkill ? { skill: board.data.focusSkill, shown: 0 } : null });
    setLoaded(true);
    if (useLocal && !local!.synced) scheduleSave(local!.state, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data, loaded, lessonKey]);

  // Each change gets a revision; a save only reports "saved" if nothing changed since it was sent.
  const revision = useRef(0);
  const pushToServer = useCallback(
    (next: BoardState) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }
      const sent = revision.current;
      setStatus("saving");
      save.mutate(
        { lessonKey, state: next },
        {
          onSuccess: () => {
            if (revision.current === sent) {
              writeLocal(lessonKey, { state: next, savedAt: Date.now(), synced: true });
              setStatus("saved");
            }
          },
          onError: () => setStatus(navigator.onLine ? "error" : "offline"),
        }
      );
    },
    [lessonKey, save]
  );

  const scheduleSave = useCallback(
    (next: BoardState, delay = 1200) => {
      revision.current += 1;
      writeLocal(lessonKey, { state: next, savedAt: Date.now(), synced: false });
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => pushToServer(next), delay);
    },
    [lessonKey, pushToServer]
  );

  // Back online: send what was kept on the device.
  useEffect(() => {
    const online = () => {
      const local = readLocal(lessonKey);
      if (local && !local.synced) pushToServer(latest.current);
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [lessonKey, pushToServer]);

  useEffect(() => () => stopVoice.current(), []);

  const commit = useCallback(
    (next: BoardState) => {
      setPast(list => [...list.slice(-HISTORY + 1), latest.current]);
      setFuture([]);
      setState(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  // Canvas size follows the container (and the device pixel ratio).
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) draw(canvas, latest.current, live.current);
  }, []);
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const cssWidth = wrap.clientWidth;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssWidth * RATIO}px`;
      canvas.width = Math.round(cssWidth * ratio);
      canvas.height = Math.round(cssWidth * RATIO * ratio);
      redraw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [redraw, loaded]);
  useEffect(redraw, [state, redraw]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))] as const;
  };

  const onDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = point(event);
    if (tool === "text" || tool === "math") {
      if (!pendingText.trim()) return;
      commit({ ...state, texts: [...state.texts, { x, y, text: pendingText.trim().slice(0, 300), math: tool === "math", color }] });
      setPendingText("");
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    live.current = { tool, color, width: tool === "eraser" ? Math.max(14, width * 4) : width, points: [x, y] };
    redraw();
  };
  const onMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = live.current;
    if (!stroke || stroke.points.length >= 3998) return;
    const [x, y] = point(event);
    const lx = stroke.points[stroke.points.length - 2];
    const ly = stroke.points[stroke.points.length - 1];
    if (Math.hypot(x - lx, y - ly) < 0.002) return; // keep strokes small
    stroke.points.push(Number(x.toFixed(4)), Number(y.toFixed(4)));
    redraw();
  };
  const onUp = () => {
    const stroke = live.current;
    live.current = null;
    if (stroke && state.strokes.length < 1500) commit({ ...state, strokes: [...state.strokes, stroke] });
  };

  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setPast(list => list.slice(0, -1));
    setFuture(list => [state, ...list]);
    setState(previous);
    scheduleSave(previous);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture(list => list.slice(1));
    setPast(list => [...list, state]);
    setState(next);
    scheduleSave(next);
  };

  const examples = board.data?.examples ?? [];
  const example = useMemo(() => examples.find(entry => entry.skill === state.example?.skill) ?? examples[0], [examples, state.example?.skill]);
  const shown = Math.min(state.example?.shown ?? 0, example?.steps.length ?? 0);
  // From the latest board: also called from the voice callbacks, while the student keeps drawing.
  const setShown = (value: number) => example && commit({ ...latest.current, example: { skill: example.skill, shown: value } });

  const readAndContinue = () => {
    if (!example) return;
    if (speaking) {
      stopVoice.current();
      setSpeaking(false);
      return;
    }
    unlockAudio();
    // Each step appears as the teacher starts saying it; the next one when the voice ends.
    const sayFrom = (index: number) => {
      if (index >= example.steps.length) {
        setSpeaking(false);
        return;
      }
      setShown(index + 1);
      setSpeaking(true);
      stopVoice.current = speakArabic(example.steps[index], { onEnd: () => sayFrom(index + 1) });
    };
    sayFrom(shown >= example.steps.length ? 0 : shown);
  };

  const statusText = { saved: s.saved, saving: s.saving, offline: s.offline, error: s.saveError }[status];
  if (board.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (board.error)
    return (
      <div className="tfq-card" role="alert">
        <p>{t.trial.loadError.replace(/الدرس التجريبي|la leçon d'essai|the trial lesson/, s.label)}</p>
        <button type="button" className="tfq-btn small" onClick={() => void board.refetch()}>
          {t.trial.retry}
        </button>
      </div>
    );

  return (
    <div className="tfq-board-page">
      <section className="tfq-card tfq-board-steps" aria-labelledby="tfq-steps-title">
        <h3 id="tfq-steps-title">{s.teacherSteps}</h3>
        {examples.length > 1 && (
          <label className="tfq-field">
            {s.chooseSkill}
            <select className="tfq-input" value={example?.skill} onChange={event => commit({ ...state, example: { skill: event.target.value, shown: 0 } })}>
              {examples.map(entry => (
                <option key={entry.skill} value={entry.skill}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {example && (
          <Content>
            <p className="tfq-board-problem">{example.problem}</p>
            <ol className="tfq-board-steplist">
              {example.steps.slice(0, shown).map((step, index) => (
                <li key={step} className={index === shown - 1 ? "current" : ""} aria-current={index === shown - 1 ? "step" : undefined}>
                  <span>{step}</span>
                  <button
                    type="button"
                    className="tfq-link-btn"
                    onClick={() => {
                      setAskedStep(index);
                      ask.mutate({ lessonKey, message: s.lostAsk(index + 1, step) });
                    }}
                  >
                    {s.lost}
                  </button>
                  {askedStep === index && (ask.isPending ? <p className="tfq-muted">…</p> : ask.data && <p className="tfq-board-reply">{ask.data.reply}</p>)}
                </li>
              ))}
            </ol>
            {shown >= example.steps.length && (
              <p>
                <strong>{s.answer}:</strong> <bdi dir="auto">{example.answer}</bdi>
              </p>
            )}
          </Content>
        )}
        <div className="tfq-row">
          <span className="tfq-muted" aria-live="polite">
            {example ? s.stepOf(shown, example.steps.length) : ""}
          </span>
          <button type="button" className="tfq-btn small" disabled={!example || shown >= (example?.steps.length ?? 0) || speaking} onClick={() => setShown(shown + 1)}>
            {s.next}
          </button>
          {canSpeak() && (
            <button type="button" className="tfq-btn ghost small" onClick={readAndContinue} aria-pressed={speaking}>
              {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />} {speaking ? s.stop : s.readStep}
            </button>
          )}
          {shown > 0 && (
            <button type="button" className="tfq-btn ghost small" onClick={() => setShown(0)} disabled={speaking}>
              {s.restart}
            </button>
          )}
        </div>
      </section>

      <section className="tfq-card" aria-label={s.label}>
        <div className="tfq-board-tools" role="toolbar" aria-label={s.label}>
          {(
            [
              ["pen", Pencil, s.pen],
              ["eraser", Eraser, s.eraser],
              ["text", Type, s.text],
              ["math", Sigma, s.math],
            ] as const
          ).map(([key, Icon, label]) => (
            <button key={key} type="button" className={`tfq-btn small ${tool === key ? "" : "ghost"}`} aria-pressed={tool === key} onClick={() => setTool(key)}>
              <Icon size={15} /> <span className="tfq-btn-label">{label}</span>
            </button>
          ))}
          <span className="tfq-board-colors" role="radiogroup" aria-label={s.color}>
            {BOARD_COLORS.map(entry => (
              <button
                key={entry}
                type="button"
                role="radio"
                aria-checked={color === entry}
                aria-label={`${s.color} ${entry}`}
                className={`tfq-board-color ${color === entry ? "on" : ""}`}
                style={{ background: entry }}
                onClick={() => setColor(entry)}
              />
            ))}
          </span>
          <label className="tfq-board-width">
            <span className="tfq-sr-only">{s.width}</span>
            <input type="range" min={1} max={10} value={width} aria-label={s.width} onChange={event => setWidth(Number(event.target.value))} />
          </label>
          <button type="button" className="tfq-btn ghost small" onClick={undo} disabled={!past.length} aria-label={s.undo} title={s.undo}>
            <Undo2 size={15} />
          </button>
          <button type="button" className="tfq-btn ghost small" onClick={redo} disabled={!future.length} aria-label={s.redo} title={s.redo}>
            <Redo2 size={15} />
          </button>
          <button
            type="button"
            className="tfq-btn ghost small"
            aria-label={s.clear}
            title={s.clear}
            onClick={() => window.confirm(s.clearConfirm) && commit({ ...EMPTY_BOARD, example: state.example })}
          >
            <Trash2 size={15} />
          </button>
        </div>

        {(tool === "text" || tool === "math") && (
          <div className="tfq-board-textrow">
            <input
              className="tfq-input"
              dir={tool === "math" ? "ltr" : "auto"}
              maxLength={300}
              value={pendingText}
              placeholder={tool === "math" ? "f'(x) = 3x² − 2" : ""}
              aria-label={tool === "math" ? s.math : s.text}
              onChange={event => setPendingText(event.target.value)}
            />
            <span className="tfq-muted">{s.placeHint}</span>
          </div>
        )}

        <div ref={wrapRef} className="tfq-board-wrap" dir="ltr">
          <canvas
            ref={canvasRef}
            className="tfq-board-canvas"
            role="img"
            aria-label={s.label}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>

        <div className="tfq-board-tools">
          <label className="tfq-check">
            <input type="checkbox" checked={state.axes} onChange={event => commit({ ...state, axes: event.target.checked })} /> {s.axes}
          </label>
          <form
            className="tfq-board-curve"
            onSubmit={event => {
              event.preventDefault();
              if (!compileFunction(curve)) {
                setCurveError(true);
                return;
              }
              setCurveError(false);
              commit({ ...state, axes: true, curves: [...state.curves.slice(-5), curve.trim()] });
              setCurve("");
            }}
          >
            <label htmlFor="tfq-curve">{s.curve}</label>
            <input id="tfq-curve" className="tfq-input" dir="ltr" maxLength={80} value={curve} onChange={event => setCurve(event.target.value)} placeholder="x^2 - 2x" />
            <button type="submit" className="tfq-btn small" disabled={!curve.trim()}>
              {s.addCurve}
            </button>
          </form>
          {state.curves.length > 0 && (
            <span className="tfq-chips">
              {state.curves.map((entry, index) => (
                <button
                  key={`${entry}-${index}`}
                  type="button"
                  className="tfq-chip"
                  dir="ltr"
                  aria-label={`${s.undo}: y = ${entry}`}
                  onClick={() => commit({ ...state, curves: state.curves.filter((_, other) => other !== index) })}
                >
                  y = {entry} ✕
                </button>
              ))}
            </span>
          )}
        </div>
        {curveError && (
          <p className="tfq-error" role="alert">
            {s.badCurve}
          </p>
        )}
        <p className={status === "saved" ? "tfq-muted" : status === "saving" ? "tfq-muted" : "tfq-error"} role="status">
          {statusText}
        </p>
        <p className="tfq-muted" style={{ fontSize: 13 }}>
          {s.notRead}
        </p>
      </section>
    </div>
  );
}
