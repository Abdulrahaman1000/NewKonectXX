/**
 * Admin partners (resellers) API — frontend client.
 */

import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

export type ResellerStatus = "pending" | "approved" | "suspended";

export interface AdminReseller {
  id: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  channel: string;
  /** Payout details collected at sign-up. Empty for partners who applied before these existed. */
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  /** Private notes for the admin team. */
  adminNotes?: string;
  status: ResellerStatus;
  /** Set the first time the reseller is approved. */
  resellerCode?: string;
  createdAt: string;
  approvedAt?: string;
}

interface BackendReseller extends Omit<AdminReseller, "id"> {
  _id: string;
}

function normalize(raw: BackendReseller): AdminReseller {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export async function listResellersAdmin(params: {
  status?: ResellerStatus;
  q?: string;
}): Promise<AdminReseller[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<ApiResponse<BackendReseller[]>>(`/api/admin/resellers${suffix}`);
  return res.data.map(normalize);
}

export async function getResellerCounts(): Promise<Record<ResellerStatus, number>> {
  const res = await apiFetch<ApiResponse<Record<ResellerStatus, number>>>(
    "/api/admin/resellers/counts",
  );
  return res.data;
}

export async function setResellerStatus(
  id: string,
  status: "approved" | "suspended",
): Promise<AdminReseller> {
  const res = await apiFetch<ApiResponse<BackendReseller>>(`/api/admin/resellers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return normalize(res.data);
}

/** Rejects (deletes) a pending application. The server refuses for anyone already approved. */
export async function deleteReseller(id: string): Promise<void> {
  await apiFetch(`/api/admin/resellers/${id}`, { method: "DELETE" });
}

/** Saves the private admin notes on a partner. */
export async function saveResellerNotes(id: string, adminNotes: string): Promise<AdminReseller> {
  const res = await apiFetch<ApiResponse<BackendReseller>>(`/api/admin/resellers/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ adminNotes }),
  });
  return normalize(res.data);
}
