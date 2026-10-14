/**
 * Commission records + reseller program settings.
 *
 * A Commission row is created once, when an order that came through a reseller's
 * referral link is placed. It stores the numbers that were true at that moment
 * (base, rate, holdDays) so changing the program settings later never rewrites history.
 *
 * Status is worked out from the order and paidAt every time it is needed:
 *   order cancelled / refunded                      -> cancelled
 *   paidAt is set                                   -> paid
 *   order delivered and holdDays have passed        -> approved
 *   anything else                                   -> pending
 * (names match the Partner Program plan: Pending, Approved, Paid, Cancelled)
 * That way cancelling or refunding an order anywhere in the app needs no extra code here.
 *
 * Destination: server/models/Commission.ts
 */

import mongoose, { Schema, Types } from "mongoose";

export interface ICommission {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  resellerId: Types.ObjectId;
  resellerCode: string;
  /** Amount the percentage was applied to (products only, shipping excluded), in naira */
  base: number;
  /** Blended percent actually applied (amount / base), for display, e.g. 5 or 7.5 */
  rate: number;
  /** How the amount was built: money and percent for combos vs single products */
  comboBase: number;
  comboRate: number;
  singleBase: number;
  singleRate: number;
  /** Set when the weekly payout that included this commission is sent */
  paidAt?: Date;
  /** Set while the commission is part of a withdrawal request (locks it so it cannot be requested twice) */
  withdrawalId?: Types.ObjectId | null;
  /** Days after delivery before the commission can be withdrawn */
  holdDays: number;
  /** Commission in naira */
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commissionSchema = new Schema<ICommission>(
  {
    // unique: one order can only ever produce one commission, even if the code runs twice
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    orderNumber: { type: String, required: true, index: true },
    resellerId: { type: Schema.Types.ObjectId, ref: "Reseller", required: true, index: true },
    resellerCode: { type: String, required: true, index: true },
    base: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    comboBase: { type: Number, default: 0, min: 0 },
    comboRate: { type: Number, default: 0, min: 0 },
    singleBase: { type: Number, default: 0, min: 0 },
    singleRate: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date },
    withdrawalId: { type: Schema.Types.ObjectId, ref: "Withdrawal", default: null, index: true },
    holdDays: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export const Commission =
  (mongoose.models.Commission as mongoose.Model<ICommission>) ??
  mongoose.model<ICommission>("Commission", commissionSchema);

/** Single settings document (_id "program"). Created on first read with the defaults. */
export interface IResellerProgram {
  _id: string;
  /** Percent on combos (2+ items). Plan: 5 */
  comboPercent: number;
  /** Percent on single products (1 item). Plan: up to 10 */
  singlePercent: number;
  holdDays: number;
  /** Smallest balance a partner can withdraw, in naira. Plan: 2000 */
  minWithdrawal: number;
}

const programSchema = new Schema<IResellerProgram>(
  {
    _id: { type: String },
    comboPercent: { type: Number, default: 5, min: 0, max: 50 },
    singlePercent: { type: Number, default: 10, min: 0, max: 50 },
    holdDays: { type: Number, default: 7, min: 0, max: 90 },
    minWithdrawal: { type: Number, default: 2000, min: 0 },
  },
  { timestamps: true },
);

export const ResellerProgram =
  (mongoose.models.ResellerProgram as mongoose.Model<IResellerProgram>) ??
  mongoose.model<IResellerProgram>("ResellerProgram", programSchema);

export async function getProgramSettings(): Promise<IResellerProgram> {
  const doc = await ResellerProgram.findOneAndUpdate(
    { _id: "program" },
    { $setOnInsert: { comboPercent: 5, singlePercent: 10, holdDays: 7, minWithdrawal: 2000 } },
    { new: true, upsert: true },
  ).lean();
  return doc as IResellerProgram;
}
