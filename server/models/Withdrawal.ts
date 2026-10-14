/** A partner's request to be paid. Destination: server/models/Withdrawal.ts */
import mongoose, { Schema } from "mongoose";

const withdrawalSchema = new Schema(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: "Reseller", required: true, index: true },
    resellerCode: { type: String, required: true },
    partnerName: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    orderCount: { type: Number, default: 0 },
    /** Bank details at the time of the request, so later edits cannot redirect an old payout */
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    accountName: { type: String, default: "" },
    status: { type: String, enum: ["requested", "paid", "rejected"], default: "requested", index: true },
    /** Amount actually paid (can be lower than `amount` if an order was cancelled meanwhile) */
    paidAmount: { type: Number },
    paidAt: { type: Date },
    adminNote: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

export const Withdrawal: mongoose.Model<any> =
  mongoose.models.Withdrawal ?? mongoose.model("Withdrawal", withdrawalSchema);
