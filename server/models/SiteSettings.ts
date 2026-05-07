/**
 * SiteSettings model — single document collection.
 *
 * Includes bank account info (for bank transfer payments) and shipping fees
 * (used to calculate order totals).
 */

import { Schema, model, Document } from "mongoose";

export interface SiteSettingsDocument extends Document {
  storeName: string;
  tagline: string;
  defaultHeroImage: string;
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
    codCities: string[];        // case-insensitive city names with COD + free shipping
    freeShippingThreshold: number; // 0 = disabled
  };
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    storeName: { type: String, required: true, default: "Smart Combo" },
    tagline: { type: String, default: "" },
    defaultHeroImage: { type: String, default: "" },

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
