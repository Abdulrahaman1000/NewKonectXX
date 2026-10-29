/** SC-VTU  One airtime, data or electricity purchase. The payment reference and the provider reference are kept apart on purpose. */
import mongoose, { Schema } from "mongoose";

const VtuOrderSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    userId: { type: String, default: "" },
    email: { type: String, default: "" },
    service: { type: String, enum: ["airtime", "data", "electricity", "tv"], required: true },
    network: { type: String, required: true }, // MTN / Airtel / Glo / 9mobile, or the electricity company code
    networkName: { type: String, default: "" },
    planCode: { type: String, default: "" },
    planName: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    meter: { number: String, type: String, name: String, address: String },
    amount: { type: Number, required: true }, // what the customer pays, naira
    faceValue: { type: Number, default: 0 }, // airtime or electricity amount delivered
    cost: { type: Number, default: 0 }, // what the provider charges us, naira
    paymentStatus: { type: String, enum: ["pending", "paid", "mismatch", "failed"], default: "pending" },
    paymentReference: { type: String, default: "" },
    paidAt: { type: Date },
    fulfilmentStatus: { type: String, enum: ["pending", "processing", "successful", "failed"], default: "pending" },
    providerReference: { type: String, default: "" },
    providerMessage: { type: String, default: "" },
    token: { type: String, default: "" }, // electricity token
    units: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ["not_required", "required", "refund_requested", "refunded", "failed"], default: "not_required" },
    refundNote: { type: String, default: "" },
  },
  { timestamps: true },
);
VtuOrderSchema.index({ createdAt: -1 });
VtuOrderSchema.index({ userId: 1, createdAt: -1 });

export const VtuOrder = (mongoose.models.VtuOrder as mongoose.Model<any>) || mongoose.model("VtuOrder", VtuOrderSchema);
