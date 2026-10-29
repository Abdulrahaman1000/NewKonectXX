/**
 * SC-ACCT  A customer account. Created the first time someone proves their email with a code.
 * The email is the login. The phone is how we recognise past orders (last 10 digits).
 * orderNumbers: orders the customer added by typing order number + phone (so a stranger cannot
 * see someone else's orders just by typing a phone number).
 */
import mongoose, { Schema } from "mongoose";

const CustomerSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    phoneKey: { type: String, default: "", index: true },
    orderNumbers: { type: [String], default: [] },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const Customer = (mongoose.models.Customer as mongoose.Model<any>) || mongoose.model("Customer", CustomerSchema);
