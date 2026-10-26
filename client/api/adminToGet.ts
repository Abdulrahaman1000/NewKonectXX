import { apiFetch } from "./client";

export interface ToGetOrder {
  _id: string;
  orderNumber: string;
  customer: string;
  phone: string;
  paidAt: string;
  promisedBy: string;
  late: boolean;
  items: { name: string; variantSummary: string; quantity: number; leadDaysMin: number; leadDaysMax: number }[];
}

export interface ToGetData {
  list: { name: string; quantity: number; orders: number }[];
  orders: ToGetOrder[];
}

export async function getToGet(): Promise<ToGetData> {
  const r = await apiFetch<{ data: ToGetData }>("/api/admin/to-get");
  return r.data;
}

export const markGotIt = (id: string) =>
  apiFetch<{ data: { _id: string; orderNumber: string } }>(`/api/admin/to-get/${id}/got-it`, {
    method: "POST",
    body: JSON.stringify({}),
  }).then((r) => r.data);
