/** SC-VTU3  The owner's own settings for one data plan (keyed by the provider's plan code). */
import mongoose, { Schema } from "mongoose";

const VtuPlanSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    network: { type: String, required: true, index: true },
    customPrice: { type: Number, default: null }, // null = use the percentage rule
    hidden: { type: Boolean, default: false },
    label: { type: String, default: "" },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const VtuPlan = (mongoose.models.VtuPlan as mongoose.Model<any>) || mongoose.model("VtuPlan", VtuPlanSchema);
