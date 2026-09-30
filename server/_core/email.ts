// Real outbound transactional email — currently used only for the
// self-service "forgot password" flow (server/routers/auth.ts). Works with
// any standard SMTP account (a self-hosted mail server, or a real
// provider's SMTP credentials — Gmail app password, SendGrid, Mailgun,
// Resend, etc.); nothing provider-specific is hardcoded, same posture as
// the WhatsApp/S3/payment-provider abstractions elsewhere in this app.
//
// Until SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM are all set, sendEmail()
// is a safe, logged no-op — it never throws, so a misconfigured or absent
// SMTP setup can never break the request that triggered it (matching
// notifyAdminOfPendingRegistration's WhatsApp-send posture in
// whatsappBot.ts).

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { ENV } from "./env";

export function isEmailConfigured(): boolean {
  return Boolean(
    ENV.smtpHost && ENV.smtpUser && ENV.smtpPass && ENV.smtpFrom
  );
}

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
  });
  return _transporter;
}

/** Never throws — returns whether the message was actually handed to the SMTP server. */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) {
    // eslint-disable-next-line no-console
    console.warn(
      `[email] SMTP not configured — skipped sending "${input.subject}" to ${input.to}`
    );
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: ENV.smtpFrom,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[email] Failed to send "${input.subject}" to ${input.to}:`, error);
    return false;
  }
}
