/**
 * Orders API — frontend client.
 *
 * Cart items now include selectedVariants when sent to backend.
 */

import { apiFetch } from "./client";
import type { Order, ShippingAddress, PaymentMethod, CartItem } from "@/types/order";

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
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Send each cart item with its selectedVariants
  const payload = {
    items: input.items.map((it) => ({
      comboId: it.comboId,
      quantity: it.quantity,
      selectedVariants: it.selectedVariants ?? {},
    })),
    shipping: input.shipping,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
  };

  const res = await apiFetch<ApiResponse<BackendOrder>>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
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
