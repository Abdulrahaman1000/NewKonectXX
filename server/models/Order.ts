/**
 * Order model.
 *
 * Items now snapshot the customer's variant selections so admin knows
 * exactly what to ship.
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

export type PaymentMethod =
  | "paystack"
  | "flutterwave"
  | "bank_transfer"
  | "cod"
  | "whatsapp";

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
  shipping: ShippingAddress;
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
  },
  { _id: false },
);

const ShippingAddressSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
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
      enum: ["paystack", "flutterwave", "bank_transfer", "cod", "whatsapp"],
      required: true,
    },
    paymentReference: { type: String, index: true },
    shipping: { type: ShippingAddressSchema, required: true },
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

export const Order = model<OrderDocument>("Order", OrderSchema);
