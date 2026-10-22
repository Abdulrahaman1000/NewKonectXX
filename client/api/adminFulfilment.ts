import { apiFetch } from "./client";

export type FulfilRoute = "pickup" | "local" | "jumia";

export interface FulfilOrder {
  _id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  source: string;
  total: number;
  shippingFee: number;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  trackingNumber: string;
  trackingProviderUrl: string;
  notes: string;
  adminNotes: string;
  route: FulfilRoute;
  shipping: { fullName: string; phone: string; email?: string; state: string; city: string; street: string; landmark?: string };
  items: { name: string; variantSummary: string; quantity: number; isFreeGift: boolean }[];
}

export async function getFulfilment() {
  const r = await apiFetch<{ data: { toPack: FulfilOrder[]; inTransit: FulfilOrder[] } }>("/api/admin/fulfilment");
  return r.data;
}

const post = (id: string, action: string, body?: object) =>
  apiFetch<{ data: FulfilOrder }>(`/api/admin/fulfilment/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.data);

export const markPacked = (id: string) => post(id, "packed");
export const markShipped = (id: string, trackingNumber?: string, trackingProviderUrl?: string) =>
  post(id, "ship", { trackingNumber, trackingProviderUrl });
export const markDelivered = (id: string) => post(id, "delivered");
