/** SC-REM  A customer's low-wallet alert. lowBalance 0 = off. */
import mongoose, { Schema } from "mongoose";

const ReminderPrefsSchema = new Schema(
  { customerId: { type: String, required: true, unique: true }, lowBalance: { type: Number, default: 0, min: 0 } },
  { timestamps: true },
);

export const ReminderPrefs = (mongoose.models.ReminderPrefs as mongoose.Model<any>) || mongoose.model("ReminderPrefs", ReminderPrefsSchema);
