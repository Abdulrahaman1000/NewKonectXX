/**
 * Combos API — frontend client.
 *
 * MongoDB returns `_id`. We normalize to `id` here so the rest of the app
 * doesn't need to think about it. Now supports filtering by category slug.
 */

import type { Combo } from "@/types/combo";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

interface BackendCombo extends Omit<Combo, "id"> {
  _id: string;
}

function normalizeCombo(raw: BackendCombo): Combo {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export async function fetchCombos(category?: string): Promise<Combo[]> {
  const url = category
    ? `/api/combos?category=${encodeURIComponent(category)}`
    : "/api/combos";
  const res = await apiFetch<ApiResponse<BackendCombo[]>>(url);
  return res.data.map(normalizeCombo);
}

export async function fetchFeaturedCombo(): Promise<Combo | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendCombo>>("/api/combos/featured");
    return normalizeCombo(res.data);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function fetchComboBySlug(slug: string): Promise<Combo | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendCombo>>(`/api/combos/${slug}`);
    return normalizeCombo(res.data);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}
