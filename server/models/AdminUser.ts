/**
 * AdminUser model.
 *
 * Admin accounts that can log into /admin to manage the store.
 * Passwords are hashed with bcrypt — we NEVER store plaintext.
 *
 * Future-proof: `role` field allows for staff/superadmin levels later.
 */

import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type AdminRole = "superadmin" | "admin" | "staff";

export interface AdminUserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  verifyPassword(plain: string): Promise<boolean>;
}

const AdminUserSchema = new Schema<AdminUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["superadmin", "admin", "staff"],
      default: "admin",
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Instance method to verify a plain-text password against the hash
AdminUserSchema.methods.verifyPassword = async function (
  plain: string,
): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

// Helper to hash a plain-text password — used by seed scripts and signup flows
export async function hashPassword(plain: string): Promise<string> {
  const COST = 12;
  return bcrypt.hash(plain, COST);
}

export const AdminUser = model<AdminUserDocument>("AdminUser", AdminUserSchema);
