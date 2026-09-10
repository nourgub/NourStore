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
import {
  toPublicUser,
  createEmailUser,
  getEmailUserPasswordHash,
  markUserSignedIn,
  chooseOwnRole,
} from "../db";
import { rateLimit } from "../_core/procedures";

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
      });
      if (!result.ok)
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      const sessionToken = await createSessionToken(openId, {
        name: input.name,
      });
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });
      return { ok: true };
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
  // A visitor's one-time choice of account category at onboarding.
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
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
