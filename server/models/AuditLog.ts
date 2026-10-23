/** SC-STAFF SC-STAFF3  Who did what. Kept for one year. */
import { Schema, model, Document } from "mongoose";

export interface AuditLogDocument extends Document {
  userId: string; name: string; email: string; role: string;
  method: string; path: string; status: number; ip?: string; detail?: string; createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: { type: String, index: true },
    name: String, email: String, role: String,
    method: String, path: String, status: Number, ip: String, detail: String,
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 },
  },
  { versionKey: false },
);
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<AuditLogDocument>("AuditLog", AuditLogSchema);
