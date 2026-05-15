/**
 * Combo model.
 *
 * Each ComboItem can now have:
 *  - alternatives[]  — different products for the slot (e.g. Smart Watch vs Casio)
 *  - colors[]        — color variants of the item (e.g. Black, Silver, Gold)
 *
 * Both are at the combo's total price — no price difference.
 */

import { Schema, model, Document } from "mongoose";

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ComboItemAlternative {
  id: string;
  name: string;
  badge?: string;
  images: ProductImage[];
  description?: string;
}

export interface ComboItemColor {
  id: string;
  name: string;             // e.g. "Black", "Silver Gold"
  hexCode?: string;         // optional CSS hex like "#000000" — if set, shows a dot; if not, shows a label
  imageUrl?: string;        // optional swatch image override
}

export interface ComboItem {
  id: string;
  name: string;
  badge: string;
  individualPrice: number;
  images: ProductImage[];
  description?: string;
  alternatives?: ComboItemAlternative[];
  colors?: ComboItemColor[];
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

const ComboItemAlternativeSchema = new Schema<ComboItemAlternative>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    badge: { type: String, default: "" },
    images: { type: [ProductImageSchema], default: [] },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const ComboItemColorSchema = new Schema<ComboItemColor>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    hexCode: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
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
    alternatives: { type: [ComboItemAlternativeSchema], default: [] },
    colors: { type: [ComboItemColorSchema], default: [] },
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
