/**
 * Orders API - frontend client.
 *
 * Cart items include selectedVariants and the free-gift flag when sent to the backend.
 */

import { apiFetch } from "./client";
import type { Order, ShippingAddress, PaymentMethod, CartItem } from "@/types/order";
import { getReferral } from "@/lib/referral";

interface ApiResponse<T> {
  data: T;
}

interface BackendOrder extends Omit<Order, "id"> {
  _id: string;
}

function normalize(raw: BackendOrder): Order {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export interface CreateOrderInput {
  items: CartItem[];
  shipping: ShippingAddress;
  paymentMethod: PaymentMethod;
  notes?: string;
  ackPreorder?: boolean;
  /** "now": send the ready pieces first (Ilorin only) */
  partialChoice?: "now" | "together";
  /** pay in instalments: how many payments, and that the customer ticked the rules box */
  installment?: { pay: true; payments: number; ack: boolean };
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Send each cart item with its selectedVariants and free-gift flag.
  // The server needs isFreeGift to know the item comes from the Gift Bank.
  const payload = {
    items: input.items.map((it) => ({
      comboId: it.comboId,
      quantity: it.quantity,
      selectedVariants: it.selectedVariants ?? {},
      isFreeGift: Boolean(it.isFreeGift),
    })),
    shipping: input.shipping,
    paymentMethod: input.paymentMethod,
    ref: getReferral(),
    notes: input.notes,
    ackPreorder: Boolean(input.ackPreorder),
    partialChoice: input.partialChoice === "now" ? "now" : "together",
    installment: input.installment,
  };

  const res = await apiFetch<ApiResponse<BackendOrder>>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export interface OrderPreview {
  lines: Array<{ comboId: string; name: string; ready: number; waiting: number; leadDaysMin: number; leadDaysMax: number; short?: boolean; want?: number }>;
  hasPre: boolean;
  /** some pieces are ready and some must be fetched */
  mixed: boolean;
  /** the city is one we deliver in ourselves (Ilorin) */
  local: boolean;
  subtotal: number;
  leadDaysMin: number;
  leadDaysMax: number;
}

/** Asks the server which pieces are ready and which must be fetched. Returns null if it cannot tell. */
export async function previewOrder(items: CartItem[], city: string): Promise<OrderPreview | null> {
  try {
    const res = await apiFetch<ApiResponse<OrderPreview>>("/api/orders/preview", {
      method: "POST",
      body: JSON.stringify({
        items: items.filter((i) => !i.isFreeGift).map((i) => ({ comboId: i.comboId, quantity: i.quantity })),
        city,
      }),
    });
    return res.data;
  } catch {
    return null;
  }
}

export async function trackOrder(orderNumber: string, phone: string): Promise<Order | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendOrder>>(
      `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
    );
    return normalize(res.data);
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}
