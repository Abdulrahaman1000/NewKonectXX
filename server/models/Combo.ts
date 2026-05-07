/**
 * Combo model.
 *
 * Now includes categorySlugs[] — a combo can belong to multiple categories.
 * Categories are referenced by slug (not ObjectId) for URL stability.
 *
 * NOTE: Removed Mongoose `versionKey` index conflicts and kept structure same.
 */

import { Schema, model, Document } from "mongoose";

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ComboItem {
  id: string;
  name: string;
  badge: string;
  individualPrice: number;
  images: ProductImage[];
  description?: string;
}

export interface ComboDocument extends Document {
  slug: string;
  name: string;
  tagline: string;
  totalPrice: number;
  originalPrice: number;
  badge: string;
  stockLeft: number;
  isFeatured: boolean;
  isActive: boolean;
  items: ComboItem[];
  heroImage?: string;
  categorySlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<ProductImage>(
  {
    url: { type: String, required: true },
    alt: { type: String },
  },
  { _id: false },
);

const ComboItemSchema = new Schema<ComboItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    badge: { type: String, default: "" },
    individualPrice: { type: Number, required: true, min: 0 },
    images: { type: [ProductImageSchema], default: [] },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const ComboSchema = new Schema<ComboDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: "", trim: true },
    totalPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    badge: { type: String, default: "" },
    stockLeft: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    items: { type: [ComboItemSchema], default: [] },
    heroImage: { type: String },
    categorySlugs: {
      type: [String],
      default: [],
      index: true,
    },
  },
  { timestamps: true },
);

export const Combo = model<ComboDocument>("Combo", ComboSchema);
