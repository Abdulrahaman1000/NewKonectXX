/**
 * Orders API — frontend client.
 *
 * Calls real /api/orders endpoints.
 * The backend wants a slim payload: { comboId, quantity } per item.
 * The cart stores richer items, so we map them down before sending.
 */

import { apiFetch } from "./client";
import type { CartItem } from "@/stores/cart";
import type { Order, PaymentMethod } from "@/types/order";

interface ApiResponse<T> {
  data: T;
}

interface CreateOrderInput {
  items: CartItem[];
  shipping: {
    fullName: string;
    phone: string;
    email: string;
    state: string;
    city: string;
    street: string;
    landmark?: string;
  };
  paymentMethod: PaymentMethod;
  notes?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Backend only needs comboId + quantity; the rest comes from the live combo doc.
  const slimItems = input.items.map((it) => ({
    comboId: it.comboId,
    quantity: it.quantity,
  }));

  const res = await apiFetch<ApiResponse<Order>>("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: slimItems,
      shipping: input.shipping,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
    }),
  });
  return res.data;
}

export async function trackOrder(
  orderNumber: string,
  phone: string,
): Promise<Order | null> {
  try {
    const res = await apiFetch<ApiResponse<Order>>(
      `/api/orders/track?orderNumber=${encodeURIComponent(
        orderNumber,
      )}&phone=${encodeURIComponent(phone)}`,
    );
    return res.data;
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}
