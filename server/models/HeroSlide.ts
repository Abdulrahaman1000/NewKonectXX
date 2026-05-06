/**
 * HeroSlide model.
 *
 * Each slide in the homepage carousel is its own document so admin can
 * add/edit/reorder slides without touching code.
 */

import { Schema, model, Document, Types } from "mongoose";

export interface HeroSlideDocument extends Document {
  desktopImage: string;
  mobileImage?: string;
  tag?: string;
  headline?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  accent: string;
  linkedComboId?: Types.ObjectId;
  displayOrder: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<HeroSlideDocument>(
  {
    desktopImage: { type: String, required: true },
    mobileImage: { type: String },

    tag: { type: String },
    headline: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    buttonLink: { type: String },

    // Tailwind gradient classes for the slide background
    accent: { type: String, default: "from-[#1a0a2e] via-[#16213e] to-[#0f3460]" },

    linkedComboId: { type: Schema.Types.ObjectId, ref: "Combo" },

    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },

    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true },
);

HeroSlideSchema.index({ isActive: 1, displayOrder: 1 });

export const HeroSlide = model<HeroSlideDocument>("HeroSlide", HeroSlideSchema);
