/**
 * Seeds the 6 starting categories and tags the existing Smart Combo Pack.
 *
 * Idempotent — safe to run multiple times. Uses upsert so existing categories
 * get updated (not duplicated).
 *
 * Run with:
 *   npx tsx server/seed/seedCategories.ts
 */

import mongoose from "mongoose";
import { config } from "../config";
import { Category } from "../models/Category";
import { Combo } from "../models/Combo";

const CATEGORIES = [
  { slug: "tech",      name: "Tech & Gadgets",        icon: "📱", description: "Smart devices, audio, and modern tech bundles", displayOrder: 1 },
  { slug: "mens",      name: "Men's Fashion",         icon: "👔", description: "Style essentials for the modern man",          displayOrder: 2 },
  { slug: "womens",    name: "Women's Fashion",       icon: "👗", description: "Curated style picks for women",                displayOrder: 3 },
  { slug: "students",  name: "Student Budget",        icon: "🎓", description: "Affordable bundles built for students",         displayOrder: 4 },
  { slug: "gifts",     name: "Gift Combos",           icon: "🎁", description: "Thoughtful bundles perfect for any occasion",   displayOrder: 5 },
  { slug: "business",  name: "Business / Professional", icon: "💼", description: "Premium combos for the working professional", displayOrder: 6 },
];

// Smart Combo Pack — tag with these category slugs
const SMART_COMBO_PACK_SLUG = "smart-combo-pack";
const SMART_COMBO_CATEGORIES = ["tech", "business", "gifts"];

async function seed() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);

    console.log("\n📁 Seeding categories...");
    for (const cat of CATEGORIES) {
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        { ...cat, isActive: true },
        { upsert: true, new: true },
      );
      console.log(`   ✓ ${cat.icon}  ${cat.name}`);
    }

    console.log("\n🔗 Tagging Smart Combo Pack with categories...");
    const combo = await Combo.findOneAndUpdate(
      { slug: SMART_COMBO_PACK_SLUG },
      { $set: { categorySlugs: SMART_COMBO_CATEGORIES } },
      { new: true },
    );

    if (combo) {
      console.log(`   ✓ ${combo.name} → [${SMART_COMBO_CATEGORIES.join(", ")}]`);
    } else {
      console.log(`   ⚠️  Smart Combo Pack not found. Skip tagging.`);
      console.log(`      (Run seedCombos.ts first if you haven't.)`);
    }

    console.log("\n✅ Done.");
    console.log("\nVerify at:");
    console.log("   http://localhost:8080/api/categories");
    console.log("   http://localhost:8080/api/combos?category=tech");
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
