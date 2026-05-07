/**
 * Category model.
 *
 * Categories let admins organize combos into browsable groups.
 * A combo can belong to MULTIPLE categories (e.g. "Smart Combo Pack"
 * fits Tech, Business, AND Gifts). The combo references categories by
 * `categorySlugs: string[]` so URLs stay stable even if a category is
 * deleted and recreated.
 *
 * Slugs are the source of truth. Names can change without breaking URLs.
 */

import { Schema, model, Document } from "mongoose";

export interface CategoryDocument extends Document {
  slug: string;            // URL-safe: "tech-and-gadgets", "mens-fashion"
  name: string;            // Display: "Tech & Gadgets"
  icon: string;            // Emoji or short string: "📱"
  description: string;     // Subline shown on category pages
  displayOrder: number;    // Lower = shown first
  isActive: boolean;       // Hide without deleting
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(-[a-z0-9]+)*$/,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: "" },
    description: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Category = model<CategoryDocument>("Category", CategorySchema);
