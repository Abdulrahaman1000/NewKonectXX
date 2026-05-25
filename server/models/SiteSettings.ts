/**
 * SiteSettings model — single document collection.
 *
 * NEW: hero { headline, subtext } — editable platform hero copy.
 */

import { Schema, model, Document } from "mongoose";

const DEFAULT_HERO_HEADLINE = "Premium Combos. One Smart Price.";
const DEFAULT_HERO_SUBTEXT =
  "Curated bundles across tech, fashion & lifestyle — handpicked, quality-checked, and priced to save you thousands.";

export interface SiteSettingsDocument extends Document {
  storeName: string;
  tagline: string;
  defaultHeroImage: string;
  hero: {
    headline: string;
    subtext: string;
  };
  promo: {
    endsAt: Date;
    enabled: boolean;
    headline: string;
    subline: string;
  };
  contact: {
    whatsappNumber: string;
    email: string;
    phone: string;
    address: string;
  };
  video: {
    url: string;
    thumbnail: string;
    title: string;
    duration: string;
  };
  trustStats: {
    rating: number;
    reviewCount: number;
  };
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  shipping: {
    standardFee: number;
    codCities: string[];
    freeShippingThreshold: number;
  };
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    storeName: { type: String, required: true, default: "Smart Combo" },
    tagline: { type: String, default: "" },
    defaultHeroImage: { type: String, default: "" },

    hero: {
      headline: { type: String, default: DEFAULT_HERO_HEADLINE },
      subtext: { type: String, default: DEFAULT_HERO_SUBTEXT },
    },

    promo: {
      endsAt: { type: Date, default: () => new Date(Date.now() + 5 * 86400000) },
      enabled: { type: Boolean, default: true },
      headline: { type: String, default: "" },
      subline: { type: String, default: "" },
    },

    contact: {
      whatsappNumber: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
    },

    video: {
      url: { type: String, default: "" },
      thumbnail: { type: String, default: "" },
      title: { type: String, default: "" },
      duration: { type: String, default: "" },
    },

    trustStats: {
      rating: { type: Number, default: 4.9, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0, min: 0 },
    },

    bankAccount: {
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
    },

    shipping: {
      standardFee: { type: Number, default: 3500, min: 0 },
      codCities: { type: [String], default: ["ilorin"] },
      freeShippingThreshold: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true },
);

export const SiteSettings = model<SiteSettingsDocument>(
  "SiteSettings",
  SiteSettingsSchema,
);
