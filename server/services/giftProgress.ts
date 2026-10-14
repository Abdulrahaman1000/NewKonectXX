/**
 * Free-gift progress: spending adds up per customer, identified by phone number.
 *
 * Rules (decided with the shop owner):
 *  - A customer unlocks the free gift when what they spent in the last 30 days
 *    plus the current order reaches GIFT_THRESHOLD.
 *  - An order counts once it is paid. Cash on delivery counts once delivered.
 *    Cancelled and refunded orders never count.
 *  - After a gift is given, the total starts again from zero.
 */

import { Order } from "../models/Order";

export const GIFT_THRESHOLD = 40000;
export const GIFT_WINDOW_DAYS = 30;

/** 0803 123 4567, +234 803 123 4567 and 2348031234567 all become 8031234567. */
export function normalizePhone(phone: unknown): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];

/** Spending that still counts toward the next gift for this phone number. */
export async function getPriorSpend(phoneKey: string): Promise<number> {
  if (!phoneKey || phoneKey.length < 10) return 0;

  const since = new Date(Date.now() - GIFT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // The last order that carried a gift is the reset point.
  const lastGift = await Order.findOne({
    phoneKey,
    createdAt: { $gte: since },
    status: { $nin: ["cancelled", "refunded"] },
    "items.isFreeGift": true,
  })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  const createdAt: Record<string, Date> = { $gte: since };
  if (lastGift?.createdAt) createdAt.$gt = new Date(lastGift.createdAt);

  const orders = await Order.find({
    phoneKey,
    createdAt,
    $or: [
      { paymentMethod: { $ne: "cod" }, status: { $in: PAID_STATUSES } },
      { paymentMethod: "cod", status: "delivered" },
    ],
  })
    .select("subtotal")
    .lean();

  return orders.reduce((sum, o) => sum + (o.subtotal ?? 0), 0);
}
