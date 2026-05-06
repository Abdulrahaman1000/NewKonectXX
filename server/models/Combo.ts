/**
 * Combo Mongoose model.
 *
 * This is the database schema for combos (bundle products).
 * It MUST stay in sync with `client/types/combo.ts` — the frontend type.
 *
 * When the API returns a Combo, the frontend Combo type receives it directly.
 *
 * Why a separate sub-schema for items?
 * Mongoose lets us nest documents inside documents. Items in a combo are
 * tightly bound to the combo (they don't exist on their own), so they live
 * as embedded documents instead of a separate collection.
 */

import { Schema, model, Document, Types } from "mongoose";

// ──────────────────────────────────────────────────────────────────────────
// Sub-schemas (embedded documents)
// ──────────────────────────────────────────────────────────────────────────

const ProductImageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String },
  },
  { _id: false }, // don't generate _id for image objects — they're just data
);

const ComboItemSchema = new Schema(
  {
    name: { type: String, required: true },
    badge: { type: String, required: true },
    individualPrice: { type: Number, required: true, min: 0 },
    images: { type: [ProductImageSchema], default: [] },
    description: { type: String },
  },
  { _id: false },
);

// ──────────────────────────────────────────────────────────────────────────
// Main Combo schema
// ──────────────────────────────────────────────────────────────────────────

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
  items: Array<{
    name: string;
    badge: string;
    individualPrice: number;
    images: Array<{ url: string; alt?: string }>;
    description?: string;
  }>;
  heroImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComboSchema = new Schema<ComboDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },

    totalPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },

    badge: { type: String, default: "" },
    stockLeft: { type: Number, default: 0, min: 0 },

    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },

    items: { type: [ComboItemSchema], default: [] },

    heroImage: { type: String },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  },
);

// Composite index for "show me featured + active combos"
ComboSchema.index({ isFeatured: 1, isActive: 1 });

export const Combo = model<ComboDocument>("Combo", ComboSchema);
