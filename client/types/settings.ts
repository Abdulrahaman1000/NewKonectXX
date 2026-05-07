/**
 * Site-wide settings
 *
 * Single document in MongoDB (collection: siteSettings, only one record).
 * Editable from admin dashboard.
 */

export interface HeroSlide {
  id: string;
  image: string;
  accent: string;  // tailwind gradient classes, e.g. "from-[#1a0a2e] via-[#16213e] to-[#0f3460]"
  tag: string;
}

export interface PromoSettings {
  endsAt: string;          // ISO date string — "2026-05-15T23:59:59.000Z"
  enabled: boolean;
  headline: string;        // "Price goes back to ₦105,000 when timer hits zero"
  subline: string;         // "Only 15 combo packs left at this price"
}

export interface ContactSettings {
  whatsappNumber: string;     // "+2348000000000" — full international format
  whatsappLink: string;       // computed: "https://wa.me/2348000000000"
  email: string;
  phone: string;              // display format: "+234 (0) 123 456 7890"
  address: string;            // "Ilorin, Kwara State, Nigeria"
}

export interface VideoSettings {
  url: string;          // YouTube embed URL
  thumbnail: string;
  title: string;
  duration: string;     // "2:30 min"
}

export interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface ShippingConfig {
  standardFee: number;
  codCities: string[];
  freeShippingThreshold: number;
}

export interface SiteSettings {
  storeName: string;          // "Smart Combo"
  tagline: string;            // "Premium lifestyle gadgets..."
  defaultHeroImage: string;   // fallback hero when no combo featured
  heroSlides?: HeroSlide[];   // legacy — now fetched separately
  promo: PromoSettings;
  contact: ContactSettings;
  video: VideoSettings;
  trustStats: {
    rating: number;       // 4.9
    reviewCount: number;  // 2500
  };
  bankAccount?: BankAccount;
  shipping?: ShippingConfig;
}
