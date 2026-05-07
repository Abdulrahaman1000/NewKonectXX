/**
 * Order types — used by cart, checkout, order tracking, admin.
 *
 * Mirrors the backend Order model shape (server/models/Order.ts).
 */

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod =
  | 'paystack'
  | 'flutterwave'
  | 'bank_transfer'
  | 'cod'
  | 'whatsapp';

/**
 * Snapshot of an item at order time.
 * Backend returns these fields: name, slug, comboId, thumbnailUrl, unitPrice, quantity, subtotal.
 */
export interface OrderItem {
  comboId: string;
  slug: string;
  name: string;
  tagline?: string;
  thumbnailUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  street: string;
  landmark?: string;
}

export interface Order {
  _id?: string;
  id?: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paidAt?: string;
  shipping: ShippingAddress;
  notes?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * What the cart store keeps for each item.
 * Used during checkout, before the backend builds its snapshot.
 */
export interface CartItem {
  comboId: string;
  comboName: string;
  comboSlug: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  image: string;
}
