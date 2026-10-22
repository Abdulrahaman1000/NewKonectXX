/** One line per manual stock change (restock or correction). Sales are not logged here. */
import { Schema, model, Document, Types } from "mongoose";

export interface StockLogDocument extends Document {
  comboId: Types.ObjectId;
  comboName: string;
  kind: "restock" | "set";
  delta: number;
  before: number;
  after: number;
  note?: string;
  createdAt: Date;
}

const StockLogSchema = new Schema<StockLogDocument>(
  {
    comboId: { type: Schema.Types.ObjectId, ref: "Combo", required: true, index: true },
    comboName: { type: String, required: true },
    kind: { type: String, enum: ["restock", "set"], required: true },
    delta: { type: Number, required: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    note: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
StockLogSchema.index({ createdAt: -1 });

export const StockLog = model<StockLogDocument>("StockLog", StockLogSchema);
