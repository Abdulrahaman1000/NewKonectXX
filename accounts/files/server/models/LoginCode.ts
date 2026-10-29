/** SC-ACCT  A 6-digit login code (stored hashed). Removes itself after it expires. */
import mongoose, { Schema } from "mongoose";

const LoginCodeSchema = new Schema({
  email: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const LoginCode = (mongoose.models.LoginCode as mongoose.Model<any>) || mongoose.model("LoginCode", LoginCodeSchema);
