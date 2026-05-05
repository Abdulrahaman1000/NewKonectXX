/**
 * Order types — used by cart, checkout, order tracking, admin
 */

export type OrderStatus =
  | 'pending'         // created, awaiting payment
  | 'paid'            // payment confirmed
  | 'processing'      // being prepared
  | 'shipped'         // out for delivery
  | 'delivered'       // received by customer
  | 'cancelled'
  | 'refunded';

export type PaymentMethod =
  | 'paystack'
  | 'flutterwave'
  | 'bank_transfer'   // manual transfer
  | 'cod';            // cash on delivery — Ilorin only

export interface OrderItem {
  comboId: string;
  comboName: string;
  comboSlug: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;          // unitPrice * quantity
  itemsSnapshot: Array<{     // snapshot of what was in the combo at order time
    name: string;
    individualPrice: number;
  }>;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  state: string;             // Nigerian state
  city: string;
  street: string;
  landmark?: string;
}

export interface Order {
  id: string;
  orderNumber: string;       // human-readable, e.g. "SC-2026-001234"
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string; // from Paystack/Flutterwave
  paidAt?: string;
  shipping: ShippingAddress;
  notes?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  comboId: string;
  comboName: string;
  comboSlug: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  image: string;
}
