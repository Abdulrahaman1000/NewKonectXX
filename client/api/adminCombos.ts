/**
 * Admin combos API — frontend client.
 * Items support both alternatives[] and colors[].
 */

import { apiFetch } from "./client";
import type { Combo } from "@/types/combo";

interface ApiResponse<T> {
  data: T;
}

interface BackendCombo extends Omit<Combo, "id"> {
  _id: string;
}

function normalize(raw: BackendCombo): Combo {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

interface AlternativePayload {
  id?: string;
  name: string;
  badge?: string;
  description?: string;
  images: Array<{ url: string; alt?: string }>;
}

interface ColorPayload {
  id?: string;
  name: string;
  hexCode?: string;
  imageUrl?: string;
}

export interface ComboPayload {
  slug?: string;
  name: string;
  tagline?: string;
  totalPrice: number;
  originalPrice: number;
  badge?: string;
  stockLeft: number;
  isFeatured: boolean;
  isActive: boolean;
  items: Array<{
    id?: string;
    name: string;
    badge?: string;
    individualPrice: number;
    images: Array<{ url: string; alt?: string }>;
    description?: string;
    alternatives?: AlternativePayload[];
    colors?: ColorPayload[];
  }>;
  heroImage?: string;
  categorySlugs: string[];
}

export async function listCombosAdmin(): Promise<Combo[]> {
  const res = await apiFetch<ApiResponse<BackendCombo[]>>("/api/admin/combos");
  return res.data.map(normalize);
}

export async function getComboAdmin(id: string): Promise<Combo> {
  const res = await apiFetch<ApiResponse<BackendCombo>>(`/api/admin/combos/${id}`);
  return normalize(res.data);
}

export async function createCombo(payload: ComboPayload): Promise<Combo> {
  const res = await apiFetch<ApiResponse<BackendCombo>>("/api/admin/combos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function updateCombo(id: string, payload: Partial<ComboPayload>): Promise<Combo> {
  const res = await apiFetch<ApiResponse<BackendCombo>>(`/api/admin/combos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function deleteCombo(id: string): Promise<void> {
  await apiFetch(`/api/admin/combos/${id}`, { method: "DELETE" });
}
