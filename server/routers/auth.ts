import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkRateLimit } from "../rateLimit";
import { isGoogleConfigured } from "../_core/googleAuth";
import { createSessionToken } from "../_core/session";
import {
  hashPassword,
  verifyPassword,
  emailOpenId,
  validatePasswordStrength,
} from "../_core/emailAuth";
import { isEmailConfigured, sendEmail } from "../_core/email";
import {
  toPublicUser,
  createEmailUser,
  getEmailUserPasswordHash,
  markUserSignedIn,
  chooseOwnRole,
  getUserIdForPasswordReset,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "../db";
import { rateLimit } from "../_core/procedures";
import { notifyAdminOfPendingRegistration } from "../whatsappBot";
import type { TrpcContext } from "../_core/context";

// Same pattern as buildRedirectUri in googleAuth.ts — respects a reverse
// proxy's X-Forwarded-Proto so the reset link uses https in production
// even when Express itself only sees a plain http connection from the proxy.
function buildOrigin(req: TrpcContext["req"]): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}`;
}

export const authRouter = router({
  me: publicProcedure.query(opts => (opts.ctx.user ? toPublicUser(opts.ctx.user) : null)),
  // Lets the login/register page hide the Google sign-in button on a
  // deployment that only has GOOGLE_CLIENT_ID/SECRET unset (e.g.
  // AUTH_PROVIDER=email) — without this, that button always renders and
  // always redirects into /api/auth/google/login's 501 "not configured"
  // page, since the client has no way to know Google isn't set up.
  config: publicProcedure.query(() => ({ googleEnabled: isGoogleConfigured() })),
  // Real email + password sign-up/sign-in — no external service, no
  // third-party account, works entirely self-hosted. Rate-limited by IP
  // via the session-less protectedProcedure not applying here (these are
  // public, pre-authentication endpoints) — rate-limited by email/openId
  // instead via the shared in-memory limiter.
  registerWithEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        password: z.string().min(1).max(200),
        name: z.string().min(2).max(100),
        // "admin" is intentionally never an option here — see createEmailUser
        // in db.ts. Optional/defaulted to "learner" so an older client build
        // that doesn't send it still registers exactly as before.
        role: z.enum(["learner", "teacher", "institution"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (
        !(await checkRateLimit(
          `email-register:${input.email.toLowerCase()}`,
          5,
          60 * 60 * 1000
        ))
      )
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, try again later",
        });
      // The per-email limit above does nothing against an attacker who
      // varies the email on every request — this caps mass account
      // creation from a single source regardless of the email used.
      // Looser than the per-email limit since a shared IP (an office, a
      // school) can legitimately have several real people signing up.
      if (
        !(await checkRateLimit(
          `email-register-ip:${ctx.req.ip || "unknown"}`,
          20,
          60 * 60 * 1000
        ))
      )
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, try again later",
        });
      const strength = validatePasswordStrength(input.password);
      if (!strength.ok)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: strength.reason,
        });
      const openId = emailOpenId(input.email);
      const passwordHash = await hashPassword(input.password);
      const result = await createEmailUser({
        openId,
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
      if (result.pending) {
        // No session cookie — a pending account cannot use the platform yet.
        // Best-effort: a missing/misconfigured WhatsApp admin number must
        // never fail registration itself, so this never throws.
        await notifyAdminOfPendingRegistration({
          id: result.userId,
          name: input.name,
          email: input.email,
        }).catch(() => {});
        return { ok: true, pending: true };
      }
      const sessionToken = await createSessionToken(openId, {
        name: input.name,
      });
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });
      return { ok: true, pending: false };
    }),
  loginWithEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        password: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const openId = emailOpenId(input.email);
      if (!(await checkRateLimit(`email-login:${openId}`, 10, 15 * 60 * 1000)))
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, try again later",
        });
      const record = await getEmailUserPasswordHash(openId);
      const valid = await verifyPassword(input.password, record?.passwordHash ?? null);
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      if (record?.accountStatus === "pending")
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Your account is pending activation by an administrator.",
        });
      if (record?.accountStatus === "suspended")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account has been suspended.",
        });
      await markUserSignedIn(openId);
      const sessionToken = await createSessionToken(openId, {});
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });
      return { ok: true };
    }),
  // A visitor's one-time choice of account category at onboarding — the
  // fallback for an account that didn't already pick a role at registration.
  // "admin" is intentionally not an option here — see chooseOwnRole in db.ts.
  chooseRole: protectedProcedure
    .use(rateLimit("choose-role", 5, 60 * 60 * 1000))
    .input(z.object({ role: z.enum(["learner", "teacher", "institution"]) }))
    .mutation(async ({ ctx, input }) => {
      const result = await chooseOwnRole(ctx.user.id, input.role);
      if (!result.ok)
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Account type has already been chosen — contact an admin to change it.",
        });
      return result;
    }),
  // Lets the client show an honest "email sending isn't set up yet, contact
  // support" message on the forgot-password page instead of pretending a
  // reset email is on its way when no SMTP is configured.
  passwordResetConfig: publicProcedure.query(() => ({
    emailConfigured: isEmailConfigured(),
  })),
  // Never reveals whether the given email actually has an account (or
  // whether it's an email/password account at all) — always responds the
  // same way regardless, exactly like a real bank/webmail "forgot
  // password" flow. Rate-limited the same way as registerWithEmail (per
  // email and per IP) to stop this from being usable to mass-probe emails
  // or mass-trigger sends.
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (
        !(await checkRateLimit(
          `password-reset-request:${normalizedEmail}`,
          5,
          60 * 60 * 1000
        )) ||
        !(await checkRateLimit(
          `password-reset-request-ip:${ctx.req.ip || "unknown"}`,
          20,
          60 * 60 * 1000
        ))
      )
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, try again later",
        });
      const match = await getUserIdForPasswordReset(normalizedEmail);
      if (match && isEmailConfigured()) {
        const token = await createPasswordResetToken(match.userId);
        if (token) {
          const resetUrl = `${buildOrigin(ctx.req)}/reset-password?token=${token}`;
          await sendEmail({
            to: normalizedEmail,
            subject: "إعادة تعيين كلمة المرور — Nourix Academy",
            text: `مرحبًا${match.name ? " " + match.name : ""}،\n\nطلبت إعادة تعيين كلمة المرور لحسابك في Nourix Academy. اضغط على الرابط التالي لتعيين كلمة مرور جديدة (صالح لمدة ساعة واحدة):\n\n${resetUrl}\n\nإذا لم تطلب هذا، تجاهل هذه الرسالة ببساطة.`,
            html: `<p>مرحبًا${match.name ? " " + match.name : ""}،</p><p>طلبت إعادة تعيين كلمة المرور لحسابك في Nourix Academy. اضغط على الرابط التالي لتعيين كلمة مرور جديدة (صالح لمدة ساعة واحدة):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>إذا لم تطلب هذا، تجاهل هذه الرسالة ببساطة.</p>`,
          }).catch(() => {});
        }
      }
      // Always the same response — existence of the account is never leaked.
      return { ok: true } as const;
    }),
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1).max(200),
        newPassword: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // rateLimit (procedures.ts) assumes an authenticated ctx.user, which
      // this pre-authentication public procedure never has — rate-limited
      // by IP directly instead, same as requestPasswordReset's IP guard.
      if (
        !(await checkRateLimit(
          `password-reset-submit-ip:${ctx.req.ip || "unknown"}`,
          10,
          60 * 60 * 1000
        ))
      )
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, try again later",
        });
      const strength = validatePasswordStrength(input.newPassword);
      if (!strength.ok)
        throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
      const newPasswordHash = await hashPassword(input.newPassword);
      const result = await resetPasswordWithToken(input.token, newPasswordHash);
      if (!result.ok)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This reset link is invalid or has expired. Request a new one.",
        });
      return { ok: true } as const;
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
