/**
 * Email alert to you when a customer starts a chat or writes again.
 * Non-throwing and skipped when email isn't configured (same as emailService).
 */

import { Resend } from "resend";
import { config } from "../config";

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );

export async function sendChatAlert(args: {
  name: string;
  phone?: string;
  text: string;
  isNew: boolean;
}): Promise<void> {
  if (!resend || !config.resend.adminNotify) return;
  try {
    const subject = args.isNew
      ? `💬 New chat from ${args.name}`
      : `💬 ${args.name} sent a new message`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px">
      <h2 style="margin:0 0 12px">${esc(subject)}</h2>
      <p style="margin:0 0 6px;color:#555">Phone: ${esc(args.phone || "not given")}</p>
      <blockquote style="margin:12px 0;padding:10px 14px;background:#f5f5f5;border-left:4px solid #FFD700">${esc(args.text)}</blockquote>
      <p><a href="${config.siteUrl}/admin/chats" style="background:#FFD700;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Open chats</a></p>
    </div>`;
    const result = await resend.emails.send({
      from: config.resend.from,
      to: config.resend.adminNotify,
      subject,
      html,
    });
    if (result.error) console.error("❌ Chat alert error:", result.error.message);
  } catch (err: any) {
    console.error("❌ Chat alert threw:", err?.message ?? err);
  }
}
