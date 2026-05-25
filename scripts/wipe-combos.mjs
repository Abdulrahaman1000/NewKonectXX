/**
 * wipe-combos.mjs — ONE-TIME cleanup script.
 *
 * Deletes ALL combos from the database (hard delete, not soft-delete),
 * so you can start fresh with real products.
 *
 * Keeps: categories, settings, orders, everything else.
 *
 * Run once:  node scripts/wipe-combos.mjs
 *
 * Reads MONGODB_URI from your .env (same one the app uses).
 */

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- Load MONGODB_URI from .env manually (no dotenv dependency needed) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

let MONGODB_URI = '';
try {
  const envText = readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('MONGODB_URI=')) {
      // Strip the key, then strip surrounding quotes if present
      MONGODB_URI = trimmed.slice('MONGODB_URI='.length).replace(/^["']|["']$/g, '');
      break;
    }
  }
} catch (err) {
  console.error('❌ Could not read .env at', envPath);
  console.error('   Make sure you run this from the project root: node scripts/wipe-combos.mjs');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  // Work directly with the combos collection (no model needed)
  const db = mongoose.connection.db;

  // Count first
  const before = await db.collection('combos').countDocuments();
  console.log(`📦 Found ${before} combo(s) in the database.`);

  if (before === 0) {
    console.log('Nothing to delete. The combos collection is already empty.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Delete them all
  const result = await db.collection('combos').deleteMany({});
  console.log(`🗑️  Deleted ${result.deletedCount} combo(s).`);

  const after = await db.collection('combos').countDocuments();
  console.log(`📦 Combos remaining: ${after}`);

  await mongoose.disconnect();
  console.log('✅ Done. You can now add your real products in the admin.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
