/**
 * Testimonial model.
 *
 * Customer reviews shown on homepage. Admin can publish/unpublish.
 */

import { Schema, model, Document } from "mongoose";

export interface TestimonialDocument extends Document {
  name: string;
  location: string;
  rating: number;
  text: string;
  isVerified: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<TestimonialDocument>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Testimonial = model<TestimonialDocument>(
  "Testimonial",
  TestimonialSchema,
);
