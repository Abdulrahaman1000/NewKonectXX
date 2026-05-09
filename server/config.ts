/**
 * Server config — single source of truth for environment variables.
 *
 * Fail-fast on missing required vars so we never silently run with bad config.
 */

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required env var: ${name}`);
    console.error(`   Add it to your .env file, then restart the server.`);
    process.exit(1);
  }
  return value;
};

const optional = (name: string, fallback = ""): string => {
  return process.env[name] ?? fallback;
};

export const config = {
  mongodbUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),

  paystack: {
    secretKey: optional("PAYSTACK_SECRET_KEY"),
    publicKey: optional("PAYSTACK_PUBLIC_KEY"),
  },

  // Public site URL — used to build redirect callbacks for the gateway.
  // Defaults to localhost in dev. Set this when deploying.
  siteUrl: optional("SITE_URL", "http://localhost:8080"),
};
