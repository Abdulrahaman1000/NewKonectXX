/**
 * Reseller — server model (mongoose lives here, never in client code).
 *
 * V1 plan: anyone can apply, you approve them, and only approved Resellers get a
 * Reseller code / referral link. So a new sign-up starts as "pending" and has no
 * ResellerCode yet; the code is assigned the first time you approve them.
 */

import mongoose, { Schema } from "mongoose";

const ResellerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, unique: true },
    whatsapp: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // Never the password itself. select:false keeps the hash out of normal queries.
    passwordHash: { type: String, required: true, select: false },
    /** Optional: social handle or main promotion channel. */
    channel: { type: String, trim: true, maxlength: 200, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
      index: true,
    },
    /** e.g. SC1001. Set the first time the Reseller is approved, then never changes. */
    ResellerCode: { type: String, unique: true, sparse: true },
    approvedAt: { type: Date },
    suspendedAt: { type: Date },
  },
  { timestamps: true },
);

export const Reseller: mongoose.Model<any> =
  mongoose.models.Reseller ?? mongoose.model("Reseller", ResellerSchema);

/**
 * One document that counts up, so two approvals at the same moment can never get the
 * same code. It has its own collection ("Resellercounters"), so it cannot clash with
 * any other counter you may already have.
 */
const counterSchema = new Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

export const ResellerCounter: mongoose.Model<any> =
  mongoose.models.ResellerCounter ?? mongoose.model("ResellerCounter", counterSchema);
