/** Admin profit & expenses API. */
import { apiFetch } from "./client";

export type ExpenseCategory = "ads" | "packaging" | "delivery" | "transport" | "software" | "other";

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  ads: "Ads",
  packaging: "Packaging",
  delivery: "Delivery",
  transport: "Transport",
  software: "Software / tools",
  other: "Other",
};

export interface ProfitReport {
  from: string;
  to: string;
  orders: { total: number; costed: number; uncosted: number };
  sales: number;
  deliveryFees: number;
  costOfGoods: number;
  grossProfit: number;
  marginPercent: number;
  expensesTotal: number;
  expensesByCategory: Record<string, number>;
  partnerCommissions: number;
  netProfit: number;
  products: Array<{ name: string; units: number; revenue: number; cost: number; profit: number }>;
}

export interface Expense {
  _id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
}

export interface OrderCostInfo {
  lines: Array<{ name: string; quantity: number; unitPrice: number; unitCost: number; isFreeGift: boolean; known: boolean }>;
  totalCost: number;
  complete: boolean;
}

interface ApiResponse<T> { data: T }

export async function getProfitReport(from: string, to: string) {
  return (await apiFetch<ApiResponse<ProfitReport>>(`/api/admin/profit/report?from=${from}&to=${to}`)).data;
}
export async function listExpenses(from: string, to: string) {
  return (await apiFetch<ApiResponse<Expense[]>>(`/api/admin/profit/expenses?from=${from}&to=${to}`)).data;
}
export async function addExpense(payload: { date: string; category: ExpenseCategory; amount: number; note?: string }) {
  return (await apiFetch<ApiResponse<Expense>>("/api/admin/profit/expenses", { method: "POST", body: JSON.stringify(payload) })).data;
}
export async function deleteExpense(id: string) {
  await apiFetch(`/api/admin/profit/expenses/${id}`, { method: "DELETE" });
}
export async function recalculateCosts(from: string, to: string) {
  return (await apiFetch<ApiResponse<{ tried: number; fixed: number; stillMissing: number }>>("/api/admin/profit/recalculate", { method: "POST", body: JSON.stringify({ from, to }) })).data;
}
export async function getOrderCost(orderId: string) {
  return (await apiFetch<ApiResponse<OrderCostInfo | null>>(`/api/admin/profit/order/${orderId}`)).data;
}
