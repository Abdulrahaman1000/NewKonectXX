/**
 * Expense: money the business spent that is not the purchase price of stock
 * (stock cost is counted automatically through each item's cost price).
 */
import { Schema, model, Document } from "mongoose";

export const EXPENSE_CATEGORIES = ["ads", "packaging", "delivery", "transport", "software", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ExpenseDocument extends Document {
  date: Date;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<ExpenseDocument>(
  {
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true },
);

export const Expense = model<ExpenseDocument>("Expense", ExpenseSchema);
