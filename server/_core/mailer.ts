// Outgoing email (password reset codes). Any SMTP provider works — set
// SMTP_URL (e.g. smtps://user:password@smtp.example.com:465) and MAIL_FROM
// in the host's secrets. Without SMTP_URL nothing is sent: in development the
// message is printed to the server console so the flow can be tried locally;
// in production a warning is logged and the caller carries on (the student
// can still ask an admin to reset the password).
import nodemailer, { type Transporter } from "nodemailer";
import { addUsage } from "../db/usage";
import { ENV } from "./env";

export type Mail = { to: string; subject: string; text: string };

/** Tests replace the transport to read what would have been sent. */
let testOutbox: Mail[] | null = null;
export function captureMailForTests(): Mail[] {
  testOutbox = [];
  return testOutbox;
}

let transport: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL);
}

function getTransport(): Transporter {
  if (!transport) {
    const url = new URL(process.env.SMTP_URL!);
    transport = nodemailer.createTransport({
      host: url.hostname,
      port: Number(url.port) || (url.protocol === "smtps:" ? 465 : 587),
      secure: url.protocol === "smtps:",
      auth: url.username ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) } : undefined,
      // A slow provider must not hold anything up: give up after 15 s.
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transport;
}

/** Sends a plain-text email. Never throws; false when nothing was sent. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (testOutbox) {
    testOutbox.push(mail);
    return true;
  }
  if (!isMailConfigured()) {
    if (ENV.isProduction) {
      console.warn("[mail] SMTP_URL is not set: email not sent (", mail.subject, ")");
    } else {
      console.info(`[mail:dev] to ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
    }
    return false;
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || "Tafawoq <no-reply@localhost>",
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    await addUsage("email_sent");
    return true;
  } catch (error) {
    await addUsage("email_failed");
    console.warn("[mail] sending failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
