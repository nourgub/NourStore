// Shared tRPC procedure builders — used by every domain router. Extracted
// out of the former single routers.ts monolith so each domain router file
// (server/routers/*.ts) can import exactly these without pulling in that
// file's other 2000+ lines.
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./trpc";
import { checkRateLimit } from "../rateLimit";

export const roleProcedure = (
  roles: Array<"learner" | "parent" | "teacher" | "institution" | "admin">,
  message: string
) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.user.role))
      throw new TRPCError({ code: "FORBIDDEN", message });
    return next();
  });

export const adminProcedure = roleProcedure(["admin"], "Admin access required");
export const parentProcedure = roleProcedure(
  ["parent", "admin"],
  "Parent access required"
);
export const teacherProcedure = roleProcedure(
  ["teacher", "admin"],
  "Teacher access required"
);
export const institutionProcedure = roleProcedure(
  ["institution", "admin"],
  "Institution access required"
);
export const learnerProcedure = roleProcedure(
  ["learner", "admin"],
  "Learner access required"
);

/** Per-user rate-limit guard, chainable onto any procedure that already has ctx.user (i.e. after protectedProcedure/roleProcedure). */
type RateLimitMiddleware = Parameters<typeof protectedProcedure.use>[0];
export const rateLimit = (
  name: string,
  max: number,
  windowMs: number
): RateLimitMiddleware =>
  (async (opts: {
    ctx: { user: { id: number } };
    next: () => unknown;
  }) => {
    if (!(await checkRateLimit(`${name}:${opts.ctx.user.id}`, max, windowMs))) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests, please try again later",
      });
    }
    return opts.next();
  }) as unknown as RateLimitMiddleware;
