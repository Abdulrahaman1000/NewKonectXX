/**
 * Combos API — frontend client.
 *
 * Adds searchCombos() for the header search bar.
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

export async function fetchCombos(category?: string): Promise<Combo[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await apiFetch<ApiResponse<BackendCombo[]>>(`/api/combos${qs}`);
  return res.data.map(normalize);
}

export async function fetchComboBySlug(slug: string): Promise<Combo> {
  const res = await apiFetch<ApiResponse<BackendCombo>>(`/api/combos/${slug}`);
  return normalize(res.data);
}

export async function fetchFeaturedCombo(): Promise<Combo | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendCombo>>("/api/combos/featured");
    return res.data ? normalize(res.data) : null;
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Search combos by name/tagline. Used by the header search bar.
 * Returns up to 8 active combos matching the query.
 */
export async function searchCombos(query: string, limit = 8): Promise<Combo[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `/api/combos/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`;
  const res = await apiFetch<ApiResponse<BackendCombo[]>>(url);
  return res.data.map(normalize);
}
