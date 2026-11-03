/**
 * SC-VTU  Airtime, data and electricity, paid per purchase (no wallet).
 *
 * The order of events, and the rules that protect the money:
 *  1. The customer's choice is checked and PRICED HERE from the provider's list. The browser's price is never used.
 *  2. A pending order is saved, then Paystack is started with that order's own reference.
 *  3. After payment we ask Paystack (not the browser) whether it succeeded, for the right amount, for this order.
 *  4. Only then do we buy from the provider, once, with our unique reference. A claim in the database makes sure
 *     two requests (return page + webhook) cannot both buy.
 *  5. Success: show the result (and the token for electricity). Failed: refund through Paystack and track it.
 *     Pending or unknown: we ask the provider again before ever trying to buy again.
 */
import crypto from "node:crypto";
import { config } from "../config";
import { VtuOrder } from "../models/VtuOrder";
import { VtuSetting } from "../models/VtuSetting";
import { VtuPlan } from "../models/VtuPlan";
import { initializeTransaction, verifyTransaction } from "./paystackService";
import { getProvider } from "./vtu";
import { NETWORKS, type BuyResult, type DataPlan, type VtuProvider } from "./vtu/provider";

export class VtuError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const VTU_PREFIX = "SC-VTU-";
export const isVtuReference = (r: unknown) => typeof r === "string" && r.startsWith(VTU_PREFIX);
const roundUp10 = (n: number) => Math.ceil(n / 10) * 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getSettings(): Promise<any> {
  const s: any = await (VtuSetting as any).findOne({ key: "main" });
  return s ?? (await (VtuSetting as any).create({ key: "main" }));
}

export async function updateSettings(patch: any) {
  const s: any = await getSettings();
  const num = (k: string, lo: number, hi: number) => {
    if (patch[k] === undefined) return;
    const v = Number(patch[k]);
    if (!Number.isFinite(v) || v < lo || v > hi) throw new VtuError(400, `${k} must be between ${lo} and ${hi}.`);
    s[k] = v;
  };
  num("airtimeDiscountPct", 0, 20); num("dataMarginPct", 0, 50); num("electricityFee", 0, 2000);
  num("airtimeMin", 50, 1000); num("airtimeMax", 100, 100000); num("electricityMin", 500, 50000); num("electricityMax", 1000, 500000);
  if (patch.paused !== undefined) s.paused = Boolean(patch.paused);
  const list = (k: string) => { if (Array.isArray(patch[k])) s[k] = patch[k].map(String).slice(0, 50); };
  list("disabledNetworks"); list("disabledDiscos");
  await s.save();
  return s;
}

export async function status() {
  const p = getProvider();
  const s = await getSettings();
  return { enabled: Boolean(p) && !s.paused, simulated: Boolean(p?.simulated), services: { airtime: true, data: true, electricity: true, tv: false } };
}

function need(): VtuProvider {
  const p = getProvider();
  if (!p) throw new VtuError(503, "Recharge is not available right now. Please try again later.");
  return p;
}

export const normPhone = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  const n = d.startsWith("234") ? "0" + d.slice(3) : d;
  return /^0\d{10}$/.test(n) ? n : "";
};

export function customerPrice(plan: DataPlan, s: any) {
  return roundUp10(plan.cost * (1 + s.dataMarginPct / 100));
}

/** The owner's own price for a plan if one is set, otherwise the percentage rule. */
export function priceFor(plan: DataPlan, s: any, ov?: any) {
  return ov && ov.customPrice != null ? Math.round(ov.customPrice) : customerPrice(plan, s);
}

async function overrides(network?: string): Promise<Map<string, any>> {
  const rows: any[] = await (VtuPlan as any).find(network ? { network } : {}).lean();
  return new Map(rows.map((r) => [r.code, r]));
}

export async function catalog() {
  const p = getProvider();
  const s = await getSettings();
  return {
    enabled: Boolean(p) && !s.paused, simulated: Boolean(p?.simulated),
    networks: NETWORKS.filter((n) => !(s.disabledNetworks ?? []).includes(n)),
    airtime: { min: s.airtimeMin, max: s.airtimeMax },
    electricity: { min: s.electricityMin, max: s.electricityMax, fee: s.electricityFee, discos: p ? (await p.discos()).filter((d) => !(s.disabledDiscos ?? []).includes(d.code)) : [] },
  };
}

export async function dataPlans(network: string) {
  const p = need();
  if (!NETWORKS.includes(network as any)) throw new VtuError(400, "Choose a network.");
  const s = await getSettings();
  if ((s.disabledNetworks ?? []).includes(network)) return [];
  const plans = await p.listDataPlans(network);
  const ov = await overrides(network);
  return plans
    .filter((x) => !ov.get(x.code)?.hidden)
    .map((x) => ({ code: x.code, name: ov.get(x.code)?.label || x.name, validity: x.validity, category: x.category, price: priceFor(x, s, ov.get(x.code)) }));
}

export async function verifyMeter(disco: string, type: string, meter: string) {
  const p = need();
  const s = await getSettings();
  if (!(await p.discos()).some((d) => d.code === disco) || (s.disabledDiscos ?? []).includes(disco)) throw new VtuError(400, "Choose your electricity company.");
  if (type !== "prepaid" && type !== "postpaid") throw new VtuError(400, "Choose prepaid or postpaid.");
  return p.verifyMeter({ disco, type, meter: String(meter ?? "").replace(/\D/g, "") });
}

export interface CreateInput {
  service: string; network?: string; phone?: string; planCode?: string; amount?: number;
  disco?: string; meterType?: string; meter?: string; email?: string; userId?: string;
}

/** Validates and prices the request on the server, saves a pending order, starts Paystack. */
export async function createOrder(i: CreateInput) {
  const p = need();
  const s = await getSettings();
  if (s.paused) throw new VtuError(503, "Recharge is paused for a short while. Please try again later.");
  const email = String(i.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new VtuError(400, "Enter your email so we can send the payment receipt from Paystack.");

  const base: any = { reference: VTU_PREFIX + crypto.randomBytes(5).toString("hex").toUpperCase(), service: i.service, email, userId: i.userId ?? "" };
  if (i.service === "airtime" || i.service === "data") {
    const phone = normPhone(i.phone);
    if (!phone) throw new VtuError(400, "Enter the phone number that will receive it (11 digits).");
    if (!NETWORKS.includes(i.network as any) || (s.disabledNetworks ?? []).includes(i.network)) throw new VtuError(400, "Choose a network.");
    base.phoneNumber = phone; base.network = i.network; base.networkName = i.network;
    if (i.service === "airtime") {
      const amt = Math.round(Number(i.amount));
      if (!Number.isFinite(amt) || amt < s.airtimeMin || amt > s.airtimeMax) throw new VtuError(400, `Airtime must be between ₦${s.airtimeMin} and ₦${s.airtimeMax.toLocaleString("en-NG")}.`);
      base.amount = amt; base.faceValue = amt; base.cost = round2(amt * (1 - s.airtimeDiscountPct / 100)); base.planName = `₦${amt.toLocaleString("en-NG")} airtime`;
    } else {
      const plan = (await p.listDataPlans(i.network!)).find((x) => x.code === i.planCode);
      const ov: any = plan ? await (VtuPlan as any).findOne({ code: plan.code }) : null;
      if (!plan || ov?.hidden) throw new VtuError(400, "Choose a data plan.");
      base.planCode = plan.code; base.planName = ov?.label || plan.name; base.cost = plan.cost; base.amount = priceFor(plan, s, ov); base.faceValue = base.amount;
    }
  } else if (i.service === "electricity") {
    const disco = (await p.discos()).find((d) => d.code === i.disco && !(s.disabledDiscos ?? []).includes(d.code));
    if (!disco) throw new VtuError(400, "Choose your electricity company.");
    const type = i.meterType === "postpaid" ? "postpaid" : i.meterType === "prepaid" ? "prepaid" : "";
    if (!type) throw new VtuError(400, "Choose prepaid or postpaid.");
    const meter = String(i.meter ?? "").replace(/\D/g, "");
    const v = await p.verifyMeter({ disco: disco.code, type, meter });
    if (!v.ok) throw new VtuError(400, v.message || "We could not verify that meter.");
    const amt = Math.round(Number(i.amount));
    if (!Number.isFinite(amt) || amt < s.electricityMin || amt > s.electricityMax) throw new VtuError(400, `Electricity must be between ₦${s.electricityMin.toLocaleString("en-NG")} and ₦${s.electricityMax.toLocaleString("en-NG")}.`);
    const phone = normPhone(i.phone);
    base.network = disco.code; base.networkName = disco.name; base.phoneNumber = phone;
    base.meter = { number: meter, type, name: v.name ?? "", address: v.address ?? "" };
    base.faceValue = amt; base.cost = amt; base.amount = amt + s.electricityFee; base.planName = `${type} electricity`;
  } else {
    throw new VtuError(400, "That service is not available yet.");
  }

  const order: any = await (VtuOrder as any).create(base);
  try {
    const init = await initializeTransaction({
      email, amountKobo: Math.round(order.amount * 100), reference: order.reference,
      callbackUrl: `${config.siteUrl}/pay/result?reference=${order.reference}`,
      metadata: { vtu: true, reference: order.reference, service: order.service },
    });
    return { reference: order.reference, amount: order.amount, authorizationUrl: init.authorization_url };
  } catch (e: any) {
    await (VtuOrder as any).findOneAndUpdate({ reference: order.reference }, { $set: { paymentStatus: "failed", providerMessage: "Could not start payment" } });
    throw new VtuError(502, "We could not start the payment. Please try again.");
  }
}

/** Asks Paystack. Idempotent: the return page, the webhook and a refresh can all call it safely. */
export async function confirmPayment(reference: string) {
  const order: any = await (VtuOrder as any).findOne({ reference });
  if (!order) throw new VtuError(404, "We could not find that purchase.");
  if (order.paymentStatus === "pending") {
    const v = await verifyTransaction(reference);
    if (v.status === "success") {
      const right = Math.round(order.amount * 100) === Number(v.amount) && (!v.currency || v.currency === "NGN") && v.reference === reference;
      if (!right) {
        await (VtuOrder as any).findOneAndUpdate({ reference, paymentStatus: "pending" }, { $set: { paymentStatus: "mismatch", providerMessage: `Paid ${v.amount} kobo, expected ${Math.round(order.amount * 100)}` } });
        console.error(`[vtu] payment mismatch on ${reference}`);
      } else {
        await (VtuOrder as any).findOneAndUpdate({ reference, paymentStatus: "pending" }, { $set: { paymentStatus: "paid", paymentReference: reference, paidAt: new Date() } });
      }
    } else if (v.status === "failed") {
      await (VtuOrder as any).findOneAndUpdate({ reference, paymentStatus: "pending" }, { $set: { paymentStatus: "failed" } });
    }
  }
  return fulfil(reference);
}

const apply = async (reference: string, r: BuyResult) => {
  if (r.status === "success") {
    await (VtuOrder as any).findOneAndUpdate({ reference }, { $set: { fulfilmentStatus: "successful", providerReference: r.providerReference ?? "", providerMessage: r.message ?? "", token: r.token ?? "", units: r.units ?? "", ...(r.cost ? { cost: r.cost } : {}) } });
  } else if (r.status === "failed") {
    await (VtuOrder as any).findOneAndUpdate({ reference }, { $set: { fulfilmentStatus: "failed", providerReference: r.providerReference ?? "", providerMessage: r.message ?? "Failed", refundStatus: "required" } });
  } else {
    await (VtuOrder as any).findOneAndUpdate({ reference }, { $set: { fulfilmentStatus: "processing", providerReference: r.providerReference ?? "", providerMessage: r.message ?? "Processing" } });
  }
};

/** Buys from the provider once. Only a paid order whose fulfilment has not started can be claimed. */
export async function fulfil(reference: string) {
  const claimed: any = await (VtuOrder as any).findOneAndUpdate(
    { reference, paymentStatus: "paid", fulfilmentStatus: "pending" },
    { $set: { fulfilmentStatus: "processing" }, $inc: { attempts: 1 } },
    { new: true },
  );
  if (claimed) {
    const p = need();
    try {
      const r = await p.buy({
        reference, service: claimed.service, network: claimed.network, phone: claimed.phoneNumber, planCode: claimed.planCode,
        amount: claimed.faceValue, meter: claimed.meter?.number ? { number: claimed.meter.number, type: claimed.meter.type } : undefined,
      });
      await apply(reference, r);
    } catch (e: any) {
      // We do not know if the provider bought it. Stay "processing" and ask the provider later. Never buy again.
      await (VtuOrder as any).findOneAndUpdate({ reference }, { $set: { fulfilmentStatus: "processing", providerMessage: "No answer from the provider yet. We are checking." } });
    }
    const after: any = await (VtuOrder as any).findOne({ reference });
    if (after.refundStatus === "required") await refund(reference);
  }
  return (VtuOrder as any).findOne({ reference });
}

/** Asks the provider what happened to a purchase that is still processing. Never buys again. */
export async function checkStatus(reference: string) {
  const o: any = await (VtuOrder as any).findOne({ reference });
  if (!o) throw new VtuError(404, "We could not find that purchase.");
  if (o.paymentStatus === "pending") return confirmPayment(reference);
  if (o.paymentStatus === "paid" && o.fulfilmentStatus === "processing") {
    const r = await need().query(reference);
    if (r.status === "not_found") {
      await (VtuOrder as any).findOneAndUpdate({ reference }, { $set: { providerMessage: "The provider has no record of this purchase yet. Ask the admin to check." } });
    } else {
      await apply(reference, r);
      const after: any = await (VtuOrder as any).findOne({ reference });
      if (after.refundStatus === "required") await refund(reference);
    }
  }
  return (VtuOrder as any).findOne({ reference });
}

/** Paystack refund call. Replaceable in tests. */
export const refundHook: { call: (reference: string) => Promise<{ ok: boolean; message?: string }> } = {
  async call(reference) {
    if (!config.paystack.secretKey) return { ok: false, message: "Paystack key missing" };
    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST", headers: { Authorization: `Bearer ${config.paystack.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: reference }), signal: AbortSignal.timeout(20000),
    });
    const j: any = await res.json().catch(() => ({}));
    return { ok: res.ok && j?.status !== false, message: j?.message };
  },
};

/** Refund a failed purchase (once). Also used by the admin's "Retry refund". */
export async function refund(reference: string) {
  const claimed: any = await (VtuOrder as any).findOneAndUpdate(
    { reference, paymentStatus: "paid", fulfilmentStatus: "failed", refundStatus: { $in: ["required", "failed"] } },
    { $set: { refundStatus: "refund_requested", refundNote: "Refund sent to Paystack." } },
    { new: true },
  );
  if (!claimed) return (VtuOrder as any).findOne({ reference });
  let r: { ok: boolean; message?: string };
  try { r = await refundHook.call(reference); } catch (e: any) { r = { ok: false, message: e?.message }; }
  if (!r.ok) await (VtuOrder as any).findOneAndUpdate({ reference }, { $set: { refundStatus: "failed", refundNote: `Refund did not go through: ${r.message ?? "unknown"}. Refund by hand in Paystack, then press Mark refunded.` } });
  return (VtuOrder as any).findOne({ reference });
}

export async function markRefunded(reference: string, note?: string) {
  const o: any = await (VtuOrder as any).findOneAndUpdate(
    { reference, fulfilmentStatus: "failed", refundStatus: { $in: ["required", "failed", "refund_requested"] } },
    { $set: { refundStatus: "refunded", refundNote: note || "Refunded by hand." } }, { new: true });
  if (!o) throw new VtuError(409, "This purchase is not waiting for a refund.");
  return o;
}

/** Admin: the provider confirms it never delivered, so treat it as failed and refund. */
export async function markFailed(reference: string) {
  const o: any = await (VtuOrder as any).findOneAndUpdate(
    { reference, paymentStatus: "paid", fulfilmentStatus: "processing" },
    { $set: { fulfilmentStatus: "failed", refundStatus: "required", providerMessage: "Marked failed by admin." } }, { new: true });
  if (!o) throw new VtuError(409, "Only a purchase that is still processing can be marked failed.");
  return refund(reference);
}

/** What the customer may see. No cost, no margin. */
export function publicView(o: any) {
  const done = o.fulfilmentStatus === "successful";
  return {
    reference: o.reference, service: o.service, network: o.networkName || o.network, planName: o.planName, phone: o.phoneNumber,
    meter: o.meter?.number ? { number: o.meter.number, type: o.meter.type, name: o.meter.name } : null,
    amount: o.amount, paymentStatus: o.paymentStatus, fulfilmentStatus: o.fulfilmentStatus,
    token: done ? o.token : "", units: done ? o.units : "", message: o.providerMessage,
    refundStatus: o.refundStatus, createdAt: o.createdAt,
  };
}

/** Called by the Paystack webhook. A reference we do not know is logged, not retried forever. */
export async function handleWebhookCharge(reference: string) {
  try {
    await confirmPayment(reference);
  } catch (e) {
    if (e instanceof VtuError) { console.error(`[vtu] webhook for ${reference}: ${e.message}`); return; }
    throw e; // a real failure: let Paystack send it again
  }
}


// ---------------- Admin: plans and prices (SC-VTU3) ----------------

/** Every plan the provider offers for a network, with the owner's settings on top. Plans we saved that the provider no longer has show as "missing". */
export async function adminPlans(network: string) {
  if (!NETWORKS.includes(network as any)) throw new VtuError(400, "Choose a network.");
  const p = getProvider();
  const s = await getSettings();
  const ov = await overrides(network);
  const live = p ? await p.listDataPlans(network) : [];
  const seen = new Set<string>();
  const rows = live.map((x) => {
    seen.add(x.code);
    const o = ov.get(x.code);
    const rule = customerPrice(x, s);
    const price = priceFor(x, s, o);
    return { code: x.code, name: x.name, label: o?.label ?? "", validity: x.validity, category: x.category, cost: x.cost, rulePrice: rule, customPrice: o?.customPrice ?? null, price, profit: price - x.cost, hidden: Boolean(o?.hidden), missing: false, belowCost: price < x.cost };
  });
  for (const [code, o] of ov) if (!seen.has(code)) rows.push({ code, name: o.label || code, label: o.label ?? "", validity: "", category: "weekly", cost: 0, rulePrice: 0, customPrice: o.customPrice ?? null, price: o.customPrice ?? 0, profit: 0, hidden: true, missing: true, belowCost: false });
  return { network, networkOn: !(s.disabledNetworks ?? []).includes(network), plans: rows };
}

export async function setPlan(code: string, patch: any) {
  const network = String(code).split("-")[0];
  if (!NETWORKS.includes(network as any)) throw new VtuError(400, "Unknown plan.");
  const set: any = { network };
  if (patch.customPrice !== undefined) {
    if (patch.customPrice === null || patch.customPrice === "") set.customPrice = null;
    else {
      const v = Math.round(Number(patch.customPrice));
      if (!Number.isFinite(v) || v < 10 || v > 500000) throw new VtuError(400, "Price must be between ₦10 and ₦500,000.");
      set.customPrice = v;
    }
  }
  if (patch.hidden !== undefined) set.hidden = Boolean(patch.hidden);
  if (patch.label !== undefined) set.label = String(patch.label ?? "").trim().slice(0, 60);
  const row = await (VtuPlan as any).findOneAndUpdate({ code }, { $set: set }, { new: true, upsert: true });
  return row;
}

export async function resetPlan(code: string) {
  await (VtuPlan as any).deleteMany({ code });
}


/** Admin: the owner saw on the provider's dashboard that this purchase WAS delivered, so close it as successful (no refund). */
export async function markDelivered(reference: string, note?: string) {
  const o: any = await (VtuOrder as any).findOneAndUpdate(
    { reference, paymentStatus: "paid", fulfilmentStatus: "processing" },
    { $set: { fulfilmentStatus: "successful", providerMessage: note ? `Confirmed delivered by admin: ${note}` : "Confirmed delivered by admin." } }, { new: true });
  if (!o) throw new VtuError(409, "Only a purchase that is still processing can be marked delivered.");
  return o;
}
