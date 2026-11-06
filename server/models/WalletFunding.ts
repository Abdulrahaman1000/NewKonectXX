/** SC-WALLET  One top-up of a wallet through Paystack. Kept apart from the wallet so a payment can be checked and repeated safely. */
import mongoose, { Schema } from "mongoose";

const WalletFundingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true }, // SC-WAL-XXXXXXXXXX, also the Paystack reference
    customerId: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    amount: { type: Number, required: true }, // naira
    status: { type: String, enum: ["pending", "paid", "failed", "mismatch"], default: "pending" },
    paidAt: { type: Date },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const WalletFunding = (mongoose.models.WalletFunding as mongoose.Model<any>) || mongoose.model("WalletFunding", WalletFundingSchema);
