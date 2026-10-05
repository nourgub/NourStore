import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { roleProcedure } from "../_core/procedures";
import { checkRateLimit } from "../rateLimit";
import {
  verifyCertificate,
  revokeCertificate,
  reissueCertificate,
  logAdminAction,
} from "../db";

export const certificatesRouter = router({
  verify: publicProcedure
    .input(
      z.object({
        id: z
          .string()
          .trim()
          .min(6)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
      })
    )
    .query(async ({ ctx, input }) => {
      // Public and unauthenticated by design (that's the point of a
      // certificate verifier) — rate-limited by IP so it can't be used
      // as an unlimited-cost query hammer or spam vector. Not a brute
      // force concern (certificate ids are nanoid(12), computationally
      // infeasible to enumerate), just basic abuse protection on an
      // endpoint anyone on the internet can hit with zero login.
      if (
        !(await checkRateLimit(
          `certificate-verify:${ctx.req.ip || "unknown"}`,
          60,
          60 * 60 * 1000
        ))
      )
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests, please try again later",
        });
      return verifyCertificate(input.id);
    }),
  revoke: roleProcedure(["admin"], "Admin access required")
    .input(z.object({ certificateId: z.string().min(6).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const result = await revokeCertificate(input.certificateId);
      await logAdminAction({
        actorId: ctx.user.id,
        action: "revoke_certificate",
        targetType: "certificate",
        targetId: input.certificateId,
      });
      return result;
    }),
  reissue: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        userId: z.number().int().positive(),
        courseId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await reissueCertificate(input);
      await logAdminAction({
        actorId: ctx.user.id,
        action: "reissue_certificate",
        targetType: "course",
        targetId: input.courseId,
        details: { userId: input.userId },
      });
      return result;
    }),
});
