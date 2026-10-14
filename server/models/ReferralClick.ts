/** One row per tracked visit that arrived through a partner link. Destination: server/models/ReferralClick.ts */
import mongoose, { Schema } from "mongoose";

const clickSchema = new Schema(
  {
    resellerCode: { type: String, required: true, index: true },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const ReferralClick: mongoose.Model<any> =
  mongoose.models.ReferralClick ?? mongoose.model("ReferralClick", clickSchema);
