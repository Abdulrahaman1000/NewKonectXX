/** SC-REM  A renewal reminder a customer set after a purchase (airtime, data, electricity, TV). The due date is worked out when read, from the latest matching purchase. */
import mongoose, { Schema } from "mongoose";

const ReminderSchema = new Schema(
  {
    customerId: { type: String, required: true, index: true },
    key: { type: String, required: true }, // service:network:smartcard|meter|phone, one reminder per key per customer
    service: { type: String, enum: ["airtime", "data", "electricity", "tv"], required: true },
    label: { type: String, default: "" },
    network: { type: String, default: "" }, // provider code: MTN, IKEDC, dstv ...
    networkName: { type: String, default: "" },
    phone: { type: String, default: "" },
    cardNumber: { type: String, default: "" },
    meterNumber: { type: String, default: "" },
    meterKind: { type: String, default: "" }, // prepaid | postpaid (not called "type": Mongoose reads that word specially)
    planCode: { type: String, default: "" },
    planName: { type: String, default: "" },
    amount: { type: Number, default: 0 }, // face value for airtime and electricity
    everyDays: { type: Number, default: 30, min: 1, max: 365 },
    paused: { type: Boolean, default: false },
    sourceAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
ReminderSchema.index({ customerId: 1, key: 1 }, { unique: true });

export const Reminder = (mongoose.models.Reminder as mongoose.Model<any>) || mongoose.model("Reminder", ReminderSchema);
