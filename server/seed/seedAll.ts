/**
 * Seeds Settings, HeroSlides, Testimonials, FAQs into MongoDB.
 *
 * Run with:
 *   npx tsx server/seed/seedAll.ts
 *
 * IMPORTANT: This wipes existing data in those four collections and re-inserts.
 * Don't run this on production data after launch.
 *
 * Edit the values below to match your real info before running:
 *   - WhatsApp number, email, phone (in SETTINGS)
 */

import mongoose from "mongoose";
import { config } from "../config";
import { SiteSettings } from "../models/SiteSettings";
import { HeroSlide } from "../models/HeroSlide";
import { Testimonial } from "../models/Testimonial";
import { FAQ } from "../models/FAQ";

// ──────────────────────────────────────────────────────────────────────────
// SETTINGS — single document
// ──────────────────────────────────────────────────────────────────────────

const SETTINGS = {
  storeName: "Smart Combo",
  tagline: "Premium lifestyle gadgets for the modern professional.",
  defaultHeroImage: "/images/hero_image.avif",

  promo: {
    endsAt: new Date(Date.now() + 5 * 86400000),
    enabled: true,
    headline: "Price goes back to ₦105,000 when timer hits zero",
    subline: "Only 15 combo packs left at this price",
  },

  contact: {
    whatsappNumber: "+2348142746379",
    email: "adekeyeolawale123@gmail.com",
    phone: "+234 814 274 6379",
    address: "Ilorin, Kwara State, Nigeria",
  },

  video: {
    url: "",
    thumbnail: "/images/hero_image.avif",
    title: "Smart Combo — Product Demo",
    duration: "",
  },

  trustStats: {
    rating: 4.9,
    reviewCount: 2500,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// HERO SLIDES
// ──────────────────────────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    desktopImage: "/images/glasses3.avif",
    accent: "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
    tag: "See the World Differently",
    displayOrder: 1,
    isActive: true,
  },
  {
    desktopImage: "/images/glasses4.avif",
    accent: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    tag: "Fashion Meets Function",
    displayOrder: 2,
    isActive: true,
  },
  {
    desktopImage: "/images/watch3.avif",
    accent: "from-[#0d1b2a] via-[#1b2838] to-[#2d1b69]",
    tag: "Time, Redefined",
    displayOrder: 3,
    isActive: true,
  },
  {
    desktopImage: "/images/watch4.avif",
    accent: "from-[#0a0a1a] via-[#1a1040] to-[#0f2040]",
    tag: "Precision on Your Wrist",
    displayOrder: 4,
    isActive: true,
  },
  {
    desktopImage: "/images/bracelet1.avif",
    accent: "from-[#1a0f0a] via-[#2a1a10] to-[#3d2010]",
    tag: "Elegance Reimagined",
    displayOrder: 5,
    isActive: true,
  },
  {
    desktopImage: "/images/bracelet2.avif",
    accent: "from-[#1a0a0f] via-[#251020] to-[#1a0a2e]",
    tag: "Wear Your Story",
    displayOrder: 6,
    isActive: true,
  },
  {
    desktopImage: "/images/glasses1.avif",
    accent: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
    tag: "The Complete Look",
    displayOrder: 7,
    isActive: true,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// TESTIMONIALS
// ──────────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Aisha Mohammed",
    location: "Lagos",
    rating: 5,
    text: "The Smart Combo completely transformed my daily routine. The build quality is exceptional!",
    isVerified: true,
    isPublished: true,
  },
  {
    name: "Chukwu Okafor",
    location: "Abuja",
    rating: 5,
    text: "Best purchase this year. Fast delivery, excellent service, and amazing products.",
    isVerified: true,
    isPublished: true,
  },
  {
    name: "Zainab Hassan",
    location: "Ilorin",
    rating: 5,
    text: "Love the features and premium feel. Worth every naira. Highly recommended!",
    isVerified: true,
    isPublished: true,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// FAQs
// ──────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    question: "What is included in the Smart Combo package?",
    answer:
      "The Smart Combo includes one Smart Watch Pro, one pair of Bluetooth Audio Glasses, and one Premium Bracelet — each with a charging cable, user manual, and warranty documentation.",
    order: 1,
    isPublished: true,
  },
  {
    question: "What is the warranty period?",
    answer:
      "All products come with a 1-year manufacturer's warranty. Extended options are available at checkout.",
    order: 2,
    isPublished: true,
  },
  {
    question: "Do you deliver to all states in Nigeria?",
    answer:
      "Yes, nationwide. Ilorin 2–3 days, other states 5–7 business days. COD only available in Ilorin.",
    order: 3,
    isPublished: true,
  },
  {
    question: "What payment methods are available?",
    answer:
      "Card, Bank Transfer, USSD, and Mobile Money via Paystack and Flutterwave. Ilorin customers can also use Cash on Delivery.",
    order: 4,
    isPublished: true,
  },
  {
    question: "Can I return the products?",
    answer: "14-day return policy for unused items in original packaging.",
    order: 5,
    isPublished: true,
  },
  {
    question: "Are there any hidden charges?",
    answer: "None. All prices include VAT. Delivery fees shown before payment.",
    order: 6,
    isPublished: true,
  },
];

// ──────────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);

    console.log("🧹 Wiping existing data...");
    await SiteSettings.deleteMany({});
    await HeroSlide.deleteMany({});
    await Testimonial.deleteMany({});
    await FAQ.deleteMany({});

    console.log("⚙️  Inserting site settings...");
    await SiteSettings.create(SETTINGS);

    console.log(`🖼️  Inserting ${HERO_SLIDES.length} hero slides...`);
    await HeroSlide.insertMany(HERO_SLIDES);

    console.log(`💬 Inserting ${TESTIMONIALS.length} testimonials...`);
    await Testimonial.insertMany(TESTIMONIALS);

    console.log(`❓ Inserting ${FAQS.length} FAQs...`);
    await FAQ.insertMany(FAQS);

    console.log("\n🎉 Seed complete!");
    console.log("\nYou can now visit:");
    console.log("  http://localhost:8080/api/settings");
    console.log("  http://localhost:8080/api/hero-slides");
    console.log("  http://localhost:8080/api/testimonials");
    console.log("  http://localhost:8080/api/faqs");
  } catch (err) {
    console.error("❌ Seed failed:");
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
