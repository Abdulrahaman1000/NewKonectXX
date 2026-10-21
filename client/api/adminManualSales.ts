/** Admin "Record a sale" API. */
import { apiFetch } from "./client";

export interface ManualSalePayload {
  items: Array<{ comboId: string; quantity: number; selectedVariants?: Record<string, string> }>;
  customer: { fullName: string; phone: string; email?: string; state?: string; city: string; street?: string; landmark?: string };
  source: "whatsapp" | "walk_in" | "social" | "other";
  paymentType: "bank_transfer" | "cash" | "pos" | "other";
  paid: boolean;
  pickup?: boolean;
  partnerCode?: string;
  notes?: string;
}

export interface ManualSaleResult {
  id: string;
  orderNumber: string;
  total: number;
  shippingFee: number;
  status: string;
  commission: { code: string; amount: number } | null;
  partnerWarning: string | null;
}

export async function createManualSale(payload: ManualSalePayload): Promise<ManualSaleResult> {
  const res = await apiFetch<{ data: ManualSaleResult }>("/api/admin/manual-sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/** How much this phone number has already spent toward the free gift (same endpoint the checkout uses). */
export async function getGiftProgress(phone: string) {
  const res = await apiFetch<{ data: { spent: number; threshold: number; remaining: number } }>(
    `/api/orders/gift-progress?phone=${encodeURIComponent(phone)}`,
  );
  return res.data;
}
