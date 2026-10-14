/**
 * Admin commissions API — frontend client.
 * Destination: client/api/adminCommissions.ts
 */

import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

export type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";

export interface OrderCommission {
  partnerName: string;
  resellerCode: string;
  /** Product price the commission was worked out from (delivery excluded) */
  base: number;
  /** Blended percent actually applied */
  rate: number;
  comboBase: number;
  comboRate: number;
  singleBase: number;
  singleRate: number;
  holdDays: number;
  amount: number;
  paidAt: string | null;
  status: CommissionStatus;
}

/** Commissions for the given orders, keyed by order id. Orders without a partner are absent. */
export async function getCommissionsByOrders(
  ids: string[],
): Promise<Record<string, OrderCommission>> {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return {};
  const res = await apiFetch<ApiResponse<Record<string, OrderCommission>>>(
    `/api/admin/commissions/by-orders?ids=${encodeURIComponent(clean.join(","))}`,
  );
  return res.data;
}

export interface ProgramSettings {
  comboPercent: number;
  singlePercent: number;
  holdDays: number;
  minWithdrawal: number;
}

export async function getProgramSettings(): Promise<ProgramSettings> {
  const res = await apiFetch<ApiResponse<ProgramSettings>>("/api/admin/commissions/settings");
  return res.data;
}

export async function saveProgramSettings(input: ProgramSettings): Promise<ProgramSettings> {
  const res = await apiFetch<ApiResponse<ProgramSettings>>("/api/admin/commissions/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const COMMISSION_STATUS_STYLE: Record<CommissionStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  paid: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/25",
};

export interface PartnerSalesRow {
  orderId: string;
  orderNumber: string;
  date: string;
  customer: string;
  orderStatus: string;
  deliveredAt: string | null;
  orderTotal: number | null;
  base: number;
  rate: number;
  amount: number;
  status: CommissionStatus;
  /** Set when this commission is part of a withdrawal request */
  withdrawalId: string | null;
  paidAt: string | null;
}

export interface PartnerSales {
  partner: {
    id: string; fullName: string; resellerCode: string; status: string;
    phone: string; whatsapp: string; email: string;
    bankName: string; accountNumber: string; accountName: string;
  };
  stats: { clicks: number; orders: number };
  totals: Record<CommissionStatus, number>;
  requested: number;
  cycle: { startedAt: string; releaseAt: string } | null;
  rows: PartnerSalesRow[];
  withdrawals: { id: string; date: string; amount: number; orderCount: number; status: "requested" | "paid" | "rejected"; paidAt: string | null; note: string }[];
}

export async function getPartnerSales(resellerId: string): Promise<PartnerSales> {
  const res = await apiFetch<ApiResponse<PartnerSales>>(`/api/admin/commissions/partner/${resellerId}`);
  return res.data;
}
