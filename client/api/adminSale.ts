/** Admin: record a sale that did not come through the website checkout (WhatsApp, walk-in, ...). */
import { apiFetch } from "./client";

export type SaleSource = "whatsapp" | "walkin" | "social" | "other";
export type SalePayment = "bank_transfer" | "cash" | "pos";

export const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  walkin: "Walk-in",
  social: "Social media",
  other: "Other",
};

export interface ManualSalePayload {
  items: Array<{ comboId: string; quantity: number; selectedVariants?: Record<string, string> }>;
  customer: { fullName: string; phone: string; email?: string; state?: string; city?: string; street?: string; landmark?: string };
  pickup: boolean;
  source: SaleSource;
  paymentMethod: SalePayment;
  paid: boolean;
  notes?: string;
  ref?: string;
}

export async function createManualSale(payload: ManualSalePayload) {
  const res = await apiFetch<{ data: { _id: string; orderNumber: string; total: number } }>("/api/admin/orders/manual", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
