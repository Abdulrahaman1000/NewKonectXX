/**
 * SC-WALLET  A customer's Smart Combo wallet. One record per customer.
 * Money is kept in KOBO (whole numbers) so there are no rounding errors.
 * The balance, the list of references already applied (so one payment can never count twice) and the recent history
 * live in the SAME record, so every change is one atomic database operation.
 */
import mongoose, { Schema } from "mongoose";

const TxSchema = new Schema(
  {
    ref: { type: String, default: "" }, // unique per money movement, for example FUND:SC-WAL-AB12CD34EF or SPEND:SC-VTU-1234567890
    kind: { type: String, default: "" }, // fund | spend | refund | referral | bonus | adjust
    amount: { type: Number, default: 0 }, // kobo; negative = money out
    note: { type: String, default: "" },
    orderRef: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const WalletSchema = new Schema(
  {
    customerId: { type: String, required: true, unique: true },
    email: { type: String, default: "" },
    balance: { type: Number, default: 0 }, // kobo, never below 0 (every debit checks it)
    refs: { type: [String], default: [] },
    txs: { type: [TxSchema], default: [] }, // the latest 300
  },
  { timestamps: true },
);

export const Wallet = (mongoose.models.Wallet as mongoose.Model<any>) || mongoose.model("Wallet", WalletSchema);
