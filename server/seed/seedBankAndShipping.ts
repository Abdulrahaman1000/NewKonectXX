/**
 * Updates ONLY the SiteSettings document with bank account + shipping config.
 *
 * ⚠️ EDIT THE BANK_ACCOUNT VALUES BELOW BEFORE RUNNING.
 *
 * This does NOT wipe other collections. It uses upsert with $set, so existing
 * fields are preserved and only the new fields are added/updated.
 *
 * Run with:
 *   npx tsx server/seed/seedBankAndShipping.ts
 */

import mongoose from "mongoose";
import { config } from "../config";
import { SiteSettings } from "../models/SiteSettings";

// ⚠️ EDIT THESE — replace with your real bank account
const BANK_ACCOUNT = {
  bankName: "Access Bank",
  accountName: "Adekeye Olawale",
  accountNumber: "0000000000",
};

const SHIPPING = {
  standardFee: 3500,            // ₦3,500 for standard delivery
  codCities: ["ilorin"],        // case-insensitive — these cities get COD + free shipping
  freeShippingThreshold: 0,     // 0 = disabled
};

async function seed() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);

    console.log("⚙️  Updating SiteSettings with bank + shipping fields...");
    await SiteSettings.findOneAndUpdate(
      {},
      {
        $set: {
          bankAccount: BANK_ACCOUNT,
          shipping: SHIPPING,
        },
      },
      { upsert: true, new: true },
    );

    console.log("\n✅ Done. Bank account + shipping configured.");
    console.log("\nVerify at:");
    console.log("  http://localhost:8080/api/settings");
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
