/**
 * Order service — business logic for orders.
 *
 * Why this lives in services/ instead of routes/:
 * Route handlers should be thin. They parse HTTP, call a service, return
 * a response. Business logic — generating order numbers, decrementing stock,
 * computing totals — lives here so it's reusable and testable.
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

/**
 * Generates an order number like "SC-2026-001234".
 * Counter is per-year so numbers reset Jan 1 (cleaner for accounting).
 */
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSeq(`order:${year}`);
  return `SC-${year}-${String(seq).padStart(6, "0")}`;
}

/**
 * Calculates shipping fee based on customer location and settings.
 *  - COD payment + COD-eligible city -> free
 *  - else: standard fee from settings
 */
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
 * Validates that the requested combos exist, are active, and have stock.
 * Builds a price-locked snapshot of items from the live combo data.
 */
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

    // Use first image of first item as a thumbnail
    const thumbnailUrl =
      combo.items?.[0]?.images?.[0]?.url ?? "";

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

/**
 * Decrements stock atomically for all items.
 * Uses findOneAndUpdate with a stock check filter to prevent overselling.
 */
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
  // 1. Build snapshots (validates combos, throws if anything's wrong)
  const items = await buildItemSnapshots(input.items);

  // 2. Calculate amounts
  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const shippingFee = await calculateShippingFee(
    input.paymentMethod,
    input.shipping.city,
  );
  const total = subtotal + shippingFee;

  // 3. Generate order number
  const orderNumber = await generateOrderNumber();

  // 4. Decrement stock BEFORE creating order so we don't have ghost orders if stock fails
  await decrementStock(items);

  // 5. Create order. COD orders skip "pending" → go straight to "processing"
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
