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

/**
 * Returns the commission row if one was created, otherwise null.
 * Reasons for null: no code, unknown code, Reseller not approved, self-referral,
 * or an error (logged only).
 */
export async function attachReferral(order: any, refCode: unknown) {
  try {
    if (typeof refCode !== "string") return null;
    const code = refCode.trim().toUpperCase();
    if (!/^SC\d{4,8}$/.test(code)) return null;

    const Reseller = await Reseller.findOne({ ResellerCode: code, status: "approved" })
      .select("phone whatsapp email ResellerCode")
      .lean();
    if (!Reseller) return null;

    // Self-referral protection: the buyer must not be the Reseller.
    const shipping = order.shipping ?? {};
    const buyerPhone = tail(shipping.phone ?? order.phone);
    const buyerEmail = String(shipping.email ?? order.email ?? "").trim().toLowerCase();
    const ResellerPhones = [tail(Reseller.phone), tail(Reseller.whatsapp)];
    if (buyerPhone && ResellerPhones.includes(buyerPhone)) return null;
    if (buyerEmail && buyerEmail === String(Reseller.email).toLowerCase()) return null;

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
    if (amount <= 0) return null;
    const rate = Math.round((amount / base) * 1000) / 10;

    // unique orderId makes this safe if it ever runs twice for one order
    return await Commission.findOneAndUpdate(
      { orderId: order._id },
      {
        $setOnInsert: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          ResellerId: Reseller._id,
          ResellerCode: Reseller.ResellerCode,
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
  } catch (err) {
    console.error("attachReferral failed (order was still created):", err);
    return null;
  }
}
