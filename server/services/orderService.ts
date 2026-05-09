/**
 * Order service — business logic for orders.
 */

import { Order, OrderItemSnapshot, ShippingAddress, PaymentMethod, OrderStatus } from "../models/Order";
import { Combo } from "../models/Combo";
import { SiteSettings } from "../models/SiteSettings";
import { nextSeq } from "../models/Counter";

interface CartItem {
  comboId: string;
  quantity: number;
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

async function buildItemSnapshots(items: CartItem[]): Promise<OrderItemSnapshot[]> {
  if (!items?.length) {
    throw new OrderError(400, "EMPTY_CART", "Order has no items");
  }

  const snapshots: OrderItemSnapshot[] = [];

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

    const thumbnailUrl = combo.items?.[0]?.images?.[0]?.url ?? "";

    snapshots.push({
      comboId: combo._id,
      slug: combo.slug,
      name: combo.name,
      tagline: combo.tagline,
      thumbnailUrl,
      unitPrice: combo.totalPrice,
      quantity: cartItem.quantity,
      subtotal: combo.totalPrice * cartItem.quantity,
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

  // COD orders skip "pending" → go straight to "processing".
  // Online payments (paystack/flutterwave) start as "pending" until verified.
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
 * Marks an order as paid. Idempotent — safe to call multiple times
 * (since webhooks can fire repeatedly).
 *
 * Returns the updated order, or null if not found.
 */
export async function markOrderPaid(
  orderNumber: string,
  paymentReference: string,
): Promise<any> {
  const order = await Order.findOne({
    orderNumber: orderNumber.trim().toUpperCase(),
  });
  if (!order) return null;

  // If already paid (or beyond), skip — don't overwrite a shipped/delivered status
  if (
    order.status === "paid" ||
    order.status === "processing" ||
    order.status === "shipped" ||
    order.status === "delivered"
  ) {
    // Just save the payment reference if we haven't yet
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
  return order;
}
