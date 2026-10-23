/** SC-STAFF2  Bookkeeping API: expenses, sales report, CSV download. */
import { apiFetch } from "./client";
import { getToken } from "@/lib/auth";
import type { Expense, ExpenseCategory } from "./adminProfit";

interface ApiResponse<T> { data: T }
const BASE = import.meta.env.VITE_API_URL ?? "";

export interface SalesReportRow {
  _id: string; orderNumber: string; createdAt: string; status: string;
  paymentMethod: string; source: string; city: string;
  subtotal: number; shippingFee: number; total: number;
}
export interface SalesReport {
  from: string; to: string;
  totals: { orders: number; sales: number; deliveryFees: number; collected: number };
  byMethod: Record<string, { orders: number; total: number }>;
  bySource: Record<string, { orders: number; total: number }>;
  byStatus: Record<string, number>;
  expenses: { total: number; byCategory: Record<string, number> };
  orders: SalesReportRow[];
  truncated: boolean;
}

export const listBookExpenses = (from: string, to: string) =>
  apiFetch<ApiResponse<Expense[]>>(`/api/admin/bookkeeping/expenses?from=${from}&to=${to}`).then((r) => r.data);

export const addBookExpense = (p: { date: string; category: ExpenseCategory; amount: number; note?: string }) =>
  apiFetch<ApiResponse<Expense>>("/api/admin/bookkeeping/expenses", { method: "POST", body: JSON.stringify(p) }).then((r) => r.data);

export const deleteBookExpense = (id: string) =>
  apiFetch(`/api/admin/bookkeeping/expenses/${id}`, { method: "DELETE" });

export const getSalesReport = (from: string, to: string) =>
  apiFetch<ApiResponse<SalesReport>>(`/api/admin/bookkeeping/report?from=${from}&to=${to}`).then((r) => r.data);

/** Downloads a CSV (needs the login token, so a plain link would not work). */
export async function downloadCsv(kind: "orders" | "expenses", from: string, to: string) {
  const res = await fetch(`${BASE}/api/admin/bookkeeping/export/${kind}.csv?from=${from}&to=${to}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ""}` },
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-${from}-to-${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
