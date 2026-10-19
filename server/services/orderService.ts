/**
 * Order service — business logic for orders.
 *
 * NEW: buildItemSnapshots reads the customer's selectedVariants per cart
 * item, looks up the alternative names from the combo, and saves a
 * human-readable summary like "Casio Watch · Bluetooth Audio Glasses · Premium Bracelet"
 * onto the order item. Admin sees exactly what to ship.
 *
 * UPDATED: Added Free Gift validation logic (₦40,000 threshold check and 1 gift max).
 * UPDATED: The threshold counts what the same phone number already spent in the
 * last 30 days (see giftProgress.ts), and free gifts can come from the Gift Bank.
 */

import { Order, OrderItemSnapshot, ShippingAddress, PaymentMethod, OrderStatus } from "../models/Order";
import { Combo } from "../models/Combo";
import { Gift } from "../models/Gift";
import { GIFT_THRESHOLD, getPriorSpend, normalizePhone } from "./giftProgress";
import { SiteSettings } from "../models/SiteSettings";
import { nextSeq } from "../models/Counter";
import { config } from "../config";
import { verifyTransaction, PaystackError } from "./paystackService";
import {
  sendOrderPlaced,
  sendPaymentConfirmed,
  sendOrderShipped,
  sendOrderDelivered,
  sendNewOrderAdminAlert,
} from "./emailService";

interface CartItem {
  comboId: string;
  quantity: number;
  selectedVariants?: Record<string, string>;
  isFreeGift?: boolean;
}

export interface CreateOrderInput {
  items: CartItem[];
  shipping: ShippingAddress;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export class OrderError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSeq(`order:${year}`);
  return `SC-${year}-${String(seq).padStart(6, "0")}`;
}

/** Flat delivery fee for customers in Ilorin. Everywhere else Jumia sets the price and the customer pays Jumia directly. */
export const LOCAL_DELIVERY_FEE = 1000;

async function calculateShippingFee(
  _paymentMethod: PaymentMethod,
  city: string,
): Promise<number> {
  const settings = await SiteSettings.findOne().lean();
  const localCities = (settings?.shipping?.codCities ?? ["ilorin"]).map((c: string) => c.toLowerCase());
  const cityLower = city.trim().toLowerCase();
  return localCities.includes(cityLower) ? LOCAL_DELIVERY_FEE : 0;
}

/**
 * Builds a human-readable summary of what the customer picked for each slot.
 * Example: "Casio Watch · Bluetooth Audio Glasses · Premium Bracelet"
 */
function buildVariantSummary(
  combo: any,
  selectedVariants: Record<string, string> | undefined,
): string {
  return (combo.items ?? [])
    .map((item: any) => {
      const chosenId = selectedVariants?.[item.id];
      if (!chosenId) return item.name; // default
      const alt = (item.alternatives ?? []).find((a: any) => a.id === chosenId);
      return alt ? alt.name : item.name;
    })
    .join(" · ");
}

async function buildItemSnapshots(
  items: CartItem[],
  priorSpend = 0,
): Promise<OrderItemSnapshot[]> {
  if (!items?.length) {
    throw new OrderError(400, "EMPTY_CART", "Order has no items");
  }

  // Pass 1: Calculate subtotal from paid items only
  let paidSubtotal = 0;
  const freeGiftItems = items.filter((it) => it.isFreeGift);

  if (freeGiftItems.length > 1) {
    throw new OrderError(400, "INVALID_GIFT", "Only 1 free gift is allowed per order");
  }

  for (const cartItem of items) {
    if (!cartItem.isFreeGift) {
      if (!cartItem.comboId) {
        throw new OrderError(400, "INVALID_ITEM", "Item missing combo reference");
      }

      const combo = await Combo.findById(cartItem.comboId);
      if (combo && combo.isActive) {
        paidSubtotal += combo.totalPrice * cartItem.quantity;
      }
    }
  }

  // Validate threshold if a free gift is attached
  // Earlier paid spending by the same phone number counts too.
  const giftUnlocked = paidSubtotal + priorSpend >= GIFT_THRESHOLD;
  if (freeGiftItems.length === 1 && !giftUnlocked) {
    throw new OrderError(
      400,
      "GIFT_THRESHOLD_NOT_MET",
      "Your spending (this order plus the last 30 days) must reach ₦40,000 to qualify for a free gift",
    );
  }

  const snapshots: OrderItemSnapshot[] = [];

  // Pass 2: Build snapshot objects
  for (const cartItem of items) {
    if (!cartItem.comboId) {
      throw new OrderError(400, "INVALID_ITEM", "Item missing combo reference");
    }
    if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1 || cartItem.quantity > 20) {
      throw new OrderError(400, "INVALID_ITEM", "Item quantity must be a whole number from 1 to 20");
    }

    // Free gifts normally come from the Gift Bank
    if (cartItem.isFreeGift) {
      const gift: any = await Gift.findById(cartItem.comboId).catch(() => null);
      if (gift) {
        if (gift.isActive === false || (gift.stock ?? 0) < 1) {
          throw new OrderError(409, "INSUFFICIENT_STOCK", `${gift.name} is no longer available`);
        }
        snapshots.push({
          comboId: gift._id,
          slug: `gift-${gift._id}`,
          name: `[FREE GIFT] ${gift.name}`,
          tagline: gift.description ?? "",
          thumbnailUrl: gift.images?.[0] || gift.image || "",
          unitPrice: 0,
          quantity: 1,
          subtotal: 0,
          selectedVariants: {},
          variantSummary: "",
          isFreeGift: true,
        });
        continue;
      }
    }

    const combo = await Combo.findById(cartItem.comboId);
    if (!combo) {
      throw new OrderError(404, "COMBO_NOT_FOUND", `Combo not found: ${cartItem.comboId}`);
    }
    if (!combo.isActive) {
      throw new OrderError(400, "COMBO_INACTIVE", `${combo.name} is no longer available`);
    }
    if (combo.stockLeft < cartItem.quantity) {
      throw new OrderError(
        409,
        "INSUFFICIENT_STOCK",
        `Only ${combo.stockLeft} of ${combo.name} available`,
      );
    }

    const isFree = Boolean(cartItem.isFreeGift && giftUnlocked);

    // Ensure the combo itself is eligible to be a free gift candidate
    if (isFree && !combo.isFreeGiftCandidate && combo.totalPrice > 5000) {
      throw new OrderError(
        400,
        "INELIGIBLE_FREE_GIFT",
        `${combo.name} is not eligible as a free gift`,
      );
    }

    const unitPrice = isFree ? 0 : combo.totalPrice;
    const subtotal = unitPrice * cartItem.quantity;

    const thumbnailUrl = combo.items?.[0]?.images?.[0]?.url ?? "";
    const variantSummary = buildVariantSummary(combo, cartItem.selectedVariants);

    snapshots.push({
      comboId: combo._id,
      slug: combo.slug,
      name: isFree ? `[FREE GIFT] ${combo.name}` : combo.name,
      tagline: combo.tagline,
      thumbnailUrl,
      unitPrice,
      quantity: isFree ? 1 : cartItem.quantity,
      subtotal,
      selectedVariants: cartItem.selectedVariants ?? {},
      variantSummary,
      isFreeGift: isFree,
    });
  }

  return snapshots;
}

/** Takes one item's stock. Says where it came from, or throws if sold out. */
async function takeStockForItem(item: OrderItemSnapshot): Promise<"gift" | "combo"> {
  // Gift Bank gifts have their own stock
  if (item.isFreeGift) {
    const gift = await Gift.findOneAndUpdate(
      { _id: item.comboId, stock: { $gte: 1 } },
      { $inc: { stock: -1 } },
    );
    if (gift) return "gift";
  }
  const updated = await Combo.findOneAndUpdate(
    { _id: item.comboId, stockLeft: { $gte: item.quantity } },
    { $inc: { stockLeft: -item.quantity } },
  );
  if (!updated) {
    throw new OrderError(409, "INSUFFICIENT_STOCK", `${item.name} sold out before checkout`);
  }
  return "combo";
}

async function giveStockBackForItem(item: OrderItemSnapshot, kind?: "gift" | "combo"): Promise<void> {
  if (kind === "combo") {
    await Combo.updateOne({ _id: item.comboId }, { $inc: { stockLeft: item.quantity } });
    return;
  }
  if (kind === "gift" || item.isFreeGift) {
    const r = await Gift.updateOne({ _id: item.comboId }, { $inc: { stock: 1 } });
    if (r.matchedCount > 0) return;
  }
  await Combo.updateOne({ _id: item.comboId }, { $inc: { stockLeft: item.quantity } });
}

/** All-or-nothing: if any item is sold out, everything already taken is put back. */
async function decrementStock(items: OrderItemSnapshot[]): Promise<void> {
  const taken: Array<{ item: OrderItemSnapshot; kind: "gift" | "combo" }> = [];
  try {
    for (const item of items) {
      const kind = await takeStockForItem(item);
      taken.push({ item, kind });
    }
  } catch (err) {
    for (const t of taken) {
      await giveStockBackForItem(t.item, t.kind).catch((e) =>
        console.error("Stock rollback failed:", e),
      );
    }
    throw err;
  }
}

function buildEmailContext(order: any) {
  return {
    orderNumber: order.orderNumber,
    customerName: order.shipping.fullName,
    customerEmail: order.shipping.email,
    total: order.total,
    items: order.items.map((it: any) => ({
      name: it.variantSummary || it.name,
      quantity: it.quantity,
      subtotal: it.subtotal,
    })),
    shippingAddress: {
      fullName: order.shipping.fullName,
      street: order.shipping.street,
      city: order.shipping.city,
      state: order.shipping.state,
      phone: order.shipping.phone,
    },
    paymentMethod: order.paymentMethod,
    trackingUrl: `${config.siteUrl}/order-tracking?order=${encodeURIComponent(order.orderNumber)}`,
  };
}

export async function createOrder(input: CreateOrderInput) {
  const phoneKey = normalizePhone(input.shipping.phone);
  const priorSpend = await getPriorSpend(phoneKey);
  const items = await buildItemSnapshots(input.items, priorSpend);

  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const shippingFee = await calculateShippingFee(
    input.paymentMethod,
    input.shipping.city,
  );
  const total = subtotal + shippingFee;

  const orderNumber = await generateOrderNumber();

  await decrementStock(items);

  const initialStatus: OrderStatus =
    input.paymentMethod === "cod" ? "processing" : "pending";

  let order;
  try {
    order = await Order.create({
      orderNumber,
      items,
      subtotal,
      shippingFee,
      total,
      status: initialStatus,
      paymentMethod: input.paymentMethod,
      shipping: input.shipping,
      phoneKey,
      notes: input.notes,
    });
  } catch (err) {
    // The order could not be saved: put the stock back so nothing is lost.
    for (const item of items) {
      await giveStockBackForItem(item).catch((e) => console.error("Stock rollback failed:", e));
    }
    throw err;
  }

  const ctx = buildEmailContext(order);
  sendOrderPlaced(ctx).catch(() => {});
  sendNewOrderAdminAlert(ctx).catch(() => {});

  return order;
}

export async function findByNumberAndPhone(orderNumber: string, phone: string) {
  const order = await Order.findOne({
    orderNumber: orderNumber.trim().toUpperCase(),
    "shipping.phone": phone.trim(),
  }).lean();
  return order;
}

export async function findByOrderNumber(orderNumber: string) {
  return Order.findOne({ orderNumber: orderNumber.trim().toUpperCase() });
}

/**
 * A Paystack payment only counts for an order when the reference was started for THAT order,
 * the payment succeeded, and the amount paid equals the order total (in kobo).
 * Without this check a customer could pay a small amount and have a big order marked paid.
 */
export function paymentMatchesOrder(
  order: { orderNumber: string; total: number },
  v: { status: string; amount: number; currency?: string },
  reference: string,
): boolean {
  return (
    v.status === "success" &&
    v.amount === Math.round(order.total * 100) &&
    (!v.currency || v.currency === "NGN") &&
    reference.startsWith(`${order.orderNumber}-`)
  );
}

export async function markOrderPaid(
  orderNumber: string,
  paymentReference: string,
): Promise<any> {
  const number = orderNumber.trim().toUpperCase();

  // Atomic claim: only ONE caller (webhook, return-redirect or admin) can flip
  // pending -> paid, so emails are never doubled.
  const claimed = await Order.findOneAndUpdate(
    { orderNumber: number, status: "pending" },
    { $set: { status: "paid", paidAt: new Date(), paymentReference } },
    { new: true },
  );
  if (claimed) {
    sendPaymentConfirmed(buildEmailContext(claimed)).catch(() => {});
    return claimed;
  }

  const order = await Order.findOne({ orderNumber: number });
  if (!order) return null;

  // Customer paid AFTER the order was auto-cancelled: take the stock again if it is still there.
  if (order.status === "cancelled" && order.stockRestored) {
    const revived = await Order.findOneAndUpdate(
      { orderNumber: number, status: "cancelled", stockRestored: true },
      { $set: { status: "paid", paidAt: new Date(), paymentReference, stockRestored: false } },
      { new: true },
    );
    if (revived) {
      try {
        await decrementStock(revived.items as any);
      } catch {
        revived.stockRestored = true;
        revived.adminNotes =
          `${revived.adminNotes ? revived.adminNotes + "\n" : ""}LATE PAYMENT: customer paid after the order was cancelled and an item is now out of stock. Ship when restocked or refund on Paystack.`;
        await revived.save();
      }
      sendPaymentConfirmed(buildEmailContext(revived)).catch(() => {});
      return revived;
    }
  }

  // Already paid / processing / shipped / delivered / refunded: nothing to redo
  if (!order.paymentReference && order.status !== "cancelled") {
    order.paymentReference = paymentReference;
    await order.save();
  }
  return order;
}

/**
 * Cancels or refunds an order and gives its stock back, exactly once.
 *  - cancelled: always puts stock back (if not already).
 *  - refunded : puts stock back only if the order had not shipped yet
 *               (shipped/delivered refunds mean goods come back - adjust stock by hand after checking them).
 */
export async function cancelOrRefundOrder(
  orderNumber: string,
  newStatus: "cancelled" | "refunded",
  note?: string,
): Promise<any> {
  const number = orderNumber.trim().toUpperCase();
  const current = await Order.findOne({ orderNumber: number });
  if (!current) return null;

  const wasShipped = current.status === "shipped" || current.status === "delivered";
  const shouldRestock = newStatus === "cancelled" || !wasShipped;
  const noteLine = note ? `${current.adminNotes ? current.adminNotes + "\n" : ""}${note}` : undefined;

  if (shouldRestock) {
    const claimed = await Order.findOneAndUpdate(
      { orderNumber: number, stockRestored: { $ne: true }, status: { $nin: ["cancelled", "refunded"] } },
      { $set: { status: newStatus, stockRestored: true, ...(noteLine ? { adminNotes: noteLine } : {}) } },
      { new: true },
    );
    if (claimed) {
      for (const item of claimed.items as any[]) {
        await giveStockBackForItem(item).catch((e) => console.error("Restock failed:", e));
      }
      return claimed;
    }
  }

  // Already cancelled/refunded (or no restock wanted): only the label changes
  return Order.findOneAndUpdate(
    { orderNumber: number },
    { $set: { status: newStatus, ...(noteLine ? { adminNotes: noteLine } : {}) } },
    { new: true },
  );
}

/**
 * Cancels Paystack orders that were never paid so abandoned checkouts do not
 * lock stock. Before cancelling, it asks Paystack whether the customer actually paid.
 */
export async function expireStalePendingOrders(maxAgeMinutes = 180): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const stale = await Order.find({
    status: "pending",
    paymentMethod: { $in: ["paystack", "flutterwave"] },
    createdAt: { $lt: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(50);

  let cancelled = 0;
  for (const order of stale) {
    try {
      const refs: string[] = (order as any).paystackRefs ?? [];
      let verdict: "paid" | "unpaid" | "unknown" = "unknown";
      if (refs.length === 0) {
        verdict = "unpaid"; // customer never reached the Paystack page
      } else {
        let paid = false;
        let unsure = false;
        for (const ref of refs) {
          try {
            const v = await verifyTransaction(ref);
            if (paymentMatchesOrder(order, v, ref)) {
              await markOrderPaid(order.orderNumber, ref);
              paid = true;
              break;
            }
            if (v.status === "success") {
              console.error(`[expire] ${order.orderNumber}: paid amount ${v.amount} does not match total, left pending for review`);
              unsure = true;
            }
          } catch (err) {
            // 404 = Paystack has no such payment (never started); anything else = could not check, so do not cancel
            if (!(err instanceof PaystackError && err.status === 404)) unsure = true;
          }
        }
        verdict = paid ? "paid" : unsure ? "unknown" : "unpaid";
      }

      if (verdict === "unpaid") {
        await cancelOrRefundOrder(
          order.orderNumber,
          "cancelled",
          "Auto-cancelled: payment was not completed in time. Stock returned.",
        );
        cancelled++;
      }
    } catch (err) {
      console.error(`[expire] ${order.orderNumber} failed:`, err);
    }
  }
  return cancelled;
}

export async function markOrderShipped(
  orderNumber: string,
  trackingNumber?: string,
  trackingProviderUrl?: string,
): Promise<any> {
  const order = await Order.findOne({
    orderNumber: orderNumber.trim().toUpperCase(),
  });
  if (!order) return null;

  order.status = "shipped";
  order.shippedAt = new Date();
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (trackingProviderUrl) order.trackingProviderUrl = trackingProviderUrl;
  await order.save();

  const ctx = buildEmailContext(order);
  sendOrderShipped({ ...ctx, trackingNumber, trackingProviderUrl }).catch(() => {});

  return order;
}

export async function markOrderDelivered(orderNumber: string): Promise<any> {
  const order = await Order.findOne({
    orderNumber: orderNumber.trim().toUpperCase(),
  });
  if (!order) return null;

  order.status = "delivered";
  order.deliveredAt = new Date();
  await order.save();

  sendOrderDelivered(buildEmailContext(order)).catch(() => {});

  return order;
}