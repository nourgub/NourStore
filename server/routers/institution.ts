import { router } from "../_core/trpc";
import { institutionProcedure } from "../_core/procedures";
import { getCoursesForRole, getManagedLearnerCount } from "../db";

export const institutionRouter = router({
  courses: institutionProcedure.query(({ ctx }) =>
    getCoursesForRole(ctx.user.role, ctx.user.id)
  ),
  learnerCount: institutionProcedure.query(({ ctx }) =>
    getManagedLearnerCount(ctx.user.role)
  ),
});
