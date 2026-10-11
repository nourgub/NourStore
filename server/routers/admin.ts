import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, rateLimit } from "../_core/procedures";
import { getRateLimitStatus } from "../rateLimit";
import { validatePasswordStrength, hashPassword } from "../_core/emailAuth";
import { getAdminAuditLog, logAdminAction } from "../db/adminAudit";
import { adminResetPassword, createManagedUser, getAllUsers, setAccountStatus, updateUserRole } from "../db/usersAuth";
import { getErrorLog, getErrorLogSummary, markErrorResolved } from "../db/errorLog";

/**
 * Accounts and logs — the admin tools shared by the whole platform: roles
 * (a teacher account is granted here, never self-chosen), password resets
 * (the only account-recovery path), account status, the admin audit log
 * and the error log. Everything BAC-specific lives in bacAdmin
 * (server/routers/bac.ts).
 */
export const adminRouter = router({
  systemStatus: adminProcedure.query(() => getRateLimitStatus()),
  users: adminProcedure.query(() => getAllUsers()),
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        role: z.enum(["learner", "parent", "teacher", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await updateUserRole(input.userId, input.role);
      await logAdminAction({
        actorId: ctx.user.id,
        action: "update_user_role",
        targetType: "user",
        targetId: input.userId,
        details: { newRole: input.role, succeeded: result },
      });
      return result;
    }),
  // The platform's only account-recovery path — no outbound email
  // infrastructure exists to power a self-service "reset link" flow (see
  // adminResetPassword's own comment). An admin sets a new password
  // directly and relays it to the learner via WhatsApp/the existing
  // support channel.
  resetPassword: adminProcedure
    .use(rateLimit("admin-reset-password", 30, 60 * 60 * 1000))
    .input(
      z.object({
        userId: z.number().int().positive(),
        newPassword: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const strength = validatePasswordStrength(input.newPassword);
      if (!strength.ok)
        throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
      const passwordHash = await hashPassword(input.newPassword);
      const result = await adminResetPassword(input.userId, passwordHash);
      await logAdminAction({
        actorId: ctx.user.id,
        action: "reset_password",
        targetType: "user",
        targetId: input.userId,
        details: { succeeded: result.ok },
      });
      if (!result.ok)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This account doesn't sign in with a password (not an email/password account).",
        });
      return result;
    }),
  // Admin-created account — distinct from self-service auth.registerWithEmail.
  // The admin picks the role directly, so a teacher/learner account here
  // starts "pending" (see createManagedUser) until activateUser confirms
  // payment. An admin-created "admin" account starts active immediately.
  createUser: adminProcedure
    .use(rateLimit("admin-create-user", 30, 60 * 60 * 1000))
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email().max(320),
        password: z.string().min(1).max(200),
        role: z.enum(["learner", "teacher", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const strength = validatePasswordStrength(input.password);
      if (!strength.ok)
        throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
      const passwordHash = await hashPassword(input.password);
      const result = await createManagedUser({
        email: input.email.trim().toLowerCase(),
        name: input.name,
        passwordHash,
        role: input.role,
      });
      if (!result.ok)
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      await logAdminAction({
        actorId: ctx.user.id,
        action: "create_user",
        targetType: "user",
        targetId: result.userId,
        details: { role: input.role, email: input.email },
      });
      return { ok: true, userId: result.userId };
    }),
  // Confirms payment was received outside the platform (bank transfer,
  // in-person, etc.) and unblocks login for an admin-created teacher/
  // learner account — see the "pending" gate in loginWithEmail above.
  activateUser: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        status: z.enum(["active", "pending", "suspended"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await setAccountStatus(input.userId, input.status);
      await logAdminAction({
        actorId: ctx.user.id,
        action: "set_account_status",
        targetType: "user",
        targetId: input.userId,
        details: { status: input.status, succeeded: result },
      });
      return { ok: result };
    }),
  auditLog: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
          action: z.string().max(80).optional(),
        })
        .optional()
    )
    .query(({ input }) => getAdminAuditLog(input ?? {})),
  errorLog: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
          source: z.enum(["backend", "frontend"]).optional(),
          resolved: z.boolean().optional(),
          search: z.string().max(200).optional(),
        })
        .optional()
    )
    .query(({ input }) => getErrorLog(input ?? {})),
  errorLogSummary: adminProcedure.query(() => getErrorLogSummary()),
  markErrorResolved: adminProcedure
    .input(
      z.object({ id: z.number().int().positive(), resolved: z.boolean() })
    )
    .mutation(({ input }) => markErrorResolved(input.id, input.resolved)),
});
