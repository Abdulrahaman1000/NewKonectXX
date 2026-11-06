/**
 * SC-WALLET  The Smart Combo wallet: money a signed-in customer adds through Paystack and spends on Smart Combo.
 * It is spend-only. There is no withdrawal and no transfer to anyone else (see Terms 6d).
 *
 * The rules that protect the money:
 *  - Every movement has a unique reference. A reference can be applied ONCE, whatever happens (double click, webhook + return page, retry).
 *  - Applying a movement is ONE database operation that changes the balance and records the reference together.
 *  - A debit only happens if the balance covers it, in the same operation. The balance can never go below zero.
 *  - A top-up is credited only after we ask Paystack (not the browser) and the status, amount, currency and reference all match.
 */
import crypto from "node:crypto";
import { config } from "../config";
import { Wallet } from "../models/Wallet";
import { WalletFunding } from "../models/WalletFunding";
import { Customer } from "../models/Customer";
import { initializeTransaction, verifyTransaction } from "./paystackService";

export class WalletError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export const WALLET_PREFIX = "SC-WAL-";
export const isWalletReference = (r: unknown) => typeof r === "string" && r.startsWith(WALLET_PREFIX);
export const MIN_FUND = 100; // naira. No maximum.
const KEEP = 300; // history entries kept on the wallet
export const toKobo = (naira: number) => Math.round(Number(naira) * 100);
const toNaira = (kobo: number) => Math.round(Number(kobo ?? 0)) / 100;

export type WalletKind = "fund" | "spend" | "refund" | "referral" | "bonus" | "adjust";
const LABEL: Record<string, string> = {
  fund: "Wallet funded", spend: "Paid for a purchase", refund: "Refund", referral: "Referral earnings", bonus: "Bonus from Smart Combo", adjust: "Adjustment by Smart Combo",
};

async function ensure(customerId: string, email = "") {
  try {
    await (Wallet as any).findOneAndUpdate({ customerId }, { $setOnInsert: { customerId, email, balance: 0, refs: [], txs: [] } }, { upsert: true });
  } catch (e: any) {
    if (e?.code !== 11000) throw e; // two requests created it at the same moment: fine, it exists now
  }
}

const entry = (ref: string, kind: string, kobo: number, note: string, orderRef: string) => ({ ref, kind, amount: kobo, note: note || LABEL[kind] || "", orderRef, at: new Date() });

/** Adds money. Safe to repeat: the same reference is applied once. */
export async function credit(customerId: string, kobo: number, ref: string, kind: WalletKind, note = "", orderRef = ""): Promise<{ applied: boolean; balance: number }> {
  if (!customerId || !ref) throw new WalletError(400, "Missing wallet details.");
  if (!Number.isInteger(kobo) || kobo <= 0) throw new WalletError(400, "The amount must be more than zero.");
  await ensure(customerId);
  const doc: any = await (Wallet as any).findOneAndUpdate(
    { customerId, refs: { $ne: ref } },
    { $inc: { balance: kobo }, $push: { refs: ref, txs: { $each: [entry(ref, kind, kobo, note, orderRef)], $slice: -KEEP } } },
    { new: true },
  );
  if (doc) return { applied: true, balance: doc.balance };
  const cur: any = await (Wallet as any).findOne({ customerId }).lean();
  return { applied: false, balance: cur?.balance ?? 0 };
}

/** Takes money, only if the balance covers it. Safe to repeat: the same reference is taken once. */
export async function debit(customerId: string, kobo: number, ref: string, kind: WalletKind, note = "", orderRef = ""): Promise<{ ok: boolean; applied: boolean; balance: number; reason?: "insufficient" }> {
  if (!customerId || !ref) throw new WalletError(400, "Missing wallet details.");
  if (!Number.isInteger(kobo) || kobo <= 0) throw new WalletError(400, "The amount must be more than zero.");
  await ensure(customerId);
  const doc: any = await (Wallet as any).findOneAndUpdate(
    { customerId, refs: { $ne: ref }, balance: { $gte: kobo } },
    { $inc: { balance: -kobo }, $push: { refs: ref, txs: { $each: [entry(ref, kind, -kobo, note, orderRef)], $slice: -KEEP } } },
    { new: true },
  );
  if (doc) return { ok: true, applied: true, balance: doc.balance };
  const cur: any = await (Wallet as any).findOne({ customerId }).lean();
  if ((cur?.refs ?? []).includes(ref)) return { ok: true, applied: false, balance: cur.balance }; // this purchase was already paid from the wallet
  return { ok: false, applied: false, balance: cur?.balance ?? 0, reason: "insufficient" };
}

/** True if this reference was already applied to the customer's wallet. */
export async function hasRef(customerId: string, ref: string): Promise<boolean> {
  const cur: any = await (Wallet as any).findOne({ customerId }).lean();
  return Boolean(cur && (cur.refs ?? []).includes(ref));
}

const publicTx = (t: any) => ({ ref: t.ref, kind: t.kind, amount: toNaira(t.amount), note: t.note || LABEL[t.kind] || "", orderRef: t.orderRef || "", at: t.at });

export async function getWallet(customerId: string) {
  await ensure(customerId);
  const w: any = await (Wallet as any).findOne({ customerId }).lean();
  const txs: any[] = [...(w?.txs ?? [])].reverse().slice(0, 100);
  return { balance: toNaira(w?.balance ?? 0), history: txs.map(publicTx) };
}

// ---------------- Funding through Paystack ----------------

export async function startFunding(customer: any, amountRaw: unknown) {
  const amount = Math.round(Number(amountRaw));
  if (!Number.isFinite(amount) || amount < MIN_FUND) throw new WalletError(400, `The smallest top-up is ₦${MIN_FUND.toLocaleString("en-NG")}.`);
  if (amount > 1_000_000_000) throw new WalletError(400, "That amount is too large. Please check it.");
  const reference = WALLET_PREFIX + crypto.randomBytes(5).toString("hex").toUpperCase();
  const customerId = String(customer._id);
  await (WalletFunding as any).create({ reference, customerId, email: customer.email, amount });
  try {
    const init = await initializeTransaction({
      email: customer.email, amountKobo: toKobo(amount), reference,
      callbackUrl: `${config.siteUrl}/wallet?funding=${reference}`,
      metadata: { wallet: true, reference },
    });
    return { reference, amount, authorizationUrl: init.authorization_url };
  } catch {
    await (WalletFunding as any).findOneAndUpdate({ reference }, { $set: { status: "failed", note: "Could not start payment" } });
    throw new WalletError(502, "We could not start the payment. Please try again.");
  }
}

/** Asks Paystack. Safe to repeat: the return page, the webhook and a refresh can all call it. */
export async function confirmFunding(reference: string, customerId?: string) {
  const f: any = await (WalletFunding as any).findOne({ reference });
  if (!f || (customerId && f.customerId !== customerId)) throw new WalletError(404, "We could not find that top-up.");
  if (f.status === "pending") {
    const v: any = await verifyTransaction(reference);
    if (v.status === "success") {
      const right = toKobo(f.amount) === Number(v.amount) && (!v.currency || v.currency === "NGN") && v.reference === reference;
      await (WalletFunding as any).findOneAndUpdate(
        { reference, status: "pending" },
        { $set: right ? { status: "paid", paidAt: new Date() } : { status: "mismatch", note: `Paid ${v.amount} kobo, expected ${toKobo(f.amount)}` } },
      );
      if (!right) console.error(`[wallet] top-up mismatch on ${reference}`);
    } else if (v.status === "failed") {
      await (WalletFunding as any).findOneAndUpdate({ reference, status: "pending" }, { $set: { status: "failed" } });
    }
  }
  const g: any = await (WalletFunding as any).findOne({ reference });
  if (g.status === "paid") await credit(g.customerId, toKobo(g.amount), "FUND:" + reference, "fund", "Wallet funded"); // once only, even if repeated
  const w = await getWallet(g.customerId);
  return { reference, status: g.status as string, amount: g.amount as number, balance: w.balance };
}

/** Called by the Paystack webhook. */
export async function handleWebhookCharge(reference: string) {
  try {
    await confirmFunding(reference);
  } catch (e) {
    if (e instanceof WalletError) { console.error(`[wallet] webhook for ${reference}: ${e.message}`); return; }
    throw e; // a real failure: let Paystack send it again
  }
}

// ---------------- Owner tools ----------------

/** Owner: add referral earnings or a bonus, or correct a balance. `reference` makes a repeat harmless (for example PARTNER:SC1234:2026-W45). */
export async function adminAdjust(i: { email: string; amount: number; kind: string; note?: string; reference?: string }) {
  const email = String(i.email ?? "").trim().toLowerCase();
  const c: any = await (Customer as any).findOne({ email });
  if (!c) throw new WalletError(404, "No customer account has that email. They need to sign in once first.");
  const kind = (["referral", "bonus", "adjust"].includes(i.kind) ? i.kind : "") as WalletKind;
  if (!kind) throw new WalletError(400, "Choose referral earnings, bonus or adjustment.");
  const naira = Number(i.amount);
  if (!Number.isFinite(naira) || naira === 0 || Math.abs(naira) > 100_000_000) throw new WalletError(400, "Enter an amount in naira.");
  if (naira < 0 && kind !== "adjust") throw new WalletError(400, "Only an adjustment can take money out.");
  const kobo = toKobo(Math.abs(naira));
  const note = String(i.note ?? "").trim().slice(0, 80);
  const ref = i.reference ? "EXT:" + String(i.reference).trim().slice(0, 80) : "ADM:" + crypto.randomBytes(6).toString("hex");
  const customerId = String(c._id);
  if (naira > 0) {
    const r = await credit(customerId, kobo, ref, kind, note ? `${LABEL[kind]}: ${note}` : "");
    return { applied: r.applied, balance: toNaira(r.balance), email };
  }
  const r = await debit(customerId, kobo, ref, "adjust", note ? `${LABEL.adjust}: ${note}` : "");
  if (!r.ok) throw new WalletError(409, `That is more than the wallet holds (₦${toNaira(r.balance).toLocaleString("en-NG")}).`);
  return { applied: r.applied, balance: toNaira(r.balance), email };
}

export async function adminSummary(search = "") {
  const rows: any[] = await (Wallet as any).find({}).select("customerId balance email").lean();
  const cs: any[] = await (Customer as any).find({ _id: { $in: rows.map((w) => w.customerId) } }).lean();
  const emailOf = new Map<string, string>(cs.map((c) => [String(c._id), String(c.email ?? "")]));
  const q = String(search).trim().toLowerCase();
  const total = rows.reduce((s, w) => s + (w.balance ?? 0), 0);
  const list = rows
    .map((w) => ({ customerId: String(w.customerId), email: emailOf.get(String(w.customerId)) || w.email || "", balance: w.balance ?? 0 }))
    .filter((w) => !q || w.email.toLowerCase().includes(q))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 100)
    .map((w) => ({ ...w, balance: toNaira(w.balance) }));
  return { totalOwed: toNaira(total), wallets: rows.length, withBalance: rows.filter((w) => (w.balance ?? 0) > 0).length, list };
}

export async function adminHistory(customerId: string) {
  const w: any = await (Wallet as any).findOne({ customerId }).lean();
  if (!w) throw new WalletError(404, "No wallet for that customer.");
  const c: any = await (Customer as any).findById(customerId).lean().catch(() => null);
  return { customerId, email: c?.email || w.email || "", balance: toNaira(w.balance ?? 0), history: [...(w.txs ?? [])].reverse().map(publicTx) };
}
