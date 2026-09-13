import { router } from "../_core/trpc";
import { z } from "zod";
import { learnerProcedure, rateLimit } from "../_core/procedures";
import {
  createParentInvite,
  cancelParentInvite,
  getReportsForLearner,
  getPaperGradesForLearner,
} from "../db";

export const learnerRouter = router({
  createInvite: learnerProcedure
    .use(rateLimit("parent-invite-create", 5, 60 * 60 * 1000))
    .mutation(({ ctx }) => createParentInvite(ctx.user.id)),
  cancelInvite: learnerProcedure
    .input(z.object({ inviteId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      cancelParentInvite({
        inviteId: input.inviteId,
        requesterId: ctx.user.id,
        role: ctx.user.role,
      })
    ),
  myReports: learnerProcedure.query(({ ctx }) =>
    getReportsForLearner(ctx.user.id)
  ),
  // Marks from the teacher assistant's paper grading — reviewed ones only:
  // a draft AI suggestion is never a learner's mark (see
  // server/db/teacherAssistant.ts, markPaperGradeReviewed).
  myPaperGrades: learnerProcedure.query(({ ctx }) =>
    getPaperGradesForLearner(ctx.user.id)
  ),
});
