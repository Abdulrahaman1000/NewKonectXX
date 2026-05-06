/**
 * FAQ model.
 *
 * Frequently asked questions, ordered by `order` field.
 */

import { Schema, model, Document } from "mongoose";

export interface FAQDocument extends Document {
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<FAQDocument>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0, index: true },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const FAQ = model<FAQDocument>("FAQ", FAQSchema);
