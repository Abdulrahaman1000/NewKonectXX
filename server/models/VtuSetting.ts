/** SC-VTU  The owner's VTU prices and limits (one record). Edited in Admin > VTU. */
import mongoose, { Schema } from "mongoose";

const VtuSettingSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    airtimeDiscountPct: { type: Number, default: 2 }, // what the provider takes off airtime (our cost = face value less this)
    dataMarginPct: { type: Number, default: 5 }, // added to the provider's data price
    electricityFee: { type: Number, default: 100 }, // flat naira fee added to an electricity payment
    airtimeMin: { type: Number, default: 50 },
    airtimeMax: { type: Number, default: 20000 },
    electricityMin: { type: Number, default: 1000 },
    electricityMax: { type: Number, default: 100000 },
    paused: { type: Boolean, default: false }, // owner's emergency switch
  },
  { timestamps: true },
);

export const VtuSetting = (mongoose.models.VtuSetting as mongoose.Model<any>) || mongoose.model("VtuSetting", VtuSettingSchema);
