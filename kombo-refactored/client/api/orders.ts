/**
 * Orders API — stubs until backend exists.
 * These will throw until you implement the backend.
 * That's intentional: it forces you to wire them up before launch.
 */

import type { Order, OrderStatus, ShippingAddress, PaymentMethod, CartItem } from '@/types/order';

export interface CreateOrderInput {
  items: CartItem[];
  shipping: ShippingAddress;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreateOrderResponse {
  order: Order;
  paymentUrl?: string; // Paystack/Flutterwave checkout URL
}

export async function createOrder(_input: CreateOrderInput): Promise<CreateOrderResponse> {
  // TODO: return apiFetch<CreateOrderResponse>('/api/orders', { method: 'POST', body: JSON.stringify(input) });
  throw new Error('Order API not yet implemented — backend coming next');
}

export async function fetchOrderByNumber(_orderNumber: string, _phone: string): Promise<Order> {
  // TODO: return apiFetch<Order>(`/api/orders/track?orderNumber=${orderNumber}&phone=${phone}`);
  throw new Error('Order tracking API not yet implemented — backend coming next');
}
