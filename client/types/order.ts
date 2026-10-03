/**
 * Frontend order/cart types.
 *
 * NOTE: this file previously contained a stray copy of the BACKEND
 * Mongoose Order model (server/models/Order.ts) — it didn't even export
 * CartItem or Order (as a plain frontend type), which several files
 * actually need. That's fixed here: frontend-only, no mongoose import.
 */

/** One line item in the cart — one product/combo, with quantity and any selected variants. */
export interface CartItem {
  comboId: string;
  comboName: string;
  comboSlug: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  image: string;
  selectedVariants?: Record<string, string>;
  /**
   * Set when this item was added as part of a "Build Your Own Combo"
   * selection. Items sharing the same comboGroupId are shown grouped
   * together in the cart, with the discount applied once per group
   * (see customComboGroups in the cart store), not per item.
   */
  comboGroupId?: string;
  /** Set when this item is selected from the Free Gift Bank (price set to 0). */
  isFreeGift?: boolean;
}

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

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  street: string;
  landmark?: string;
}

/** One item as stored/returned on a placed order (a snapshot, not live cart data). */
export interface OrderItemSnapshot {
  comboId: string;
  slug: string;
  name: string;
  tagline?: string;
  thumbnailUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  selectedVariants?: Record<string, string>;
  variantSummary?: string;
  isFreeGift?: boolean;
}

/** A placed order, as returned by the API on the frontend (id instead of _id, dates as strings). */
export interface Order {
  id: string;
  /** Some places in the codebase still check the raw Mongo _id as a fallback — kept optional for that. */
  _id?: string;
  orderNumber: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  shipping: ShippingAddress;
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  trackingProviderUrl?: string;
  adminNotes?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}