import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getPublishedCourses,
  searchLearningContent,
  getCourseWithCurriculum,
  getLessonAssets,
  getLessonForLearner,
  getAlgorithmExerciseBySlug,
  getPublishedAlgorithmExercises,
  getActiveSubjects,
  getAllBadges,
} from "../db";

export const learningRouter = router({
  courses: publicProcedure.query(() => getPublishedCourses()),
  search: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(2).max(80),
        level: z
          .enum([
            "starter",
            "foundation",
            "intermediate",
            "advanced",
            "exam",
            "professional",
          ])
          .optional(),
        subject: z.string().min(1).max(40).optional(),
        limit: z.number().int().min(1).max(30).default(10),
      })
    )
    .query(({ input }) => searchLearningContent(input)),
  course: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(160) }))
    .query(({ ctx, input }) =>
      getCourseWithCurriculum(
        input.slug,
        ctx.user ? { id: ctx.user.id, role: ctx.user.role } : null
      )
    ),
  lessonAssets: protectedProcedure
    .input(z.object({ lessonId: z.number().int().positive() }))
    .query(({ ctx, input }) => getLessonAssets(input.lessonId, ctx.user.id)),
  // Full lesson content (video/text/live link/attachments) — gated behind
  // enrollment + published + (free course or active subscription), and
  // reports server-enforced sequencing (locked) rather than trusting the client.
  lesson: protectedProcedure
    .input(z.object({ lessonId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      getLessonForLearner(input.lessonId, ctx.user.id)
    ),
  algorithmExercise: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(160) }))
    .query(({ input }) => getAlgorithmExerciseBySlug(input.slug)),
  algorithmExercises: publicProcedure.query(() =>
    getPublishedAlgorithmExercises()
  ),
  subjects: publicProcedure.query(() => getActiveSubjects()),
  badges: publicProcedure.query(() => getAllBadges()),
});
