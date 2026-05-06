/**
 * MongoDB connection.
 *
 * Called once on server startup. If the connection fails, the server exits
 * — there's no point running the app without a database.
 */

import mongoose from "mongoose";
import { config } from "./config";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri, {
      // Fail fast if the database is unreachable, instead of hanging
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:");
    console.error(err);
    process.exit(1);
  }

  // Listen for runtime connection events (e.g. network drops)
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected. Mongoose will auto-retry.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });
}