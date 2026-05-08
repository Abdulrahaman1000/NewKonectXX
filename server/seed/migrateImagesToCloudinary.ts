/**
 * Migrate local product images to Cloudinary.
 *
 * Reads images from public/images/, uploads each to Cloudinary using the
 * unsigned preset, and updates the Smart Combo Pack in MongoDB to use
 * the new URLs.
 *
 * Matches items by their NAME (case-insensitive contains match) since
 * existing combo items in your DB don't have stable `id` values.
 *
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   npx tsx server/seed/migrateImagesToCloudinary.ts
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { Combo } from "../models/Combo";

// Public Cloudinary settings (same as frontend)
const CLOUD_NAME = "combo";
const UPLOAD_PRESET = "smart_comboo_unsigned";
const FOLDER = "smartcombo";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const SMART_COMBO_PACK_SLUG = "smart-combo-pack";

/**
 * Maps a name keyword (case-insensitive) → list of local image filenames + a stable id slug.
 * If your combo item names are different, edit the keywords below.
 */
const ITEM_IMAGE_MAP: Array<{
  matchName: string;        // case-insensitive substring of the item's name
  id: string;               // stable slug to set on the item if missing
  filenames: string[];      // local files in public/images/, in order
}> = [
  {
    matchName: "watch",
    id: "smart-watch-pro",
    filenames: ["watch1.avif", "watch2.avif", "watch3.avif", "watch4.avif"],
  },
  {
    matchName: "glass",  // matches "Audio Glasses", "Bluetooth Glasses", etc.
    id: "audio-glasses",
    filenames: ["glasses1.avif", "glasses2.avif", "glasses3.avif", "glasses4.avif"],
  },
  {
    matchName: "bracelet",
    id: "premium-bracelet",
    filenames: ["bracelet1.avif", "bracelet2.avif", "bracelet3.avif"],
  },
];

interface UploadResult {
  url: string;
  publicId: string;
}

async function uploadFile(filePath: string): Promise<UploadResult> {
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", FOLDER);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Cloudinary error: ${json?.error?.message ?? res.statusText}`);
  }

  return { url: json.secure_url, publicId: json.public_id };
}

async function main() {
  console.log("🌱 Connecting to MongoDB...");
  await mongoose.connect(config.mongodbUri);

  const imagesDir = path.resolve(process.cwd(), "public", "images");

  if (!fs.existsSync(imagesDir)) {
    throw new Error(`No public/images/ folder found at ${imagesDir}`);
  }
  console.log(`📁 Reading local images from ${imagesDir}\n`);

  const combo = await Combo.findOne({ slug: SMART_COMBO_PACK_SLUG });
  if (!combo) {
    throw new Error(
      `Combo "${SMART_COMBO_PACK_SLUG}" not found. Run seedCombos.ts first.`,
    );
  }

  console.log(`📦 Found combo: ${combo.name}`);
  console.log(`   ${combo.items.length} item(s):\n`);
  combo.items.forEach((item, i) => {
    console.log(`     ${i + 1}. ${item.name}  (current id: ${item.id ?? "MISSING"})`);
  });
  console.log();

  // Build new items array
  const updatedItems = await Promise.all(
    combo.items.map(async (item) => {
      const itemName = (item.name ?? "").toLowerCase();

      // Find a matching image map by name keyword
      const mapping = ITEM_IMAGE_MAP.find((m) => itemName.includes(m.matchName));

      if (!mapping) {
        console.log(`⚠️  No image mapping found for "${item.name}". Keeping existing data.`);
        return {
          ...item.toObject(),
          id: item.id ?? slugify(item.name),  // ensure id exists
        };
      }

      console.log(`📤 Uploading ${mapping.filenames.length} images for "${item.name}":`);
      const newImages: { url: string; alt?: string }[] = [];

      for (const filename of mapping.filenames) {
        const localPath = path.join(imagesDir, filename);
        if (!fs.existsSync(localPath)) {
          console.log(`   ⚠️  ${filename} not found locally. Skipping.`);
          continue;
        }

        try {
          const result = await uploadFile(localPath);
          console.log(`   ✓ ${filename} → ${result.publicId}`);
          newImages.push({ url: result.url, alt: item.name });
        } catch (err: any) {
          console.error(`   ❌ ${filename} failed: ${err.message}`);
        }
      }

      return {
        ...item.toObject(),
        id: item.id ?? mapping.id,  // ensure id exists
        images: newImages.length > 0 ? newImages : item.images,
      };
    }),
  );

  console.log("\n💾 Updating MongoDB combo with Cloudinary URLs...");
  combo.items = updatedItems as any;
  await combo.save();

  console.log("\n✅ Migration complete!");
  console.log("\nVerify:");
  console.log("   curl http://localhost:8080/api/combos/smart-combo-pack | head");
  console.log("   Visit http://localhost:8080  (homepage should still show all images)");
}

function slugify(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50)
    || "item";
}

main()
  .catch((err) => {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
