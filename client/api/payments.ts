/**
 * Payments API — frontend client.
 *
 * Two operations:
 *  1. initializePaystack — gets a Paystack checkout URL for an order
 *  2. verifyPaystack     — confirms a payment after customer returns
 */

import { apiFetch } from "./client";

interface InitResponse {
  data: {
    authorizationUrl: string;
    reference: string;
  };
}

interface VerifyResponse {
  data: {
    paid: boolean;
    status?: string;
    orderNumber?: string;
    amountPaid?: number;
  };
}

export async function initializePaystack(orderNumber: string) {
  const res = await apiFetch<InitResponse>("/api/payments/initialize", {
    method: "POST",
    body: JSON.stringify({ orderNumber }),
  });
  return res.data;
}

export async function verifyPaystackPayment(reference: string) {
  const res = await apiFetch<VerifyResponse>(
    `/api/payments/verify/${encodeURIComponent(reference)}`,
  );
  return res.data;
}
