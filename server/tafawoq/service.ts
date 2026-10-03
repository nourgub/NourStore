// Tafawoq AI Teacher — orchestration of the full loop:
//
//   Student profile → placement (level assessment) → weakness detection →
//   personal learning plan → personal lesson → video script → practice
//   generation → automatic correction → knowledge-tracing update → progress
//
// Each generator tries Claude first (when configured) and falls back to the
// curated templates on any failure or invalid output, reporting which one
// produced the content (`source`) so the UI never misrepresents it.
import { TRPCError } from "@trpc/server";
import type {
  ContentSource,
  PersonalLesson,
  BacStream,
  PublicQuestion,
  SchoolLevel,
  VideoScript,
} from "@shared/tafawoq";
import * as store from "../db/tafawoq";
import { createParentInvite, getParentLinks } from "../db/parent";
import {
  LESSONS,
  SUBJECTS,
  getLesson,
  selectPlacementQuestions,
  type BankQuestion,
  type Lesson,
} from "./curriculum";
import { buildStudentContext, type StudentContext } from "./context";
import { createRng, randomSeed } from "./generators/core";
import { instantiate } from "./generators/instantiate";
import { OPTION_LETTERS, pickOption, spokenToAnswer } from "./spokenAnswer";
import { answersMatch, gradeDeterministic } from "./grading";
import { parseExpression } from "./mathExpr";
import * as ai from "./ai";
import {
  applyObservations,
  MASTERED,
  isLessonComplete,
  observedErrors,
  overallMastery,
  skillName,
  targetDifficulty,
  tierFor,
  type Observation,
} from "./studentModel";
import {
  buildExercisePlan,
  callIntroText,
  callSummaryText,
  detectIntent,
  templateExercises,
  templateLesson,
  templateOpening,
  templateTutorReply,
  templateVideoScript,
} from "./templates";

type StoredItem = BankQuestion;

function logAiFailure(what: string, error: unknown) {
  console.warn(`[tafawoq] ${what} fell back to template:`, error instanceof Error ? error.message : error);
}

function lessonOrThrow(lessonKey: string): Lesson {
  const lesson = getLesson(lessonKey);
  if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  return lesson;
}

async function studentOrThrow(userId: number) {
  const student = await store.getTafawoqStudentByUser(userId);
  if (!student) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Register your profile first" });
  }
  return student;
}

/** Stored states, returned in the lesson's own skill order (or [] if never placed). */
async function orderedSkillStates(studentId: number, lesson: Lesson) {
  const stored = await store.getSkillStates(studentId, lesson.key);
  return stored.length ? applyObservations(lesson, stored, [], { learning: false }) : [];
}

async function loadContext(
  student: Awaited<ReturnType<typeof studentOrThrow>>,
  lesson: Lesson
): Promise<StudentContext> {
  const states = await orderedSkillStates(student.id, lesson);
  if (!states.length) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Take the placement test first" });
  }
  const attempts = await store.getAttempts(student.id, lesson.key);
  return buildStudentContext({ student, lesson, states, attempts });
}

function toPublicQuestion(item: StoredItem): PublicQuestion {
  return {
    id: item.id,
    skill: item.skill,
    difficulty: item.difficulty,
    type: item.type,
    prompt: item.prompt,
    options: item.type === "mcq" ? item.options : undefined,
  };
}

// ---------------------------------------------------------------------------
// Catalog & profile
// ---------------------------------------------------------------------------

export function catalog() {
  return {
    aiConfigured: ai.isAiConfigured(),
    subjects: Object.entries(SUBJECTS).map(([key, subject]) => ({ key, name: subject.name })),
    lessons: LESSONS.map(lesson => ({
      key: lesson.key,
      subject: lesson.subject,
      title: lesson.title,
      levels: lesson.levels,
      streams: lesson.streams ?? null,
      skills: lesson.skills.map(skill => ({ key: skill.key, name: skill.name })),
    })),
  };
}

export async function overview(userId: number) {
  const student = await store.getTafawoqStudentByUser(userId);
  if (!student) return { student: null, lessons: [] };
  const allStates = await store.getAllSkillStates(student.id);
  const lessons = LESSONS.map(lesson => {
    const states = allStates
      .filter(row => row.lessonKey === lesson.key)
      .map(row => ({ skill: row.skillKey, pKnown: row.pKnown, attempts: row.attempts, correct: row.correct }));
    const mastery = overallMastery(states);
    return {
      key: lesson.key,
      placed: states.length > 0,
      mastery: states.length ? mastery : null,
      tier: states.length ? tierFor(mastery) : null,
      complete: isLessonComplete(states),
    };
  }).filter(entry => entry.placed);
  return { student, lessons };
}

export async function register(
  userId: number,
  input: { displayName: string; age: number; schoolLevel: SchoolLevel; stream?: BacStream | null; goals?: string }
) {
  return store.upsertTafawoqStudent({
    userId,
    displayName: input.displayName.trim(),
    age: input.age,
    schoolLevel: input.schoolLevel,
    stream: input.schoolLevel === "bac" ? input.stream ?? null : null,
    goals: input.goals?.trim() || null,
  });
}

// ---------------------------------------------------------------------------
// Assessments: placement + practice, and automatic correction
// ---------------------------------------------------------------------------

export async function startPlacement(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const open = await store.getOpenAssessment(student.id, lesson.key, "placement");
  const items: StoredItem[] = open
    ? JSON.parse(open.itemsJson)
    : selectPlacementQuestions(lesson, 10, randomSeed());
  const assessmentId =
    open?.id ??
    (await store.createAssessment({
      studentId: student.id,
      lessonKey: lesson.key,
      kind: "placement",
      itemsJson: JSON.stringify(items),
      source: "bank",
    }));
  return { assessmentId, questions: items.map(toPublicQuestion) };
}

export async function generatePractice(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const context = await loadContext(student, lesson);
  const plan = buildExercisePlan(context, 5);
  // Avoid repeating bank items the student has already answered.
  const seenIds = new Set(await store.getAttemptedQuestionIds(student.id, lesson.key));
  const fallback = templateExercises(
    lesson,
    plan,
    seenIds,
    [...context.skills]
      .filter(skill => skill.mastery < MASTERED)
      .sort((a, b) => a.mastery - b.mastery)
      .map(skill => skill.key)
  );

  let items: StoredItem[] = fallback;
  let source: ContentSource = "template";
  if (ai.isAiConfigured()) {
    try {
      const generated = await ai.generateExercises(
        context,
        plan,
        Object.keys(lesson.misconceptions)
      );
      const skillKeys = new Set(lesson.skills.map(skill => skill.key));
      const valid = generated.filter(
        item =>
          item.prompt.trim() &&
          item.answer.trim() &&
          skillKeys.has(item.skill) &&
          (item.type === "short" ||
            (item.options?.length === 4 && item.options.includes(item.answer)))
      );
      if (valid.length >= Math.ceil(plan.length / 2)) {
        items = [
          ...valid
            .slice(0, plan.length)
            .map((item, index): StoredItem => ({ ...item, id: `ai-${index + 1}` })),
          ...fallback.slice(valid.length),
        ];
        source = "ai";
      }
    } catch (error) {
      logAiFailure("exercise generation", error);
    }
  }
  const assessmentId = await store.createAssessment({
    studentId: student.id,
    lessonKey: lesson.key,
    kind: "practice",
    itemsJson: JSON.stringify(items),
    source,
  });
  return { assessmentId, source, questions: items.map(toPublicQuestion) };
}

export type SubmittedAnswer = { questionId: string; answer: string; responseMs?: number };

export async function submitAssessment(
  userId: number,
  assessmentId: number,
  answers: SubmittedAnswer[]
) {
  const student = await studentOrThrow(userId);
  const assessment = await store.getAssessment(assessmentId);
  // Same NOT_FOUND for "doesn't exist" and "belongs to someone else".
  if (!assessment || assessment.studentId !== student.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
  }
  if (assessment.status !== "open") {
    throw new TRPCError({ code: "CONFLICT", message: "Assessment already graded" });
  }
  const lesson = lessonOrThrow(assessment.lessonKey);
  const items: StoredItem[] = JSON.parse(assessment.itemsJson);
  const byId = new Map(answers.map(answer => [answer.questionId, answer]));
  const misconceptionKeys = Object.keys(lesson.misconceptions);

  const graded = await Promise.all(
    items.map(async item => {
      const submitted = byId.get(item.id);
      const given = submitted?.answer ?? "";
      const deterministic = gradeDeterministic(item, given);
      let correct = deterministic.status === "correct";
      let misconception = deterministic.status === "incorrect" ? deterministic.misconception : null;
      let feedback: string | null = null;
      if (deterministic.status === "unmatched" && ai.isAiConfigured()) {
        try {
          const verdict = await ai.gradeShortAnswer({
            prompt: item.prompt,
            expected: item.answer,
            given,
            misconceptionKeys,
          });
          correct = verdict.correct;
          feedback = verdict.feedback;
          misconception = verdict.correct ? null : verdict.misconception ?? null;
        } catch (error) {
          logAiFailure("short-answer grading", error);
        }
      }
      const responseMs =
        submitted?.responseMs !== undefined
          ? Math.round(Math.min(30 * 60_000, Math.max(0, submitted.responseMs)))
          : null;
      return { item, given, correct, misconception, feedback, responseMs };
    })
  );

  const previousStates = await orderedSkillStates(student.id, lesson);
  const observations: Observation[] = graded.map(entry => ({
    skill: entry.item.skill,
    correct: entry.correct,
    difficulty: entry.item.difficulty,
    type: entry.item.type,
    optionsCount: entry.item.options?.length,
  }));
  const nextStates = applyObservations(lesson, previousStates, observations, {
    learning: assessment.kind !== "placement",
  });
  const before = previousStates.length ? previousStates : null;
  const masteryBefore = before ? overallMastery(before) : 0;
  const masteryAfter = overallMastery(nextStates);
  const correctCount = graded.filter(entry => entry.correct).length;
  const score = items.length ? Math.round((correctCount / items.length) * 100) : 0;

  const itemResults = graded.map(entry => ({
    questionId: entry.item.id,
    skill: entry.item.skill,
    skillName: skillName(lesson, entry.item.skill),
    prompt: entry.item.prompt,
    given: entry.given,
    correct: entry.correct,
    correctAnswer: entry.item.answer,
    explanation: entry.item.explanation,
    feedback: entry.feedback,
    misconception: entry.misconception
      ? lesson.misconceptions[entry.misconception] ?? entry.misconception
      : null,
  }));

  const claimed = await store.markAssessmentGraded({
    assessmentId,
    score,
    resultJson: JSON.stringify(itemResults),
    masteryBefore,
    masteryAfter,
  });
  if (!claimed) {
    throw new TRPCError({ code: "CONFLICT", message: "Assessment already graded" });
  }
  await store.saveSkillStates(student.id, lesson.key, nextStates);
  await store.recordAttempts(
    graded.map(entry => ({
      studentId: student.id,
      assessmentId,
      lessonKey: lesson.key,
      skillKey: entry.item.skill,
      questionId: entry.item.id,
      difficulty: entry.item.difficulty,
      correct: entry.correct,
      misconception: entry.misconception,
      responseMs: entry.responseMs,
    }))
  );

  const context = await loadContext(student, lesson);
  const skillChanges = nextStates.map(state => ({
    skill: state.skill,
    name: skillName(lesson, state.skill),
    before: before?.find(entry => entry.skill === state.skill)?.pKnown ?? null,
    after: state.pKnown,
  }));

  if (assessment.kind === "practice") {
    const delta = Math.round((masteryAfter - masteryBefore) * 100);
    await store.addMessage({
      studentId: student.id,
      lessonKey: lesson.key,
      role: "tutor",
      source: "template",
      content: `صححت تمارينك يا ${student.displayName}: ${correctCount} من ${items.length} صحيحة. ${
        delta > 0
          ? `ارتفع إتقانك للدرس من ${Math.round(masteryBefore * 100)}% إلى ${Math.round(masteryAfter * 100)}% 🎉`
          : delta < 0
            ? `انخفض تقدير إتقانك قليلاً إلى ${Math.round(masteryAfter * 100)}%، وهذا طبيعي — سنراجع معاً النقاط التي أخطأت فيها.`
            : `إتقانك ثابت عند ${Math.round(masteryAfter * 100)}%.`
      }${context.focusSkills[0] ? ` الخطوة التالية: ${context.focusSkills[0].name}.` : ""}`,
    });
  }

  return {
    kind: assessment.kind,
    score,
    correct: correctCount,
    total: items.length,
    items: itemResults,
    masteryBefore,
    masteryAfter,
    tierBefore: before ? tierFor(masteryBefore) : null,
    tierAfter: tierFor(masteryAfter),
    skillChanges,
    errorsThisTime: observedErrors(
      lesson,
      graded.map(entry => ({
        correct: entry.correct,
        difficulty: entry.item.difficulty,
        responseMs: entry.responseMs,
        misconception: entry.misconception,
      }))
    ),
    analysis: context,
  };
}

// ---------------------------------------------------------------------------
// Workspace, lesson, video, tutor
// ---------------------------------------------------------------------------

export async function workspace(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const states = await store.getSkillStates(student.id, lesson.key);
  if (!states.length) {
    return { placed: false as const, lessonTitle: lesson.title };
  }
  const context = await loadContext(student, lesson);
  const [latestLesson, videos, messages, history, openPractice] = await Promise.all([
    store.getLatestLesson(student.id, lesson.key),
    store.listVideos(student.id, lesson.key),
    store.listMessages(student.id, lesson.key),
    store.listGradedAssessments(student.id, lesson.key),
    store.getOpenAssessment(student.id, lesson.key, "practice"),
  ]);
  return {
    placed: true as const,
    lessonTitle: lesson.title,
    analysis: context,
    complete: isLessonComplete(states),
    aiConfigured: ai.isAiConfigured(),
    personalLesson: latestLesson
      ? {
          id: latestLesson.id,
          tier: latestLesson.tier,
          source: latestLesson.source,
          createdAt: latestLesson.createdAt,
          content: JSON.parse(latestLesson.contentJson) as PersonalLesson,
        }
      : null,
    videos: videos.map(video => ({
      id: video.id,
      source: video.source,
      createdAt: video.createdAt,
      script: JSON.parse(video.scriptJson) as VideoScript,
    })),
    messages: messages.map(message => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    history,
    openPractice: openPractice
      ? {
          assessmentId: openPractice.id,
          source: openPractice.source,
          questions: (JSON.parse(openPractice.itemsJson) as StoredItem[]).map(toPublicQuestion),
        }
      : null,
  };
}

async function buildPersonalLesson(context: StudentContext, lesson: Lesson) {
  if (ai.isAiConfigured()) {
    try {
      const content = await ai.generateLesson(context);
      if (content.sections.length && content.sections.every(section => section.explanation.trim())) {
        return { content, source: "ai" as const };
      }
    } catch (error) {
      logAiFailure("lesson generation", error);
    }
  }
  return { content: templateLesson(lesson, context), source: "template" as const };
}

export async function generateLesson(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const context = await loadContext(student, lesson);
  const { content, source } = await buildPersonalLesson(context, lesson);
  const id = await store.saveLesson({
    studentId: student.id,
    lessonKey: lesson.key,
    tier: context.tier,
    contentJson: JSON.stringify(content),
    source,
  });
  return { id, tier: context.tier, source, content };
}

export async function generateVideo(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const context = await loadContext(student, lesson);
  // The video narrates the student's current personal lesson; make one
  // first if they haven't generated it yet (or it predates a tier change).
  let latest = await store.getLatestLesson(student.id, lesson.key);
  if (!latest || latest.tier !== context.tier) {
    await generateLesson(userId, lessonKey);
    latest = await store.getLatestLesson(student.id, lesson.key);
  }
  const personal = JSON.parse(latest!.contentJson) as PersonalLesson;

  let script: VideoScript = templateVideoScript(context, personal);
  let source: ContentSource = "template";
  if (ai.isAiConfigured()) {
    try {
      const generated = await ai.generateVideoScript(context, personal);
      if (generated.scenes.length >= 3 && generated.scenes.every(scene => scene.narration.trim())) {
        script = generated;
        source = "ai";
      }
    } catch (error) {
      logAiFailure("video script generation", error);
    }
  }
  const id = await store.saveVideo({
    studentId: student.id,
    lessonKey: lesson.key,
    personalLessonId: latest!.id,
    scriptJson: JSON.stringify(script),
    source,
  });
  return { id, source, script };
}

async function tutorText(
  context: StudentContext,
  lesson: Lesson,
  history: ai.TutorTurn[],
  message: string | null
): Promise<{ text: string; source: ContentSource }> {
  if (ai.isAiConfigured()) {
    try {
      return { text: await ai.tutorReply(context, history, message), source: "ai" };
    } catch (error) {
      logAiFailure("tutor reply", error);
    }
  }
  return {
    text: message === null ? templateOpening(context) : templateTutorReply(lesson, context, message),
    source: "template",
  };
}

/** Opens the tutoring session with an analysis-based greeting, once. */
export async function startTutor(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const existing = await store.listMessages(student.id, lesson.key);
  if (existing.length) return { started: false };
  const context = await loadContext(student, lesson);
  const { text, source } = await tutorText(context, lesson, [], null);
  await store.addMessage({ studentId: student.id, lessonKey: lesson.key, role: "tutor", content: text, source });
  return { started: true };
}

// ---------------------------------------------------------------------------
// Oral quiz: "اختبرني" → the tutor asks one generated question in the
// conversation; the student's next message (typed or spoken) is graded as
// the answer, through submitAssessment, so it updates mastery like any
// exercise. Free: deterministic generators + equivalence grading.
// ---------------------------------------------------------------------------

const ORAL_WINDOW_MS = 30 * 60 * 1000;

function pickOralItem(lesson: Lesson, context: StudentContext): StoredItem {
  const focus =
    context.focusSkills[0] ?? [...context.skills].sort((a, b) => a.mastery - b.mastery)[0];
  const target = targetDifficulty(focus?.mastery ?? 0.3);
  const rng = createRng(randomSeed());
  const generators = (lesson.generators ?? []).filter(generator => generator.skill === focus?.key);
  if (generators.length) {
    // Prefer typed answers — easiest to say aloud — at the right difficulty.
    const score = (generator: (typeof generators)[number]) =>
      Math.abs(generator.difficulty - target) * 2 + (generator.generate(createRng(1)).type === "short" ? 0 : 1);
    const best = Math.min(...generators.map(score));
    return instantiate(rng.pick(generators.filter(generator => score(generator) === best)), rng.int(1, 2 ** 30));
  }
  const bank = lesson.bank.filter(question => question.skill === focus?.key);
  const pool = bank.length ? bank : lesson.bank;
  return [...pool].sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target))[0];
}

function oralQuestionText(item: StoredItem): string {
  const options =
    item.type === "mcq" && item.options
      ? "\n" + item.options.map((option, index) => `${OPTION_LETTERS[index]}: ${option}`).join("\n") + "\nقل حرف الجواب (أ، ب، ج أو د)."
      : "\nقل جوابك أو اكتبه.";
  return `سؤال: ${item.prompt}${options}`;
}

async function oralTurn(
  userId: number,
  student: Awaited<ReturnType<typeof studentOrThrow>>,
  lesson: Lesson,
  context: StudentContext,
  message: string
): Promise<string | null> {
  const intent = detectIntent(message);
  const open = await store.getOpenAssessment(student.id, lesson.key, "oral");
  const pending = open && Date.now() - open.createdAt.getTime() < ORAL_WINDOW_MS ? open : undefined;

  if (intent === "quiz") {
    const item = pickOralItem(lesson, context);
    await store.createAssessment({
      studentId: student.id,
      lessonKey: lesson.key,
      kind: "oral",
      itemsJson: JSON.stringify([item]),
      source: item.id.startsWith("g-") ? "template" : "bank",
    });
    return oralQuestionText(item);
  }
  // Any other request ("مثال", "لماذا"…) is answered normally; the pending
  // question stays open for a while.
  if (!pending || (intent !== "explain" && intent !== "giveUp")) return null;

  const [item] = JSON.parse(pending.itemsJson) as StoredItem[];
  // A question about the lesson ("اشرح لي…") is not an answer: only treat
  // the message as one when it reads as a choice or as math.
  if (intent !== "giveUp") {
    const choice = item.type === "mcq" && item.options ? pickOption(message, item.options) : null;
    const asMath = spokenToAnswer(message);
    const looksLikeAnswer =
      choice !== null ||
      (message.length <= 60 && parseExpression(asMath) !== null) ||
      (item.options ?? []).some(option => answersMatch(option, asMath));
    if (!looksLikeAnswer) return null;
  }
  const given =
    intent === "giveUp"
      ? ""
      : item.type === "mcq" && item.options
        ? pickOption(message, item.options) ?? spokenToAnswer(message)
        : spokenToAnswer(message);
  const result = await submitAssessment(userId, pending.id, [{ questionId: item.id, answer: given }]);
  const graded = result.items[0];
  const change = result.skillChanges.find(entry => entry.skill === item.skill);
  const progress =
    change && change.before !== null
      ? ` (${skillName(lesson, item.skill)}: ${Math.round(change.before * 100)}% ← ${Math.round(change.after * 100)}%)`
      : "";
  if (graded.correct) {
    return `✔ صحيح، أحسنت يا ${student.displayName}! الجواب: ${graded.correctAnswer}.${progress}\nقل «اختبرني» لسؤال آخر.`;
  }
  const misconceptionKey = Object.entries(lesson.misconceptions).find(([, label]) => label === graded.misconception)?.[0];
  const remedy = misconceptionKey ? lesson.remedies?.[misconceptionKey] : undefined;
  return [
    intent === "giveUp" ? `لا بأس. الجواب الصحيح: ${graded.correctAnswer}.` : `ليس تماماً. الجواب الصحيح: ${graded.correctAnswer}.`,
    graded.misconception ? `الخطأ: ${graded.misconception}.` : null,
    remedy ? `✅ ${remedy}` : null,
    `الحل:\n${graded.explanation}`,
    "قل «اختبرني» لسؤال آخر.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Phone-call lesson: the client drives the call (intro → oral questions via
// sendMessage → summary); these two give it what the teacher says.
// ---------------------------------------------------------------------------

export async function callIntro(userId: number, lessonKey: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const context = await loadContext(student, lesson);
  const text = callIntroText(lesson, context);
  await store.addMessage({ studentId: student.id, lessonKey: lesson.key, role: "tutor", content: text, source: "template" });
  // Questions asked during the call are the assessments created after this
  // id (ids, not timestamps: those only have one-second precision).
  return { text, afterId: await store.lastAssessmentId(student.id) };
}

export async function callSummary(userId: number, lessonKey: string, afterId: number) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const oral = (await store.listGradedAssessments(student.id, lesson.key)).filter(
    entry => entry.kind === "oral" && entry.id > afterId
  );
  const context = await loadContext(student, lesson);
  const focus = context.focusSkills[0] ?? null;
  const correct = oral.filter(entry => (entry.score ?? 0) === 100).length;
  const text = callSummaryText({
    name: student.displayName,
    correct,
    total: oral.length,
    skillName: focus?.name ?? null,
    before: oral[0]?.masteryBefore ?? null,
    after: oral.at(-1)?.masteryAfter ?? null,
    nextSkillName: context.focusSkills[1]?.name ?? null,
  });
  await store.addMessage({ studentId: student.id, lessonKey: lesson.key, role: "tutor", content: text, source: "template" });
  return {
    text,
    correct,
    total: oral.length,
    masteryBefore: oral[0]?.masteryBefore ?? context.mastery,
    masteryAfter: context.mastery,
  };
}

export async function sendTutorMessage(userId: number, lessonKey: string, message: string) {
  const student = await studentOrThrow(userId);
  const lesson = lessonOrThrow(lessonKey);
  const context = await loadContext(student, lesson);
  const history = (await store.listMessages(student.id, lesson.key))
    .slice(-20)
    .map(entry => ({ role: entry.role, content: entry.content }));
  await store.addMessage({
    studentId: student.id,
    lessonKey: lesson.key,
    role: "student",
    content: message,
    source: null,
  });
  const oral = await oralTurn(userId, student, lesson, context, message);
  if (oral !== null) {
    await store.addMessage({ studentId: student.id, lessonKey: lesson.key, role: "tutor", content: oral, source: "template" });
    return { reply: oral, source: "template" as ContentSource };
  }
  const { text, source } = await tutorText(context, lesson, history, message);
  await store.addMessage({ studentId: student.id, lessonKey: lesson.key, role: "tutor", content: text, source });
  return { reply: text, source };
}

// ---------------------------------------------------------------------------
// Parents: a student shares a one-time code; a parent who redeems it (the
// platform's existing parent-link flow) sees this report for that child.
// ---------------------------------------------------------------------------

export async function createParentCode(userId: number) {
  const invite = await createParentInvite(userId);
  if (!invite) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database not configured" });
  return invite;
}

export type ParentAdvice =
  | { kind: "inactive"; days: number | null }
  | { kind: "focus"; lessonTitle: string; skillName: string }
  | { kind: "recurring"; lessonTitle: string; errorLabel: string }
  | { kind: "progress"; lessonTitle: string; from: number; to: number }
  | { kind: "complete"; lessonTitle: string };

const DAY = 24 * 60 * 60 * 1000;

/**
 * The parent's view of each linked child: per lesson the level, mastery
 * trend, strengths, weaknesses and recurring errors; this week's effort
 * (questions answered, accuracy, minutes); and concrete advice items. The
 * advice is returned as structured codes so the parent's own interface
 * language renders it.
 */
export async function parentReport(parentUserId: number) {
  const links = (await getParentLinks(parentUserId)).filter(link => link.status === "active");
  const weekAgo = new Date(Date.now() - 7 * DAY);
  return Promise.all(
    links.map(async link => {
      const student = await store.getTafawoqStudentByUser(link.childId);
      if (!student) {
        return { linkId: link.id, childName: link.childName, profile: null, lessons: [], week: null, lastActivityAt: null, advice: [] as ParentAdvice[] };
      }
      const allStates = await store.getAllSkillStates(student.id);
      const lessonKeys = Array.from(new Set(allStates.map(row => row.lessonKey)));
      const lessons = (
        await Promise.all(
          lessonKeys.map(async key => {
            const lesson = getLesson(key);
            if (!lesson) return null;
            const context = await loadContext(student, lesson);
            const history = await store.listGradedAssessments(student.id, lesson.key);
            return {
              key: lesson.key,
              title: lesson.title,
              mastery: context.mastery,
              tier: context.tier,
              complete: isLessonComplete(
                allStates
                  .filter(row => row.lessonKey === key)
                  .map(row => ({ skill: row.skillKey, pKnown: row.pKnown, attempts: row.attempts, correct: row.correct }))
              ),
              startMastery: history[0]?.masteryAfter ?? context.mastery,
              sessions: history.length,
              strengths: context.strengths.map(skill => skill.name),
              weaknesses: context.weaknesses.map(skill => skill.name),
              recurringErrors: context.recurringErrors.map(error => ({ label: error.label, count: error.count })),
              focus: context.focusSkills.map(skill => skill.name),
              learningSpeed: context.learningSpeed,
            };
          })
        )
      ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const activity = await store.getActivitySince(student.id, weekAgo);
      const lastActivityAt = await store.getLastActivity(student.id);
      const week = {
        answered: activity.length,
        accuracy: activity.length ? activity.filter(row => row.correct === 1).length / activity.length : null,
        minutes: Math.ceil(activity.reduce((sum, row) => sum + (row.responseMs ?? 0), 0) / 60_000),
        activeDays: new Set(activity.map(row => row.createdAt.toISOString().slice(0, 10))).size,
      };

      const advice: ParentAdvice[] = [];
      if (!activity.length) {
        advice.push({
          kind: "inactive",
          days: lastActivityAt ? Math.floor((Date.now() - lastActivityAt.getTime()) / DAY) : null,
        });
      }
      for (const lesson of lessons) {
        if (lesson.complete) {
          advice.push({ kind: "complete", lessonTitle: lesson.title });
          continue;
        }
        if (lesson.mastery - lesson.startMastery >= 0.05) {
          advice.push({ kind: "progress", lessonTitle: lesson.title, from: lesson.startMastery, to: lesson.mastery });
        }
        if (lesson.recurringErrors[0]) {
          advice.push({ kind: "recurring", lessonTitle: lesson.title, errorLabel: lesson.recurringErrors[0].label });
        }
        if (lesson.focus[0]) {
          advice.push({ kind: "focus", lessonTitle: lesson.title, skillName: lesson.focus[0] });
        }
      }
      return {
        linkId: link.id,
        childName: link.childName,
        profile: {
          displayName: student.displayName,
          age: student.age,
          schoolLevel: student.schoolLevel,
          stream: student.stream,
        },
        lessons,
        week,
        lastActivityAt,
        advice,
      };
    })
  );
}
