import { apiFetch } from "./client";

export interface StockItem { id: string; name: string; image: string; stockLeft: number; isActive: boolean; status: "out" | "low" | "ok" }
export interface StockLogRow { id: string; comboName: string; kind: "restock" | "set"; delta: number; before: number; after: number; note: string; createdAt: string }

export async function getStock() {
  const r = await apiFetch<{ data: { items: StockItem[]; lowAt: number; counts: { out: number; low: number } } }>("/api/admin/stock");
  return r.data;
}
export async function getStockAlertCount() {
  const d = await getStock();
  return d.counts.out + d.counts.low;
}
export async function getStockLog() {
  const r = await apiFetch<{ data: StockLogRow[] }>("/api/admin/stock/log");
  return r.data;
}
export const restock = (id: string, quantity: number, note?: string) =>
  apiFetch(`/api/admin/stock/${id}/restock`, { method: "POST", body: JSON.stringify({ quantity, note }) });
export const setStock = (id: string, stockLeft: number, note?: string) =>
  apiFetch(`/api/admin/stock/${id}/set`, { method: "POST", body: JSON.stringify({ stockLeft, note }) });
