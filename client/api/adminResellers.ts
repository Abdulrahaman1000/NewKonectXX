/**
 * Admin Resellers API — frontend client.
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
  status: ResellerStatus;
  /** Set the first time the Reseller is approved. */
  ResellerCode?: string;
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
  const res = await apiFetch<ApiResponse<BackendReseller[]>>(`/api/admin/Resellers${suffix}`);
  return res.data.map(normalize);
}

export async function getResellerCounts(): Promise<Record<ResellerStatus, number>> {
  const res = await apiFetch<ApiResponse<Record<ResellerStatus, number>>>(
    "/api/admin/Resellers/counts",
  );
  return res.data;
}

export async function setResellerStatus(
  id: string,
  status: "approved" | "suspended",
): Promise<AdminReseller> {
  const res = await apiFetch<ApiResponse<BackendReseller>>(`/api/admin/Resellers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return normalize(res.data);
}

/** Rejects (deletes) a pending application. The server refuses for anyone already approved. */
export async function deleteReseller(id: string): Promise<void> {
  await apiFetch(`/api/admin/Resellers/${id}`, { method: "DELETE" });
}
