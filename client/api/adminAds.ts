/** Admin ads API. Destination: client/api/adminAds.ts */
import { apiFetch } from "./client";

export type AdKind = "image" | "video" | "text";

export interface AdminAd {
  id: string;
  title: string;
  product: string;
  kind: AdKind;
  url: string;
  whatsappCaption: string;
  instagramCaption: string;
  tiktokCaption: string;
  active: boolean;
  createdAt: string;
}

export interface NewAd {
  title: string;
  product?: string;
  url?: string;
  whatsappCaption?: string;
  instagramCaption?: string;
  tiktokCaption?: string;
  active?: boolean;
}

interface ApiResponse<T> { data: T }

export async function listAds(): Promise<AdminAd[]> {
  return (await apiFetch<ApiResponse<AdminAd[]>>("/api/admin/ads")).data;
}
export async function createAd(input: NewAd): Promise<AdminAd> {
  return (await apiFetch<ApiResponse<AdminAd>>("/api/admin/ads", { method: "POST", body: JSON.stringify(input) })).data;
}
export async function updateAd(id: string, patch: Partial<NewAd>): Promise<AdminAd> {
  return (await apiFetch<ApiResponse<AdminAd>>(`/api/admin/ads/${id}`, { method: "PUT", body: JSON.stringify(patch) })).data;
}
export async function deleteAd(id: string): Promise<void> {
  await apiFetch(`/api/admin/ads/${id}`, { method: "DELETE" });
}
