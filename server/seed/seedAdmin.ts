/**
 * Seed your first admin user.
 *
 * Run with:
 *   npx tsx server/seed/seedAdmin.ts
 *
 * Edit the EMAIL, PASSWORD, NAME constants below before running.
 *
 * The password will be hashed with bcrypt before being stored.
 * After running, you can log in at /admin/login with the email + password below.
 *
 * SAFETY: If an admin with the same email already exists, this script
 * updates the password (lets you reset). It does NOT create duplicates.
 */

import mongoose from "mongoose";
import { config } from "../config";
import { AdminUser, hashPassword } from "../models/AdminUser";

// ⚠️ EDIT THESE THREE VALUES BEFORE RUNNING
const EMAIL = "adekeyeolawale123@gmail.com";
const PASSWORD = "Walex1257100@";
const NAME = "Abdulrahman";
const ROLE = "superadmin" as const;

async function seedAdmin() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);

    console.log(`🔑 Hashing password...`);
    const passwordHash = await hashPassword(PASSWORD);

    const existing = await AdminUser.findOne({ email: EMAIL.toLowerCase() });

    if (existing) {
      console.log(`✏️  Admin already exists, updating password + name...`);
      existing.passwordHash = passwordHash;
      existing.name = NAME;
      existing.role = ROLE;
      await existing.save();
      console.log(`   ✅ Updated admin: ${existing.email}`);
    } else {
      console.log(`📦 Creating new admin user...`);
      const created = await AdminUser.create({
        email: EMAIL.toLowerCase(),
        passwordHash,
        name: NAME,
        role: ROLE,
      });
      console.log(`   ✅ Created admin: ${created.email} (id: ${created._id})`);
    }

    console.log("\n🎉 Done!");
    console.log("\nYou can now log in at /admin/login with:");
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log("\n⚠️  IMPORTANT: After logging in, change the password.");
    console.log("    Also delete this script's hardcoded values before commit.");
  } catch (err) {
    console.error("❌ Seed failed:");
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
