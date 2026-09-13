import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { teacherProcedure, rateLimit } from "../_core/procedures";
import { createMeetEvent } from "../_core/googleCalendar";
import { isGoogleConfigured } from "../_core/googleAuth";
import {
  claudeModel,
  isClaudeConfigured,
  type ClaudeTextResult,
} from "../claudeClient";
import { generateMathLessonPlan } from "../lessonPlanner";
import { designMathExam } from "../examDesigner";
import { solveMathExam } from "../examSolutions";
import { gradeStudentPaper, PROVISIONAL_GRADING_NOTICE } from "../paperGrader";
import {
  extractAttachment,
  type AttachmentInput,
  type ExtractedAttachment,
} from "../attachments/extract";
import { referencesToAttachments } from "../attachments/references";
import { storagePut } from "../storage";
import {
  formatSolutionsForExport,
  examSolutionsSchema,
} from "../examSolutions";
import {
  EXPORT_CONTENT_TYPES,
  safeFileName,
  toDocx,
  toMarksXlsx,
  toPdf,
  type ExportFormat,
} from "../exports/documentExport";
import {
  countReferences,
  deleteReference,
  getActiveReferences,
  listReferences,
  saveReference,
  updateReference,
  MAX_REFERENCES_PER_TEACHER,
  type AssistantModule,
  deleteExamPaper,
  deleteExamSolutionSet,
  deleteLessonPlan,
  deletePaperGrade,
  getExamPaper,
  getExamSolutionSet,
  getLessonPlan,
  getPaperGrade,
  listExamPapers,
  listExamSolutionSets,
  listLessonPlans,
  listPaperGrades,
  markPaperGradeReviewed,
  savePaperGrade,
  saveExamPaper,
  saveExamSolutionSet,
  saveLessonPlan,
  teacherOwnsLearner,
} from "../db";
import {
  getCoursesForRole,
  getManagedLearnerCount,
  getStudentsForTeacher,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  setLessonLiveSession,
  createLearnerReport,
} from "../db";

// ---------------------------------------------------------------------------
// Uploaded files
// ---------------------------------------------------------------------------

/**
 * One uploaded file. The real checks (size against the decoded bytes,
 * extension/MIME agreement, blocked executables, magic bytes) run inside
 * extractAttachment via the same server-side validator the lesson-asset
 * uploads use — this schema only bounds what is worth parsing at all.
 */
const uploadedFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(150),
  // ~15 MB of bytes is ~20 MB of base64.
  dataBase64: z.string().min(4).max(21_000_000),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(15 * 1024 * 1024),
});

/** At most ten files per request; a .zip inside one of them fans out further. */
const filesSchema = z.array(uploadedFileSchema).max(10).optional();

/**
 * Papers graded per batch request, and how many run at once. Each paper is a
 * separate Claude call: too many and the request outlives its HTTP timeout,
 * too many at once and the API rate-limits the teacher mid-class.
 */
const MAX_BATCH_PAPERS = 8;
const BATCH_CONCURRENCY = 4;

export type SkippedFile = { name: string; reason: string };

/**
 * Extracts every uploaded file and splits the result: what Claude can
 * actually read, and what was refused. The refused ones are returned to the
 * teacher with the reason — never dropped silently, because "I uploaded the
 * paper and it graded something else" is the worst possible failure here.
 */
async function readAttachments(
  files: AttachmentInput[] | undefined
): Promise<{ usable: ExtractedAttachment[]; skipped: SkippedFile[] }> {
  if (!files?.length) return { usable: [], skipped: [] };
  const extracted = (await Promise.all(files.map(extractAttachment))).flat();
  const usable: ExtractedAttachment[] = [];
  const skipped: SkippedFile[] = [];
  for (const attachment of extracted) {
    if (attachment.kind === "unsupported")
      skipped.push({ name: attachment.name, reason: attachment.reason });
    else usable.push(attachment);
  }
  return { usable, skipped };
}

/**
 * Everything one generation should read: the files uploaded with THIS
 * request, plus the teacher's active reference library for this module. The
 * references go first, because they are the standing context (the syllabus)
 * and the per-request files are the specific thing being worked on.
 */
async function attachmentsFor(
  teacherId: number,
  module: AssistantModule,
  files: AttachmentInput[] | undefined
): Promise<{ attachments: ExtractedAttachment[]; skipped: SkippedFile[] }> {
  const [{ usable, skipped }, references] = await Promise.all([
    readAttachments(files),
    getActiveReferences(teacherId, module),
  ]);
  const { attachments: referenceAttachments, notices } =
    await referencesToAttachments(references);
  return {
    attachments: [...referenceAttachments, ...usable],
    skipped: [...notices, ...skipped],
  };
}

/** Runs `work` over `items` a few at a time — a whole archive at once would hammer the API. */
async function inBatches<T, R>(
  items: T[],
  size: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    results.push(
      ...(await Promise.all(items.slice(index, index + size).map(work)))
    );
  }
  return results;
}

export const teacherRouter = router({
  courses: teacherProcedure.query(({ ctx }) =>
    getCoursesForRole(ctx.user.role, ctx.user.id)
  ),
  learnerCount: teacherProcedure.query(({ ctx }) =>
    getManagedLearnerCount(ctx.user.role, ctx.user.id)
  ),
  myStudents: teacherProcedure.query(({ ctx }) =>
    getStudentsForTeacher(
      ctx.user.id,
      ctx.user.role as "teacher" | "institution" | "admin"
    )
  ),
  googleCalendarStatus: teacherProcedure.query(async ({ ctx }) => ({
    ...(await getGoogleCalendarStatus(ctx.user.id)),
    // Lets the "Connect Google Calendar" button hide itself instead of
    // linking into /api/google-calendar/connect's 501 "not configured"
    // page on a deployment with no GOOGLE_CLIENT_ID/SECRET set.
    googleConfigured: isGoogleConfigured(),
  })),
  disconnectGoogleCalendar: teacherProcedure.mutation(({ ctx }) =>
    disconnectGoogleCalendar(ctx.user.id)
  ),
  // Creates a real Google Calendar event with an auto-attached Meet link
  // on the teacher's own connected calendar, then saves the resulting
  // link/time onto the lesson (setLessonLiveSession) — this is what
  // actually auto-generates the Meet URL, as opposed to a teacher
  // pasting one manually into content.updateLesson's liveUrl field.
  createLiveSession: teacherProcedure
    .use(rateLimit("teacher-create-live-session", 30, 60 * 60 * 1000))
    .input(
      z.object({
        lessonId: z.number().int().positive(),
        title: z.string().min(2).max(255),
        startsAt: z.string().datetime(),
        durationMinutes: z.number().int().min(10).max(240).default(60),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const meetResult = await createMeetEvent({
        teacherId: ctx.user.id,
        summary: input.title,
        startsAt: new Date(input.startsAt),
        durationMinutes: input.durationMinutes,
      });
      if (!meetResult.ok) {
        if (meetResult.reason === "not_connected")
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Connect your Google Calendar first (Teacher panel → Google Meet).",
          });
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Google Calendar rejected the request. Try again shortly.",
        });
      }
      const saved = await setLessonLiveSession({
        id: input.lessonId,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
        liveUrl: meetResult.meetUrl,
        liveStartsAt: new Date(input.startsAt).getTime(),
      });
      if (!saved)
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      return { ok: true, meetUrl: meetResult.meetUrl };
    }),
  // ---------------------------------------------------------------------
  // Teacher assistant (Claude) — four modules over one shared integration:
  // lesson preparation, exam design, model solutions, paper grading. Each is
  // a real, paid API call, so each is rate-limited per teacher; none of them
  // touches the database.
  // ---------------------------------------------------------------------
  // Lets the assistant panel say plainly that the feature is off on a
  // deployment with no ANTHROPIC_API_KEY set, instead of offering buttons
  // that can only fail.
  assistantStatus: teacherProcedure.query(() => ({
    configured: isClaudeConfigured(),
    model: claudeModel(),
  })),
  // 1 — تحضير الدروس. The generated plan is saved as it is produced, so
  // closing the tab does not lose it; on a deployment with no DATABASE_URL
  // the save is a no-op and `id` comes back null rather than failing the
  // whole request.
  generateLessonPlan: teacherProcedure
    .use(rateLimit("teacher-generate-lesson-plan", 20, 60 * 60 * 1000))
    .input(
      z.object({
        level: z.string().min(2).max(80),
        topic: z.string().min(2).max(160),
        durationMinutes: z.number().int().min(15).max(240).default(60),
        // Optional on purpose: the prompt tells Claude to ask for missing
        // context rather than assume it — see server/prompts/mathLessonPlan.ts.
        priorKnowledge: z.string().max(2000).optional(),
        // The syllabus, an earlier lesson, a textbook page — read as the
        // reference this plan must follow.
        files: filesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { files, ...context } = input;
      const { attachments, skipped } = await attachmentsFor(
        ctx.user.id,
        "lesson",
        files
      );
      const plan = asMarkdown(
        await generateMathLessonPlan(context, attachments)
      );
      const id = await saveLessonPlan({
        teacherId: ctx.user.id,
        ...context,
        content: plan.markdown,
        model: plan.model,
        truncated: plan.truncated,
      });
      return { id, ...plan, skippedFiles: skipped };
    }),
  lessonPlans: teacherProcedure.query(({ ctx }) =>
    listLessonPlans(ctx.user.id, teacherRole(ctx.user.role))
  ),
  lessonPlan: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(
        await getLessonPlan(input.id, ctx.user.id, teacherRole(ctx.user.role))
      )
    ),
  deleteLessonPlan: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteLessonPlan(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  // 2 — تصميم الامتحانات (the paper only; solutions are a separate call)
  generateExam: teacherProcedure
    .use(rateLimit("teacher-generate-exam", 20, 60 * 60 * 1000))
    .input(
      z.object({
        level: z.string().min(2).max(80),
        topics: z.array(z.string().min(2).max(120)).min(1).max(12),
        durationMinutes: z.number().int().min(15).max(300).default(120),
        totalPoints: z.number().int().min(1).max(100).default(20),
        // Past papers of the teacher's own, or the syllabus: the new paper
        // is meant to come out looking like theirs.
        files: filesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { files, ...context } = input;
      const { attachments, skipped } = await attachmentsFor(
        ctx.user.id,
        "exam",
        files
      );
      const paper = asMarkdown(await designMathExam(context, attachments));
      const id = await saveExamPaper({
        teacherId: ctx.user.id,
        ...context,
        content: paper.markdown,
        model: paper.model,
        truncated: paper.truncated,
      });
      return { id, ...paper, skippedFiles: skipped };
    }),
  examPapers: teacherProcedure.query(({ ctx }) =>
    listExamPapers(ctx.user.id, teacherRole(ctx.user.role))
  ),
  examPaper: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(
        await getExamPaper(input.id, ctx.user.id, teacherRole(ctx.user.role))
      )
    ),
  deleteExamPaper: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteExamPaper(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  // 3 — التصحيح النموذجي وسلم التنقيط. Returns the JSON parsed AND raw: when
  // the reply cannot be read as the agreed shape, the teacher still gets the
  // text plus the reason, rather than losing a full model solution — and the
  // row is saved either way, so a fixable JSON is not thrown away.
  generateExamSolutions: teacherProcedure
    .use(rateLimit("teacher-generate-exam-solutions", 20, 60 * 60 * 1000))
    .input(
      z
        .object({
          // May be empty when the paper itself is uploaded (a scan, a PDF, a
          // Word file) — the refine below is what keeps "neither" out.
          examText: z.string().max(20000).default(""),
          // Set when the text came from a paper generated here, so the two
          // stay linked in the teacher's history.
          examPaperId: z.number().int().positive().optional(),
          files: filesSchema,
        })
        .refine(
          input => input.examText.trim().length >= 20 || input.files?.length,
          {
            message: "Provide the exam text, or upload the paper as a file",
          }
        )
    )
    .mutation(async ({ ctx, input }) => {
      if (input.examPaperId !== undefined) {
        mustExist(
          await getExamPaper(
            input.examPaperId,
            ctx.user.id,
            teacherRole(ctx.user.role)
          )
        );
      }
      const { attachments, skipped } = await attachmentsFor(
        ctx.user.id,
        "solutions",
        input.files
      );
      const result = await solveMathExam(
        { examText: input.examText },
        attachments
      );
      if (!result.ok) throw assistantError(result);
      const id = await saveExamSolutionSet({
        teacherId: ctx.user.id,
        examPaperId: input.examPaperId ?? null,
        examText: input.examText,
        solutionsJson: result.json,
        parseError: result.parseError,
        questionCount: result.questions?.length ?? null,
        scaleTotalPoints: result.totalPoints,
        model: result.model,
        truncated: result.truncated,
      });
      return { id, ...result, skippedFiles: skipped };
    }),
  examSolutionSets: teacherProcedure.query(({ ctx }) =>
    listExamSolutionSets(ctx.user.id, teacherRole(ctx.user.role))
  ),
  examSolutionSet: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(
        await getExamSolutionSet(
          input.id,
          ctx.user.id,
          teacherRole(ctx.user.role)
        )
      )
    ),
  deleteExamSolutionSet: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteExamSolutionSet(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!result.ok) {
        if (result.reason === "has_reviewed_grades")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "لا يمكن حذف سلم تنقيط استُعمل في نقاط نهائية سُلّمت للتلاميذ. احذف تلك النقاط أولاً إن كنت متأكداً.",
          });
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      }
      return result;
    }),
  // 4 — تصحيح أوراق التلاميذ, against the module 3 grading scale. Higher
  // limit than the others: one call per student, i.e. a full class in a
  // sitting. No OCR here — studentAnswerText is text the teacher supplies.
  gradeStudentPaper: teacherProcedure
    .use(rateLimit("teacher-grade-student-paper", 120, 60 * 60 * 1000))
    .input(
      z
        .object({
          // Either a saved grading scale…
          solutionSetId: z.number().int().positive().optional(),
          // …or one the teacher pasted in (their own, or from elsewhere).
          solutionsJson: z.string().min(2).max(60000).optional(),
          // May be empty when the pupil's paper is uploaded instead of typed.
          studentAnswerText: z.string().max(20000).default(""),
          // Attaches the mark to a real account, which is what later lets the
          // learner and their parents see it — checked against the teacher's
          // own roster below.
          learnerId: z.number().int().positive().optional(),
          studentLabel: z.string().min(1).max(160).optional(),
          maxPoints: z.number().int().min(1).max(100).optional(),
          // The paper itself: a photo, a scan, a PDF. Claude reads these
          // natively — this is the whole of the "OCR" story.
          files: filesSchema,
        })
        .refine(input => input.solutionSetId || input.solutionsJson, {
          message: "Provide either solutionSetId or solutionsJson",
        })
        .refine(
          input =>
            input.studentAnswerText.trim().length >= 10 || input.files?.length,
          { message: "Provide the pupil's answer as text, or upload the paper" }
        )
    )
    .mutation(async ({ ctx, input }) => {
      const role = teacherRole(ctx.user.role);
      if (input.learnerId !== undefined) {
        const owns = await teacherOwnsLearner(
          ctx.user.id,
          role,
          input.learnerId
        );
        if (!owns)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Student not found in one of your own courses",
          });
      }
      let solutionSetId = input.solutionSetId ?? null;
      let solutionsJson = input.solutionsJson ?? "";
      if (solutionSetId !== null) {
        const set = mustExist(
          await getExamSolutionSet(solutionSetId, ctx.user.id, role)
        );
        solutionsJson = set.solutionsJson;
      }
      const { attachments, skipped } = await attachmentsFor(
        ctx.user.id,
        "grading",
        input.files
      );
      const report = asMarkdown(
        await gradeStudentPaper(
          { solutionsJson, studentAnswerText: input.studentAnswerText },
          attachments
        )
      );
      if (solutionSetId === null) {
        // A pasted scale is stored as a solution set of its own before the
        // grade references it: a mark must always keep a record of what it
        // was graded against, which is the evidence behind it.
        solutionSetId = await saveExamSolutionSet({
          teacherId: ctx.user.id,
          examText: "",
          solutionsJson,
          model: report.model,
          truncated: false,
        });
      }
      const id =
        solutionSetId === null
          ? null
          : await savePaperGrade({
              teacherId: ctx.user.id,
              solutionSetId,
              learnerId: input.learnerId ?? null,
              studentLabel: input.studentLabel ?? null,
              // When the answer was a file, the record keeps what was
              // graded — the filenames — instead of an empty column.
              answerText:
                input.studentAnswerText.trim() ||
                `[ورقة مرفقة: ${
                  attachments
                    .filter(file => !file.name.startsWith("مرجع: "))
                    .map(file => file.name)
                    .join("، ") || "ملف"
                }]`,
              report: report.markdown,
              model: report.model,
              truncated: report.truncated,
              maxPoints: input.maxPoints ?? null,
            });
      return {
        id,
        solutionSetId,
        ...report,
        skippedFiles: skipped,
        // Travels with the result so no UI can quietly drop the caveat.
        provisional: PROVISIONAL_GRADING_NOTICE,
      };
    }),
  // A whole set of papers at once: one archive (or several files) in, one
  // graded draft per pupil out, each named after its file. Capped at
  // MAX_BATCH_PAPERS per call — every paper is its own Claude call, so an
  // uncapped class would both cost a lot and outlast any HTTP timeout.
  gradeStudentPapersBatch: teacherProcedure
    .use(rateLimit("teacher-grade-batch", 20, 60 * 60 * 1000))
    .input(
      z.object({
        solutionSetId: z.number().int().positive(),
        files: z.array(uploadedFileSchema).min(1).max(10),
        maxPoints: z.number().int().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const role = teacherRole(ctx.user.role);
      const set = mustExist(
        await getExamSolutionSet(input.solutionSetId, ctx.user.id, role)
      );
      const { usable, skipped } = await readAttachments(input.files);
      const papers = usable.slice(0, MAX_BATCH_PAPERS);
      const overflow = usable.slice(MAX_BATCH_PAPERS);
      const graded = await inBatches(papers, BATCH_CONCURRENCY, async paper => {
        const result = await gradeStudentPaper(
          { solutionsJson: set.solutionsJson, studentAnswerText: "" },
          [paper]
        );
        if (!result.ok)
          return {
            name: paper.name,
            ok: false as const,
            error: result.message,
          };
        const id = await savePaperGrade({
          teacherId: ctx.user.id,
          solutionSetId: input.solutionSetId,
          studentLabel: paper.name.slice(0, 160),
          answerText: `[ورقة مرفقة: ${paper.name}]`,
          report: result.text,
          model: result.model,
          truncated: result.truncated,
          maxPoints: input.maxPoints ?? null,
        });
        return {
          name: paper.name,
          ok: true as const,
          id,
          markdown: result.text,
          truncated: result.truncated,
        };
      });
      return {
        graded,
        provisional: PROVISIONAL_GRADING_NOTICE,
        skippedFiles: [
          ...skipped,
          ...overflow.map(file => ({
            name: file.name,
            reason: `تجاوز حدّ ${MAX_BATCH_PAPERS} أوراق في الطلب الواحد — أعد رفعه في دفعة تالية.`,
          })),
        ],
      };
    }),
  paperGrades: teacherProcedure
    .input(
      z
        .object({ solutionSetId: z.number().int().positive().optional() })
        .optional()
    )
    .query(({ ctx, input }) =>
      listPaperGrades(ctx.user.id, teacherRole(ctx.user.role), {
        solutionSetId: input?.solutionSetId,
      })
    ),
  paperGrade: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(
        await getPaperGrade(input.id, ctx.user.id, teacherRole(ctx.user.role))
      )
    ),
  deletePaperGrade: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deletePaperGrade(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  // The only way a mark becomes real: the teacher types it, and only then is
  // the learner (and every actively-linked parent) notified.
  reviewPaperGrade: teacherProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        finalPoints: z.number().int().min(0).max(100),
        maxPoints: z.number().int().min(1).max(100),
        teacherNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await markPaperGradeReviewed({
        ...input,
        teacherId: ctx.user.id,
        role: teacherRole(ctx.user.role),
      });
      if (!result.ok) {
        if (result.reason === "invalid_mark")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "النقطة يجب أن تكون بين 0 والنقطة القصوى.",
          });
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      }
      return result;
    }),
  // ---------------------------------------------------------------------
  // The reference library — upload once, used by every generation
  // ---------------------------------------------------------------------
  references: teacherProcedure.query(({ ctx }) =>
    listReferences(ctx.user.id, teacherRole(ctx.user.role))
  ),
  addReference: teacherProcedure
    .use(rateLimit("teacher-add-reference", 60, 60 * 60 * 1000))
    .input(
      z.object({
        file: uploadedFileSchema,
        scope: z
          .enum(["all", "lesson", "exam", "solutions", "grading"])
          .default("all"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if ((await countReferences(ctx.user.id)) >= MAX_REFERENCES_PER_TEACHER) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `بلغت الحد الأقصى (${MAX_REFERENCES_PER_TEACHER} مرجعاً). احذف مرجعاً قبل إضافة آخر.`,
        });
      }
      // One archive would become many references with no obvious names — and
      // a reference is something the teacher chose deliberately, so it is
      // one real file at a time.
      if (input.file.mimeType === "application/zip") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "أضف ملفات المراجع واحداً واحداً، لا داخل أرشيف ZIP.",
        });
      }
      const [extracted] = await extractAttachment(input.file);
      if (extracted.kind === "unsupported") {
        throw new TRPCError({ code: "BAD_REQUEST", message: extracted.reason });
      }
      // Text formats are unpacked once, here. Images and PDFs keep the file,
      // because Claude reads those itself and needs the bytes every time.
      let storageKey: string | null = null;
      let extractedText: string | null = null;
      if (extracted.kind === "text") {
        extractedText = extracted.text;
      } else {
        const safeName =
          input.file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) ||
          "reference";
        const stored = await storagePut(
          `teacher-references/${ctx.user.id}/${safeName}`,
          Buffer.from(input.file.dataBase64, "base64"),
          input.file.mimeType
        );
        storageKey = stored.key;
      }
      const id = await saveReference({
        teacherId: ctx.user.id,
        fileName: input.file.fileName.slice(0, 255),
        mimeType: input.file.mimeType,
        sizeBytes: input.file.sizeBytes,
        storageKey,
        extractedText,
        scope: input.scope,
      });
      if (id === null)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "قاعدة البيانات غير متصلة — لا يمكن حفظ مرجع دائم. أرفق الملف مع كل طلب بدلاً من ذلك.",
        });
      return { id };
    }),
  updateReference: teacherProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        active: z.boolean().optional(),
        scope: z
          .enum(["all", "lesson", "exam", "solutions", "grading"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateReference({
        ...input,
        teacherId: ctx.user.id,
        role: teacherRole(ctx.user.role),
      });
      if (!updated)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  deleteReference: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteReference(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  // ---------------------------------------------------------------------
  // Exports — "give me the file"
  // ---------------------------------------------------------------------
  // Everything the assistant produced can leave as a real document: Word or
  // PDF for a plan/paper/solution/report, and an Excel marks sheet for a
  // whole set of corrected papers. Arabic is laid out right-to-left in all
  // three (see server/exports/documentExport.ts).
  exportDocument: teacherProcedure
    .use(rateLimit("teacher-export-document", 200, 60 * 60 * 1000))
    .input(
      z.object({
        kind: z.enum([
          "lessonPlan",
          "examPaper",
          "examSolutions",
          "paperGrade",
        ]),
        id: z.number().int().positive(),
        format: z.enum(["docx", "pdf"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const role = teacherRole(ctx.user.role);
      let title: string;
      let body: string;
      if (input.kind === "lessonPlan") {
        const row = mustExist(await getLessonPlan(input.id, ctx.user.id, role));
        title = `تحضير درس: ${row.topic} — ${row.level}`;
        body = row.content;
      } else if (input.kind === "examPaper") {
        const row = mustExist(await getExamPaper(input.id, ctx.user.id, role));
        title = `امتحان: ${row.level} (${row.totalPoints} نقطة)`;
        body = row.content;
      } else if (input.kind === "examSolutions") {
        const row = mustExist(
          await getExamSolutionSet(input.id, ctx.user.id, role)
        );
        // The stored JSON may be the unparsable kind that module 3
        // deliberately keeps rather than discards — exporting it must fall
        // back to the raw text, not throw a 500 at the teacher.
        let questions = null;
        try {
          const parsed = examSolutionsSchema.safeParse(
            JSON.parse(row.solutionsJson)
          );
          if (parsed.success) questions = parsed.data;
        } catch {
          questions = null;
        }
        title = "التصحيح النموذجي وسلم التنقيط";
        body = formatSolutionsForExport(questions, row.solutionsJson);
      } else {
        const row = mustExist(await getPaperGrade(input.id, ctx.user.id, role));
        const mark =
          row.status === "reviewed" && row.finalPoints !== null
            ? `${row.finalPoints}/${row.maxPoints ?? "?"}`
            : "مسودة (لم تُعتمد بعد)";
        title = `ورقة ${row.studentLabel ?? `#${row.id}`} — ${mark}`;
        // The draft caveat is part of the document, not just the screen: a
        // printed report must not read as a final mark either.
        body =
          row.status === "reviewed"
            ? row.report
            : `${PROVISIONAL_GRADING_NOTICE}\n\n${row.report}`;
      }
      const buffer =
        input.format === "docx"
          ? await toDocx(title, body)
          : await toPdf(title, body);
      return {
        fileName: safeFileName(title, input.format),
        contentType: EXPORT_CONTENT_TYPES[input.format],
        dataBase64: buffer.toString("base64"),
      };
    }),
  // The class marks sheet: every paper graded against one scale, or every
  // paper this teacher has graded. Unreviewed rows carry no number — they are
  // listed as drafts, so a spreadsheet cannot pass a suggestion off as a mark.
  exportClassMarks: teacherProcedure
    .use(rateLimit("teacher-export-marks", 100, 60 * 60 * 1000))
    .input(
      z
        .object({ solutionSetId: z.number().int().positive().optional() })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const role = teacherRole(ctx.user.role);
      if (input?.solutionSetId !== undefined) {
        mustExist(
          await getExamSolutionSet(input.solutionSetId, ctx.user.id, role)
        );
      }
      const rows = await listPaperGrades(ctx.user.id, role, {
        solutionSetId: input?.solutionSetId,
        limit: 500,
      });
      const buffer = await toMarksXlsx(
        "نتائج القسم",
        rows.map(row => ({
          student: row.learnerName || row.studentLabel || `#${row.id}`,
          finalPoints: row.status === "reviewed" ? row.finalPoints : null,
          maxPoints: row.maxPoints,
          status: row.status === "reviewed" ? "معتمدة" : "مسودة",
          notes: null,
          date: row.reviewedAt ?? row.createdAt,
        }))
      );
      const format: ExportFormat = "xlsx";
      return {
        fileName: safeFileName("نتائج القسم", format),
        contentType: EXPORT_CONTENT_TYPES[format],
        dataBase64: buffer.toString("base64"),
        rowCount: rows.length,
      };
    }),
  sendReport: teacherProcedure
    .use(rateLimit("teacher-send-report", 60, 60 * 60 * 1000))
    .input(
      z.object({
        learnerId: z.number().int().positive(),
        courseId: z.number().int().positive().optional(),
        level: z.string().min(1).max(40),
        title: z.string().min(2).max(255),
        notes: z.string().min(2).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createLearnerReport({
        teacherId: ctx.user.id,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        ...input,
      });
      if (!result.ok)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found in one of your own courses",
        });
      return result;
    }),
});

/**
 * Maps a Claude failure onto the right tRPC code: a missing key is a
 * deployment precondition, a refusal is about this specific request, and
 * anything else is the upstream API failing.
 */
function assistantError(
  result: Extract<ClaudeTextResult, { ok: false }>
): TRPCError {
  if (result.reason === "not_configured")
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: result.message,
    });
  if (result.reason === "refused")
    return new TRPCError({ code: "BAD_REQUEST", message: result.message });
  return new TRPCError({ code: "BAD_GATEWAY", message: result.message });
}

/** Shared success shape for the three Markdown-returning modules. */
function asMarkdown(result: ClaudeTextResult) {
  if (!result.ok) throw assistantError(result);
  return {
    markdown: result.text,
    model: result.model,
    truncated: result.truncated,
  };
}

/** Narrows ctx.user.role to the three roles the teacher endpoints allow through. */
function teacherRole(role: string) {
  return role as "teacher" | "institution" | "admin";
}

/**
 * Turns "no row, or not yours" into a 404 — deliberately the same answer for
 * both, so an id that belongs to another teacher is indistinguishable from
 * one that does not exist.
 */
function mustExist<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
  return value;
}
