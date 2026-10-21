/**
 * Order model.
 *
 * Items now snapshot the customer's variant selections so admin knows
 * exactly what to ship.
 *
 * phoneKey is the customer's phone number cleaned to its last 10 digits. It is
 * how spending is added up for the free gift (customers do not have accounts).
 */

import { Schema, model, Document, Types } from "mongoose";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderSource = "website" | "whatsapp" | "walkin" | "social" | "other";

export type PaymentMethod =
  | "paystack"
  | "flutterwave"
  | "bank_transfer"
  | "cod"
  | "whatsapp"
  | "cash"
  | "pos";

export interface OrderItemSnapshot {
  comboId: Types.ObjectId;
  slug: string;
  name: string;
  tagline?: string;
  thumbnailUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  selectedVariants?: Record<string, string>;   // itemId → alternativeId
  variantSummary?: string;                     // human-readable
  isFreeGift?: boolean;                        // identifies free gift items
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

export interface OrderDocument extends Document {
  orderNumber: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  stockRestored?: boolean;
  /** where the order came from; "website" for normal checkout */
  source?: OrderSource;
  /** true when the owner recorded it by hand (WhatsApp, walk-in...) */
  manual?: boolean;
  paystackRefs?: string[];
  shipping: ShippingAddress;
  phoneKey?: string;
  notes?: string;
  trackingNumber?: string;
  trackingProviderUrl?: string;
  adminNotes?: string;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<OrderItemSnapshot>(
  {
    comboId: { type: Schema.Types.ObjectId, ref: "Combo", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    tagline: { type: String },
    thumbnailUrl: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    selectedVariants: { type: Schema.Types.Mixed, default: {} },
    variantSummary: { type: String, default: "" },
    isFreeGift: { type: Boolean, default: false },
  },
  { _id: false },
);

const ShippingAddressSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    // optional: WhatsApp and walk-in customers often have no email
    email: { type: String, default: "" },
    state: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    landmark: { type: String },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    items: { type: [OrderItemSnapshotSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["paystack", "flutterwave", "bank_transfer", "cod", "whatsapp", "cash", "pos"],
      required: true,
    },
    paymentReference: { type: String, index: true },
    // true once this order's stock has been given back (cancel / refund / expiry)
    stockRestored: { type: Boolean, default: false },
    // every Paystack reference started for this order (a customer can retry), used to re-check unpaid orders
    paystackRefs: { type: [String], default: [] },
    shipping: { type: ShippingAddressSchema, required: true },
    phoneKey: { type: String },
    source: { type: String, enum: ["website", "whatsapp", "walkin", "social", "other"], default: "website", index: true },
    manual: { type: Boolean, default: false },
    notes: { type: String },
    trackingNumber: { type: String },
    trackingProviderUrl: { type: String },
    adminNotes: { type: String },
    paidAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "shipping.phone": 1, orderNumber: 1 });
OrderSchema.index({ phoneKey: 1, createdAt: -1 });

export const Order = model<OrderDocument>("Order", OrderSchema);
