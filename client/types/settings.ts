/**
 * Site-wide settings — frontend types.
 * NEW: hero { headline, subtext }.
 * NEW: welcomePopup { giftImages, comboImages }.
 */

export interface HeroSlide {
  id: string;
  image: string;
  accent: string;
  tag: string;
}

export interface HeroContent {
  headline: string;
  subtext: string;
}

export interface WelcomePopupContent {
  giftImages: string[];
  comboImages: string[];
}

export interface PromoSettings {
  endsAt: string;
  enabled: boolean;
  headline: string;
  subline: string;
}

export interface ContactSettings {
  whatsappNumber: string;
  whatsappLink: string;
  email: string;
  phone: string;
  address: string;
}

export interface VideoSettings {
  url: string;
  thumbnail: string;
  title: string;
  duration: string;
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
  storeName: string;
  tagline: string;
  defaultHeroImage: string;
  hero?: HeroContent;
  welcomePopup?: WelcomePopupContent;
  heroSlides?: HeroSlide[];
  promo: PromoSettings;
  contact: ContactSettings;
  video: VideoSettings;
  trustStats: {
    rating: number;
    reviewCount: number;
  };
  bankAccount?: BankAccount;
  shipping?: ShippingConfig;
}