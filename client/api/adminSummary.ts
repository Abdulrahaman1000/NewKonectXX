import { apiFetch } from "./client";

export interface DaySummary {
  day: "today" | "yesterday";
  date: string;
  orders: number;
  manualOrders: number;
  revenue: number;
  profit: number | null;
  profitCoverage: { costed: number; total: number };
  expenses: number;
  bestSellers: { name: string; units: number }[];
  toPack: number;
  oldestToPackHours: number;
  unpaid: number;
  lowStock: { name: string; stockLeft: number }[];
  commissionOwed: number;
  commissionPending: number;
  sendHour: number;
}

export async function getSummary(day: "today" | "yesterday") {
  const r = await apiFetch<{ data: DaySummary }>(`/api/admin/summary?day=${day}`);
  return r.data;
}
export const sendSummaryNow = (day: "today" | "yesterday") =>
  apiFetch<{ data: { message: string; to?: string } }>("/api/admin/summary/send", { method: "POST", body: JSON.stringify({ day }) });
