/**
 * Central env var access.
 *
 * Importing from here gives us:
 *  - One place to see all required env vars
 *  - Fail-fast: if a required var is missing, the app refuses to start
 *  - Type-safety: the values are typed strings, not `string | undefined`
 *
 * Add new env vars here as the backend grows.
 */

import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Make sure it's defined in your .env file.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  // Server
  nodeEnv: optional("NODE_ENV", "development"),
  port: parseInt(optional("PORT", "8080"), 10),

  // Database
  mongodbUri: required("MONGODB_URI"),

  // Auth
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),

  // Add more vars here as you go:
  // paystackSecretKey: required("PAYSTACK_SECRET_KEY"),
  // cloudinaryCloudName: required("CLOUDINARY_CLOUD_NAME"),
};
