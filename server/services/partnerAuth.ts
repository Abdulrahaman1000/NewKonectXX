/**
 * Partner login helpers. Destination: server/services/partnerAuth.ts
 * Tokens are signed with HMAC and carry typ "partner". They are NOT in the admin JWT format,
 * so the admin requireAuth middleware rejects them, and requirePartner rejects admin tokens.
 * Optional: set PARTNER_TOKEN_SECRET in your env file. Falls back to JWT_SECRET.
 */
import { createHmac, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { Reseller } from "../models/Reseller";

const scrypt = promisify(scryptCb);
const SECRET = process.env.PARTNER_TOKEN_SECRET || process.env.JWT_SECRET || "dev-only-change-me";
if (process.env.NODE_ENV === "production" && SECRET === "dev-only-change-me") {
  // Refuse to run with a guessable secret: anyone could forge a partner login.
  throw new Error("Set PARTNER_TOKEN_SECRET (or JWT_SECRET) in the server environment before running in production.");
}
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("base64url");

export function signPartnerToken(partnerId: string): string {
  const body = b64(JSON.stringify({ sub: partnerId, typ: "partner", exp: Date.now() + TTL_MS }));
  return `${body}.${sign(body)}`;
}

export function readPartnerToken(token: string): string | null {
  const [body, sig] = String(token ?? "").split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (p.typ !== "partner" || !p.sub || Date.now() > Number(p.exp)) return null;
    return String(p.sub);
  } catch {
    return null;
  }
}

/** Loads the approved partner into req.partner, or answers 401/403. */
export async function requirePartner(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const id = readPartnerToken(header.startsWith("Bearer ") ? header.slice(7) : "");
  if (!id) return res.status(401).json({ error: "Please log in again." });
  try {
    const partner = await Reseller.findById(id).lean();
    if (!partner) return res.status(401).json({ error: "Please log in again." });
    if (partner.status !== "approved") return res.status(403).json({ error: "Your partner account is not active." });
    (req as any).partner = partner;
    next();
  } catch {
    res.status(500).json({ error: "Something went wrong." });
  }
}
