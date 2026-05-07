/**
 * Order model.
 *
 * Each order captures a SNAPSHOT of items at order time. We never reference
 * the live combo/price — if you raise prices tomorrow, today's orders still
 * show what the customer actually paid.
 *
 * Status flow:
 *   pending → paid → processing → shipped → delivered
 *   pending → cancelled
 *   paid → refunded
 *
 * Order numbers are human-readable: SC-2026-001234 (year + sequential).
 * The counter is in a separate collection (Counter) for atomic increment.
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
  tagline: string;
  thumbnailUrl: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
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
  paidAt?: Date;
  shipping: ShippingAddress;
  notes?: string;
  trackingUrl?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItemSnapshot>(
  {
    comboId: { type: Schema.Types.ObjectId, ref: "Combo", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    tagline: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const ShippingAddressSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [OrderItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
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
    paymentReference: { type: String },
    paidAt: { type: Date },

    shipping: { type: ShippingAddressSchema, required: true },

    notes: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
  },
  { timestamps: true },
);

OrderSchema.index({ "shipping.phone": 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = model<OrderDocument>("Order", OrderSchema);
