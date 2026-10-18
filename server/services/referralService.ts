/**
 * Referral + commission logic.  Destination: server/services/referralService.ts
 *
 * attachReferral(order, refCode)  -> called right after an order is created.
 *   Never throws: a referral problem must never stop a customer from ordering.
 * commissionStatus(order, c)      -> pending | approved | paid | cancelled.
 */

import { Reseller } from "../models/Reseller";
import { Commission, getProgramSettings } from "../models/Commission";
import { Combo } from "../models/Combo";
import { Order } from "../models/Order";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
/** 08012345678 and +2348012345678 both become 8012345678 */
const tail = (v: unknown) => digits(v).slice(-10);

export function commissionStatus(
  order: { status?: string; deliveredAt?: Date | string | null },
  commission: { holdDays: number; paidAt?: Date | null },
  now: Date = new Date(),
): CommissionStatus {
  if (order.status === "cancelled" || order.status === "refunded") return "cancelled";
  if (commission.paidAt) return "paid";
  if (order.status === "delivered" && order.deliveredAt) {
    const releaseAt = new Date(order.deliveredAt).getTime() + commission.holdDays * DAY_MS;
    if (now.getTime() >= releaseAt) return "approved";
  }
  return "pending";
}

export interface PayoutCycle {
  /** Delivery date of the first successful order in the partner's current payout week */
  startedAt: Date;
  /** When everything delivered so far becomes withdrawable together */
  releaseAt: Date;
}

/**
 * Weekly payout cycle per partner.
 *  - A cycle starts when the partner's first delivered order (not yet paid or requested) is delivered.
 *  - holdDays later, EVERY delivered order of that partner becomes Approved at the same moment,
 *    including orders delivered during the week.
 *  - Once those are paid (or requested), the next delivered order starts a new cycle.
 * Cancelled / refunded orders never count. Orders not yet delivered stay Pending.
 */
export async function resolveCommissionStatuses(resellerIds: unknown[], now: Date = new Date()) {
  const statusById = new Map<string, CommissionStatus>();
  const cycleByReseller = new Map<string, PayoutCycle | null>();
  // Ignore rows with a missing/invalid partner id (e.g. leftover test data) instead of crashing the whole list
  const ids = [...new Set(resellerIds.filter((x) => x != null).map(String))].filter((x) => /^[a-f0-9]{24}$/i.test(x));
  if (ids.length === 0) return { statusById, cycleByReseller };

  const commissions: any[] = await Commission.find({ resellerId: { $in: ids } }).lean();
  const orders: any[] = await Order.find({ _id: { $in: commissions.map((c) => c.orderId) } })
    .select("status deliveredAt")
    .lean();
  const orderById = new Map(orders.map((o) => [String(o._id), o]));
  const isDelivered = (o: any) => o?.status === "delivered" && !!o?.deliveredAt;

  for (const rid of ids) {
    const mine = commissions.filter((c) => String(c.resellerId) === rid);
    let first: { at: number; holdDays: number } | null = null;
    for (const c of mine) {
      const o = orderById.get(String(c.orderId));
      if (c.paidAt || c.withdrawalId || o?.status === "cancelled" || o?.status === "refunded" || !isDelivered(o)) continue;
      const at = new Date(o.deliveredAt).getTime();
      if (!first || at < first.at) first = { at, holdDays: c.holdDays };
    }
    const cycle: PayoutCycle | null = first
      ? { startedAt: new Date(first.at), releaseAt: new Date(first.at + first.holdDays * DAY_MS) }
      : null;
    cycleByReseller.set(rid, cycle);

    for (const c of mine) {
      const o = orderById.get(String(c.orderId)) ?? {};
      let st: CommissionStatus;
      if (o.status === "cancelled" || o.status === "refunded") st = "cancelled";
      else if (c.paidAt) st = "paid";
      else if (c.withdrawalId) st = "approved"; // released and sitting in a withdrawal request
      else if (isDelivered(o) && cycle && now.getTime() >= cycle.releaseAt.getTime()) st = "approved";
      else st = "pending";
      statusById.set(String(c._id), st);
    }
  }
  return { statusById, cycleByReseller };
}

/**
 * Returns the commission row if one was created, otherwise null.
 * Reasons for null: no code, unknown code, reseller not approved, self-referral,
 * or an error (logged only).
 */
/** Logs why no commission was created, so a skipped referral is easy to explain. */
function skip(reason: string) {
  console.log("[referral] no commission:", reason);
  return null;
}

export async function attachReferral(order: any, refCode: unknown) {
  try {
    if (typeof refCode !== "string") return skip("no ref code sent");
    const code = refCode.trim().toUpperCase();
    if (!/^SC\d{4,8}$/.test(code)) return skip("ref code format not valid (expected SC + digits)");

    const reseller = await Reseller.findOne({ resellerCode: code, status: "approved" })
      .select("phone whatsapp email resellerCode")
      .lean();
    if (!reseller) return skip("no APPROVED partner has this code");

    // Self-referral protection: the buyer must not be the reseller.
    const shipping = order.shipping ?? {};
    const buyerPhone = tail(shipping.phone ?? order.phone);
    const buyerEmail = String(shipping.email ?? order.email ?? "").trim().toLowerCase();
    const resellerPhones = [tail(reseller.phone), tail(reseller.whatsapp)];
    if (buyerPhone && resellerPhones.includes(buyerPhone)) return skip("self-referral: buyer phone matches the partner");
    if (buyerEmail && buyerEmail === String(reseller.email).toLowerCase()) return skip("self-referral: buyer email matches the partner");

    const { comboPercent, singlePercent, holdDays } = await getProgramSettings();

    // Product price only (delivery excluded). Combos (2+ items) and single products
    // (1 item) earn different percentages. Free gifts have a subtotal of 0, so they earn nothing.
    let comboBase = 0;
    let singleBase = 0;
    for (const it of order.items ?? []) {
      const lineTotal = Number(it.subtotal) || 0;
      if (lineTotal <= 0) continue;
      const combo = await Combo.findById(it.comboId).select("items").lean();
      if ((combo?.items?.length ?? 1) > 1) comboBase += lineTotal;
      else singleBase += lineTotal;
    }
    const base = comboBase + singleBase;
    const amount = Math.round(
      (comboBase * comboPercent + singleBase * singlePercent) / 100,
    );
    if (amount <= 0) return skip("commission amount is 0");
    const rate = Math.round((amount / base) * 1000) / 10;

    // unique orderId makes this safe if it ever runs twice for one order
    const created = await Commission.findOneAndUpdate(
      { orderId: order._id },
      {
        $setOnInsert: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          resellerId: reseller._id,
          resellerCode: reseller.resellerCode,
          base,
          rate,
          comboBase,
          comboRate: comboPercent,
          singleBase,
          singleRate: singlePercent,
          holdDays,
          amount,
        },
      },
      { new: true, upsert: true },
    );
    console.log(`[referral] commission saved: ${order.orderNumber} -> ${reseller.resellerCode}, NGN ${amount}`);
    return created;
  } catch (err) {
    console.error("attachReferral failed (order was still created):", err);
    return null;
  }
}
