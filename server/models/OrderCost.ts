/**
 * OrderCost: what an order's goods cost you at the moment it was sold.
 * Kept in its own collection (not on the Order) so cost prices can never leak
 * to customers through the public order endpoints.
 */
import { Schema, model, Types } from "mongoose";

export interface OrderCostLine {
  comboId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  isFreeGift: boolean;
  /** false when no cost price had been entered for this item yet */
  known: boolean;
}

export interface OrderCostDocument {
  orderId: Types.ObjectId;
  orderNumber: string;
  lines: OrderCostLine[];
  totalCost: number;
  /** true when every line had a cost price, so profit for this order can be trusted */
  complete: boolean;
}

const LineSchema = new Schema<OrderCostLine>(
  {
    comboId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    isFreeGift: { type: Boolean, default: false },
    known: { type: Boolean, default: false },
  },
  { _id: false },
);

const OrderCostSchema = new Schema<OrderCostDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    lines: { type: [LineSchema], default: [] },
    totalCost: { type: Number, required: true, min: 0 },
    complete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const OrderCost = model<OrderCostDocument>("OrderCost", OrderCostSchema);
