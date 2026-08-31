import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { env } from "../env";

/**
 * Enquiry email delivery.
 *
 * Two transports behind one function:
 *  - SMTP through nodemailer when SMTP_HOST is configured (the production path).
 *  - A local outbox directory otherwise, which writes each message to a .eml file.
 *
 * The outbox is not a stub that pretends to work: it exists because an enquiry must be
 * observable end to end with nothing configured, and because a mail failure must never be
 * the reason a lead is lost. The enquiry itself is always written to the database first —
 * see lib/enquiries/actions.ts — so email is a notification, never the record.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export type MailOutcome =
  | { ok: true; transport: "smtp" | "outbox"; detail: string }
  | { ok: false; transport: "smtp" | "outbox"; error: string };

export function isSmtpConfigured(): boolean {
  return Boolean(env.smtp.host && env.enquiryRecipient && env.mailFrom);
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

async function sendViaSmtp(message: MailMessage): Promise<MailOutcome> {
  try {
    // Imported lazily so nodemailer is not pulled in when SMTP is not configured.
    const { createTransport } = await import("nodemailer");
    const transporter = createTransport({
      host: env.smtp.host!,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    });

    const info = await transporter.sendMail({
      from: env.mailFrom,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { ok: true, transport: "smtp", detail: info.messageId ?? "sent" };
  } catch (error) {
    return {
      ok: false,
      transport: "smtp",
      error: error instanceof Error ? error.message : "Unknown SMTP error",
    };
  }
}

function sendViaOutbox(message: MailMessage): MailOutcome {
  try {
    const dir = resolve(process.cwd(), env.mailOutbox);
    mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = join(dir, `${stamp}-${Math.random().toString(36).slice(2, 8)}.eml`);

    const eml = [
      `Date: ${new Date().toUTCString()}`,
      `From: ${env.mailFrom || "no-reply@localhost"}`,
      `To: ${message.to}`,
      message.replyTo ? `Reply-To: ${message.replyTo}` : null,
      `Subject: ${message.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "",
      message.text,
    ]
      .filter((line) => line !== null)
      .join("\r\n");

    writeFileSync(file, eml, "utf8");
    return { ok: true, transport: "outbox", detail: file };
  } catch (error) {
    return {
      ok: false,
      transport: "outbox",
      error: error instanceof Error ? error.message : "Could not write to the outbox",
    };
  }
}

export async function sendMail(message: MailMessage): Promise<MailOutcome> {
  return isSmtpConfigured() ? sendViaSmtp(message) : sendViaOutbox(message);
}

export interface EnquiryEmailInput {
  reference: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  gemTitle: string;
  gemReference: string;
  gemUrl: string;
}

/**
 * Builds the notification the dealer receives. Every gem detail in here comes from the
 * database record, never from the submitted form, so a forged title cannot appear in it.
 */
export function buildEnquiryEmail(input: EnquiryEmailInput): MailMessage {
  const lines = [
    `New enquiry ${input.reference}`,
    "",
    `Stone:      ${input.gemTitle} (${input.gemReference})`,
    `Link:       ${input.gemUrl}`,
    "",
    `From:       ${input.name}`,
    `Email:      ${input.email}`,
    `Phone:      ${input.phone || "—"}`,
    "",
    "Message:",
    input.message,
    "",
    "— Reply directly to this email to answer the buyer.",
  ];
  const text = lines.join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#14171a">
  <h2 style="margin:0 0 4px">New enquiry ${escapeHtml(input.reference)}</h2>
  <p style="margin:0 0 16px;color:#6b7280">
    ${escapeHtml(input.gemTitle)} · ${escapeHtml(input.gemReference)}
  </p>
  <table style="border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:2px 12px 2px 0;color:#6b7280">From</td><td>${escapeHtml(input.name)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#6b7280">Email</td><td><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#6b7280">Phone</td><td>${escapeHtml(input.phone || "—")}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#6b7280">Stone</td><td><a href="${escapeHtml(input.gemUrl)}">${escapeHtml(input.gemUrl)}</a></td></tr>
  </table>
  <p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(input.message)}</p>
  <p style="color:#6b7280;font-size:13px;margin:0">Reply directly to this email to answer the buyer.</p>
</div>`;

  return {
    to: env.enquiryRecipient || "enquiries@localhost",
    subject: `Enquiry ${input.reference} — ${input.gemTitle} (${input.gemReference})`,
    text,
    html,
    // So hitting Reply in the mail client answers the buyer, not the server.
    replyTo: input.email,
  };
}
