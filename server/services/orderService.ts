/**
 * Order service — business logic for orders.
 *
 * NEW: buildItemSnapshots reads the customer's selectedVariants per cart
 * item, looks up the alternative names from the combo, and saves a
 * human-readable summary like "Casio Watch · Bluetooth Audio Glasses · Premium Bracelet"
 * onto the order item. Admin sees exactly what to ship.
 *
 * UPDATED: Added Free Gift validation logic (₦40,000 threshold check and 1 gift max).
 */

import { Order, OrderItemSnapshot, ShippingAddress, PaymentMethod, OrderStatus } from "../models/Order";
import { Combo } from "../models/Combo";
import { SiteSettings } from "../models/SiteSettings";
import { nextSeq } from "../models/Counter";
import { config } from "../config";
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

async function calculateShippingFee(
  paymentMethod: PaymentMethod,
  city: string,
): Promise<number> {
  const settings = await SiteSettings.findOne().lean();
  if (!settings) return 0;

  const cityLower = city.trim().toLowerCase();
  const codCities = (settings.shipping?.codCities ?? []).map((c) =>
    c.toLowerCase(),
  );

  if (paymentMethod === "cod" && codCities.includes(cityLower)) {
    return 0;
  }

  return settings.shipping?.standardFee ?? 0;
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

async function buildItemSnapshots(items: CartItem[]): Promise<OrderItemSnapshot[]> {
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
  if (freeGiftItems.length === 1 && paidSubtotal < 40000) {
    throw new OrderError(
      400,
      "GIFT_THRESHOLD_NOT_MET",
      "Paid items total must be at least ₦40,000 to qualify for a free gift",
    );
  }

  const snapshots: OrderItemSnapshot[] = [];

  // Pass 2: Build snapshot objects
  for (const cartItem of items) {
    if (!cartItem.comboId) {
      throw new OrderError(400, "INVALID_ITEM", "Item missing combo reference");
    }
    if (!cartItem.quantity || cartItem.quantity < 1) {
      throw new OrderError(400, "INVALID_ITEM", "Item quantity must be at least 1");
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

    const isFree = Boolean(cartItem.isFreeGift && paidSubtotal >= 40000);

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

async function decrementStock(items: OrderItemSnapshot[]): Promise<void> {
  for (const item of items) {
    const updated = await Combo.findOneAndUpdate(
      { _id: item.comboId, stockLeft: { $gte: item.quantity } },
      { $inc: { stockLeft: -item.quantity } },
    );
    if (!updated) {
      throw new OrderError(
        409,
        "INSUFFICIENT_STOCK",
        `${item.name} sold out before checkout`,
      );
    }
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
  const items = await buildItemSnapshots(input.items);

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

  const order = await Order.create({
    orderNumber,
    items,
    subtotal,
    shippingFee,
    total,
    status: initialStatus,
    paymentMethod: input.paymentMethod,
    shipping: input.shipping,
    notes: input.notes,
  });

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

export async function markOrderPaid(
  orderNumber: string,
  paymentReference: string,
): Promise<any> {
  const order = await Order.findOne({
    orderNumber: orderNumber.trim().toUpperCase(),
  });
  if (!order) return null;

  if (
    order.status === "paid" ||
    order.status === "processing" ||
    order.status === "shipped" ||
    order.status === "delivered"
  ) {
    if (!order.paymentReference) {
      order.paymentReference = paymentReference;
      await order.save();
    }
    return order;
  }

  order.status = "paid";
  order.paidAt = new Date();
  order.paymentReference = paymentReference;
  await order.save();

  sendPaymentConfirmed(buildEmailContext(order)).catch(() => {});

  return order;
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