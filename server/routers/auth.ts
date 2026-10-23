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
  getUserByOpenId,
  revokeSessions,
  setPasswordHash,
} from "../db/usersAuth";
import { consumeResetToken, createResetToken, RESET_TOKEN_TTL_MS } from "../db/passwordReset";
import { sendMail } from "../_core/mailer";
import { ENV } from "../_core/env";
import type { Request } from "express";
import { logEvent } from "../db/bacPlatform";

/** The site's own address for links in emails — never taken from the request
 *  in production (a forged Host header must not choose where the link goes). */
function appBaseUrl(req: Request): string | null {
  const configured = (process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (/^https?:\/\/[^\s/]+(\/[\w./-]*)?$/i.test(configured)) return configured;
  return ENV.isProduction ? null : `${req.protocol}://${req.get("host")}`;
}

async function sendResetEmail(email: string, req: Request) {
  const user = await getUserByOpenId(emailOpenId(email));
  // Only email+password accounts that may sign in get a code.
  if (!user || user.loginMethod !== "email" || user.accountStatus !== "active") return;
  const base = appBaseUrl(req);
  if (!base) {
    console.warn("[auth] APP_BASE_URL is not set: password reset email not sent.");
    return;
  }
  const token = await createResetToken(user.id);
  if (!token) return;
  const minutes = Math.round(RESET_TOKEN_TTL_MS / 60_000);
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: "تفوّق — إعادة تعيين كلمة المرور / Réinitialisation du mot de passe",
    text:
      `طلبتَ إعادة تعيين كلمة مرور حسابك في تفوّق.\nافتح هذا الرابط خلال ${minutes} دقيقة لاختيار كلمة مرور جديدة (يعمل مرة واحدة):\n${link}\n\n` +
      `Vous avez demandé à réinitialiser votre mot de passe Tafawoq. Ouvrez ce lien dans les ${minutes} minutes (utilisable une seule fois) :\n${link}\n\n` +
      "إذا لم تطلب ذلك، تجاهل هذه الرسالة: كلمة مرورك لم تتغير. / Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  });
  await logEvent(user.id, "password_reset_requested", {});
}

/** "a***@example.com": enough to spot repeated failures, without the full address. */
function maskEmail(email: string) {
  const [name, domain] = email.trim().toLowerCase().split("@");
  return `${(name ?? "").slice(0, 1)}***@${domain ?? ""}`;
}
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
      const created = await getUserByOpenId(openId);
      await logEvent(created?.id ?? null, "account_created", { method: "email" });
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
      // Many emails tried from one address (credential stuffing).
      if (!(await checkRateLimit(`email-login-ip:${ctx.req.ip || "unknown"}`, 60, 15 * 60 * 1000)))
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, try again later",
        });
      const record = await getEmailUserPasswordHash(openId);
      const valid = await verifyPassword(input.password, record?.passwordHash ?? null);
      if (!valid) {
        await logEvent(null, "login_failed", { email: maskEmail(input.email), ip: ctx.req.ip || null });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
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
      await logEvent((await getUserByOpenId(openId))?.id ?? null, "login", { method: "email" });
      const sessionToken = await createSessionToken(openId, {});
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });
      return { ok: true };
    }),
  // Self-service password reset. The answer is the same whether or not the
  // email has an account (no account discovery), and the email is sent in
  // the background so the response time doesn't tell either.
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const allowed =
        (await checkRateLimit(`password-reset-ip:${ctx.req.ip || "unknown"}`, 10, 60 * 60 * 1000)) &&
        (await checkRateLimit(`password-reset:${email}`, 3, 60 * 60 * 1000));
      if (!allowed)
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts, try again later" });
      void sendResetEmail(email, ctx.req).catch(error =>
        console.warn("[auth] password reset email failed:", error instanceof Error ? error.message : error)
      );
      return { ok: true } as const;
    }),
  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(20).max(200), newPassword: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      if (!(await checkRateLimit(`password-reset-use:${ctx.req.ip || "unknown"}`, 20, 60 * 60 * 1000)))
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts, try again later" });
      const strength = validatePasswordStrength(input.newPassword);
      if (!strength.ok) throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
      const userId = await consumeResetToken(input.token);
      if (!userId) throw new TRPCError({ code: "BAD_REQUEST", message: "RESET_INVALID" });
      // Bumps the session version: every session signed before ends.
      await setPasswordHash(userId, await hashPassword(input.newPassword));
      await logEvent(userId, "password_reset", { method: "email_code" });
      return { ok: true } as const;
    }),
  changePassword: protectedProcedure
    .use(rateLimit("password-change", 10, 60 * 60 * 1000))
    .input(z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const record = await getEmailUserPasswordHash(ctx.user.openId);
      if (!record?.passwordHash || !(await verifyPassword(input.currentPassword, record.passwordHash)))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "WRONG_PASSWORD" });
      const strength = validatePasswordStrength(input.newPassword);
      if (!strength.ok) throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
      await setPasswordHash(ctx.user.id, await hashPassword(input.newPassword));
      await logEvent(ctx.user.id, "password_changed", {});
      // Other devices are signed out; this one gets a fresh session.
      ctx.res.cookie(COOKIE_NAME, await createSessionToken(ctx.user.openId, {}), {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });
      return { ok: true } as const;
    }),
  // Ends every session of the account, this one included.
  logoutEverywhere: protectedProcedure.mutation(async ({ ctx }) => {
    await revokeSessions(ctx.user.id);
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { ok: true } as const;
  }),
  // A visitor's one-time choice of account category at onboarding.
  // "admin" is intentionally not an option here — see chooseOwnRole in db.ts.
  chooseRole: protectedProcedure
    .use(rateLimit("choose-role", 5, 60 * 60 * 1000))
    // Only roles that grant nothing on their own are self-selectable: a
    // parent sees nothing until a child shares a one-time code with it
    // (parent.acceptInvite). A teacher sees students' submitted exercises,
    // so that role is granted by an admin (admin.updateUserRole), never
    // self-chosen; "admin" never is.
    .input(z.object({ role: z.enum(["learner", "parent"]) }))
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
