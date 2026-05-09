/**
 * Paystack service.
 *
 * Wraps Paystack's REST API for the two operations we need:
 *  1. initialize() — create a payment session, get checkout URL
 *  2. verify()     — confirm a payment was successful (called both on
 *                     return-redirect AND on webhook)
 *
 * Plus webhook signature verification using HMAC SHA512.
 *
 * Paystack docs: https://paystack.com/docs/api/transaction
 */

import crypto from "crypto";
import { config } from "../config";

const PAYSTACK_BASE = "https://api.paystack.co";

interface InitializeArgs {
  email: string;
  amountKobo: number;     // amount in KOBO (1 NGN = 100 kobo)
  reference: string;      // your unique reference (we use orderNumber)
  callbackUrl: string;    // where to send customer after payment
  metadata?: Record<string, any>;
}

export interface PaystackInitResponse {
  authorization_url: string;  // checkout URL to redirect customer to
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: "success" | "failed" | "abandoned";
  amount: number;        // in kobo
  reference: string;
  paid_at: string | null;
  channel: string;       // 'card', 'bank_transfer', 'ussd', etc.
  customer: { email: string };
  metadata?: Record<string, any>;
}

export class PaystackError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function ensureKey() {
  if (!config.paystack.secretKey) {
    throw new PaystackError(
      "Paystack secret key not configured. Set PAYSTACK_SECRET_KEY in .env",
      500,
    );
  }
}

/**
 * Initializes a transaction with Paystack.
 * Returns a checkout URL the frontend redirects the customer to.
 */
export async function initializeTransaction(
  args: InitializeArgs,
): Promise<PaystackInitResponse> {
  ensureKey();

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo,
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: args.metadata,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new PaystackError(
      json?.message || "Paystack initialization failed",
      res.status,
    );
  }

  return json.data as PaystackInitResponse;
}

/**
 * Verifies a transaction status with Paystack.
 * Called when:
 *  - Customer returns from payment page (we re-verify to be safe)
 *  - Webhook fires (we verify the reference, never trust the body alone)
 */
export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyResponse> {
  ensureKey();

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${config.paystack.secretKey}`,
      },
    },
  );

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new PaystackError(
      json?.message || "Paystack verification failed",
      res.status,
    );
  }

  return json.data as PaystackVerifyResponse;
}

/**
 * Verifies a webhook came from Paystack by checking the HMAC SHA512 signature.
 * Without this, anyone could send fake "payment success" requests.
 *
 * Paystack signs the entire raw body with our secret key.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || !config.paystack.secretKey) return false;

  const expected = crypto
    .createHmac("sha512", config.paystack.secretKey)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
