import nodemailer from "nodemailer";

// Optional self-service email capability, following the same pattern as
// Gemini (src/lib/agents/geminiClient.ts): a secondary capability that is
// fully inert without configuration — nothing else in the app depends on
// it, and the admin-assisted password-reset flow (src/lib/passwordReset.ts)
// keeps working exactly as before when no SMTP_* vars are set. Works with
// any standard SMTP provider (Gmail app password, SendGrid/Mailgun SMTP,
// a school's own mail server, ...) rather than locking the project to one
// proprietary email API.

export class EmailSendError extends Error {}

function getConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

export function isEmailConfigured(): boolean {
  return getConfig() !== null;
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let cachedConfigKey: string | null = null;

function getTransporter() {
  const config = getConfig();
  if (!config) throw new EmailSendError("لم يتم إعداد خدمة البريد الإلكتروني");

  // Rebuild only if the config actually changed (env vars are effectively
  // static at runtime, but this keeps the module safe to import in tests
  // that swap env vars between cases).
  const configKey = `${config.host}:${config.port}:${config.user}`;
  if (!cachedTransporter || cachedConfigKey !== configKey) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    cachedConfigKey = configKey;
  }
  return { transporter: cachedTransporter, from: config.from };
}

export async function sendPasswordResetEmail(args: { to: string; resetUrl: string }): Promise<void> {
  const { transporter, from } = getTransporter();
  try {
    await transporter.sendMail({
      from,
      to: args.to,
      subject: "إعادة تعيين كلمة المرور — منصة نور",
      text: `لإعادة تعيين كلمة مرورك، افتح هذا الرابط خلال ساعة واحدة:\n${args.resetUrl}\n\nإذا لم تطلب هذا، تجاهل هذه الرسالة ولن يتغيّر شيء في حسابك.`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; line-height: 1.6;">
          <p>لإعادة تعيين كلمة مرورك في منصة نور، اضغط على الرابط التالي خلال ساعة واحدة:</p>
          <p><a href="${args.resetUrl}">${args.resetUrl}</a></p>
          <p>إذا لم تطلب هذا، تجاهل هذه الرسالة ولن يتغيّر شيء في حسابك.</p>
        </div>
      `,
    });
  } catch {
    // Never log the raw SMTP error — it can embed credentials/connection
    // details. The caller (passwordReset.ts) falls back to the
    // admin-assisted flow on this error, same as "not configured".
    throw new EmailSendError("فشل إرسال البريد الإلكتروني");
  }
}
