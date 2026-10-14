/** Admin withdrawals API. Destination: client/api/adminWithdrawals.ts */
import { apiFetch } from "./client";

export type WithdrawalStatus = "requested" | "paid" | "rejected";

export interface AdminWithdrawal {
  id: string;
  resellerId: string;
  partnerName: string;
  resellerCode: string;
  amount: number;
  orderCount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  paidAmount: number | null;
  paidAt: string | null;
  adminNote: string;
  createdAt: string;
}

interface ApiResponse<T> { data: T }

export async function listWithdrawals(status: WithdrawalStatus) {
  return (await apiFetch<ApiResponse<{ items: AdminWithdrawal[]; counts: { requested: number } }>>(
    `/api/admin/withdrawals?status=${status}`,
  )).data;
}
export async function markWithdrawalPaid(id: string) {
  return (await apiFetch<ApiResponse<AdminWithdrawal>>(`/api/admin/withdrawals/${id}/pay`, { method: "PATCH", body: "{}" })).data;
}
export async function rejectWithdrawal(id: string, note: string) {
  return (await apiFetch<ApiResponse<AdminWithdrawal>>(`/api/admin/withdrawals/${id}/reject`, { method: "PATCH", body: JSON.stringify({ note }) })).data;
}
