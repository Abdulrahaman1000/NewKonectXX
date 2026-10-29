/**
 * SC-INST  Store credit: money a customer paid on an instalment plan that was not completed.
 * It is not paid back in cash. It is kept for the customer's phone number until it expires.
 * Until customer accounts and the wallet exist, the owner honours it by hand and marks it used here.
 */
import { Schema, model, Document } from "mongoose";

export interface StoreCreditDocument extends Document {
  phoneKey: string;
  phone: string;
  name: string;
  amount: number;
  usedAmount: number;
  orderNumber: string;
  /** the Paystack reference when this credit came from a late payment, so it is never counted twice */
  ref?: string;
  note?: string;
  expiresAt: Date;
  createdAt: Date;
}

const StoreCreditSchema = new Schema<StoreCreditDocument>(
  {
    phoneKey: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    name: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    usedAmount: { type: Number, default: 0, min: 0 },
    orderNumber: { type: String, required: true, index: true },
    ref: { type: String, index: true },
    note: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const StoreCredit = model<StoreCreditDocument>("StoreCredit", StoreCreditSchema);
