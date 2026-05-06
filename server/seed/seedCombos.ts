/**
 * Seed script — inserts the initial Smart Combo Pack into MongoDB.
 *
 * Run with:
 *   npx tsx server/seed/seedCombos.ts
 *
 * What it does:
 *   1. Connects to MongoDB
 *   2. Deletes ALL existing combos (clean slate)
 *   3. Inserts the Smart Combo Pack
 *   4. Disconnects and exits
 *
 * Run this ONCE. If you run it again, it'll wipe and re-insert.
 * Safe for development — DON'T run on production after launch.
 */

import mongoose from "mongoose";
import { config } from "../config";
import { Combo } from "../models/Combo";

const SMART_COMBO_PACK = {
  slug: "smart-combo-pack",
  name: "Smart Combo Pack",
  tagline: "Style · Tech · Luxury — All In One",
  totalPrice: 55000,
  originalPrice: 105000,
  badge: "🔥 BEST SELLER",
  stockLeft: 15,
  isFeatured: true,
  isActive: true,
  items: [
    {
      name: "Smart Watch Pro",
      badge: "SMART WATCH",
      individualPrice: 25000,
      images: [
        { url: "/images/watch1.avif", alt: "Smart Watch Pro front view" },
        { url: "/images/watch2.avif", alt: "Smart Watch Pro side view" },
        { url: "/images/watch3.avif", alt: "Smart Watch Pro features" },
        { url: "/images/watch4.avif", alt: "Smart Watch Pro lifestyle" },
      ],
    },
    {
      name: "Bluetooth Audio Glasses",
      badge: "AUDIO GLASSES",
      individualPrice: 18000,
      images: [
        { url: "/images/glasses1.avif", alt: "Audio Glasses front" },
        { url: "/images/glasses2.avif", alt: "Audio Glasses lifestyle" },
        { url: "/images/glasses3.avif", alt: "Audio Glasses dimensions" },
        { url: "/images/glasses4.avif", alt: "Audio Glasses dimming feature" },
      ],
    },
    {
      name: "Premium Bracelet",
      badge: "BRACELET",
      individualPrice: 12000,
      images: [
        { url: "/images/bracelet1.avif", alt: "Premium Bracelet detail" },
        { url: "/images/bracelet2.avif", alt: "Premium Bracelet stack" },
        { url: "/images/bracelet3.avif", alt: "Premium Bracelet wrist" },
      ],
    },
  ],
};

async function seed() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);

    console.log("🧹 Clearing existing combos...");
    const deleted = await Combo.deleteMany({});
    console.log(`   Deleted ${deleted.deletedCount} existing combos`);

    console.log("📦 Inserting Smart Combo Pack...");
    const created = await Combo.create(SMART_COMBO_PACK);
    console.log(`   ✅ Created combo: ${created.name} (id: ${created._id})`);

    console.log("\n🎉 Seed complete!");
    console.log("\nYou can now visit:");
    console.log("  http://localhost:8080/api/combos");
    console.log("  http://localhost:8080/api/combos/featured");
    console.log("  http://localhost:8080/api/combos/smart-combo-pack");
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
