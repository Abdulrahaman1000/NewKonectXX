/**
 * AdminUser model.  (SC-STAFF version)
 *
 * role: superadmin / admin = the owner. staff = a hired person, whose access is
 * decided by `staffRole` (see server/permissions.ts). active=false locks them out.
 */
import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type AdminRole = "superadmin" | "admin" | "staff";

export interface AdminUserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  staffRole?: "packer" | "sales" | "content" | "bookkeeper" | "manager";
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  verifyPassword(plain: string): Promise<boolean>;
}

const AdminUserSchema = new Schema<AdminUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["superadmin", "admin", "staff"], default: "admin" },
    staffRole: { type: String, enum: ["packer", "sales", "content", "bookkeeper", "manager"] },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

AdminUserSchema.methods.verifyPassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  const COST = 12;
  return bcrypt.hash(plain, COST);
}

export const AdminUser = model<AdminUserDocument>("AdminUser", AdminUserSchema);
