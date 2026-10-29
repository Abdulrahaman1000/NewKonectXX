/**
 * SC-ACCT  Customer sign-in by emailed code. No passwords.
 *  - A code lasts 10 minutes, 5 wrong tries kill it, one code per 45 seconds, 6 per hour per email.
 *  - Customer tokens are signed with a different secret from admin tokens, so a customer token can never open the admin.
 *  - Without RESEND_API_KEY (or on your laptop) the code is printed in the server window instead of emailed.
 */
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { config } from "../config";
import { Customer } from "../models/Customer";
import { LoginCode } from "../models/LoginCode";
import { normalizePhone } from "./giftProgress";

export const CODE_MINUTES = 10;
export const MAX_TRIES = 5;
export const RESEND_GAP_SECONDS = 45;
export const MAX_PER_HOUR = 6;

const SECRET = () => `${config.jwtSecret}:customer`;
const hash = (email: string, code: string) => crypto.createHmac("sha256", SECRET()).update(`${email}:${code}`).digest("hex");

export const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();
export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120;

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function sendCode(email: string, code: string) {
  const dev = process.env.NODE_ENV !== "production";
  if (dev || !config.resend.apiKey) console.log(`🔑 Smart Combo login code for ${email}: ${code}`);
  if (!config.resend.apiKey) return;
  try {
    const resend = new Resend(config.resend.apiKey);
    const r: any = await resend.emails.send({
      from: config.resend.from,
      to: email,
      subject: `Your Smart Combo code is ${code}`,
      text: `Your Smart Combo sign-in code is ${code}. It works for ${CODE_MINUTES} minutes. If you did not ask for it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px"><h2 style="margin:0 0 12px">Smart Combo</h2><p>Your sign-in code is</p><p style="font-size:34px;font-weight:800;letter-spacing:6px;margin:8px 0">${code}</p><p style="color:#666">It works for ${CODE_MINUTES} minutes. If you did not ask for it, ignore this email.</p></div>`,
    });
    if (r?.error) console.error("[account] Resend refused the login email:", r.error?.message ?? r.error);
  } catch (e: any) {
    console.error("[account] login email failed:", e?.message ?? e);
  }
}

export async function requestCode(emailRaw: unknown, now = new Date()) {
  const email = cleanEmail(emailRaw);
  if (!validEmail(email)) throw new AuthError(400, "Please enter a valid email address.");
  const recent: any[] = await (LoginCode as any).find({ email, createdAt: { $gte: new Date(now.getTime() - 3_600_000) } }).sort({ createdAt: -1 }).lean();
  if (recent.length >= MAX_PER_HOUR) throw new AuthError(429, "Too many codes asked for. Please try again in an hour.");
  if (recent[0] && now.getTime() - new Date(recent[0].createdAt).getTime() < RESEND_GAP_SECONDS * 1000) {
    throw new AuthError(429, `Please wait ${RESEND_GAP_SECONDS} seconds before asking for another code.`);
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await (LoginCode as any).create({ email, codeHash: hash(email, code), expiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000), createdAt: now });
  await sendCode(email, code);
  return { sent: true, minutes: CODE_MINUTES };
}

export function publicCustomer(c: any) {
  return { id: String(c._id), email: c.email, name: c.name || "", phone: c.phone || "", needsProfile: !c.name || !c.phone };
}

export function signCustomerToken(c: any) {
  return jwt.sign({ cid: String(c._id), kind: "customer" }, SECRET(), { expiresIn: "60d" });
}

export async function verifyCode(emailRaw: unknown, codeRaw: unknown, now = new Date()) {
  const email = cleanEmail(emailRaw);
  const code = String(codeRaw ?? "").replace(/\D/g, "");
  if (!validEmail(email) || code.length !== 6) throw new AuthError(400, "Enter the 6-digit code from your email.");
  const row: any = await (LoginCode as any).findOne({ email, expiresAt: { $gt: now } }).sort({ createdAt: -1 });
  if (!row) throw new AuthError(400, "That code has expired. Ask for a new one.");
  if (row.attempts >= MAX_TRIES) throw new AuthError(429, "Too many wrong tries. Ask for a new code.");
  const a = Buffer.from(hash(email, code));
  const b = Buffer.from(row.codeHash);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    row.attempts += 1;
    await row.save();
    throw new AuthError(400, "That code is not right. Check it and try again.");
  }
  await (LoginCode as any).deleteMany({ email });
  let customer: any = await (Customer as any).findOne({ email });
  if (!customer) customer = await (Customer as any).create({ email });
  customer.lastLoginAt = now;
  await customer.save();
  return { token: signCustomerToken(customer), customer: publicCustomer(customer) };
}

export async function customerFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const p: any = jwt.verify(token, SECRET());
    if (p?.kind !== "customer" || !p.cid) return null;
    return await (Customer as any).findById(p.cid);
  } catch {
    return null;
  }
}

export async function saveProfile(customer: any, nameRaw: unknown, phoneRaw: unknown) {
  const name = String(nameRaw ?? "").trim().slice(0, 80);
  const phone = String(phoneRaw ?? "").trim().slice(0, 20);
  const key = normalizePhone(phone);
  if (name.length < 2) throw new AuthError(400, "Please enter your name.");
  if (!key || key.length < 10) throw new AuthError(400, "Please enter a valid phone number.");
  customer.name = name;
  customer.phone = phone;
  customer.phoneKey = key;
  await customer.save();
  return publicCustomer(customer);
}
