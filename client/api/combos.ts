/**
 * Combos API — frontend client.
 *
 * Calls the real backend at /api/combos.
 *
 * MongoDB documents come back with `_id` (24-char hex). The frontend Combo
 * type uses `id`. We normalize once here so the rest of the app doesn't
 * need to think about it.
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

export async function fetchCombos(): Promise<Combo[]> {
  const res = await apiFetch<ApiResponse<BackendCombo[]>>("/api/combos");
  return res.data.map(normalizeCombo);
}

export async function fetchFeaturedCombo(): Promise<Combo | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendCombo>>(
      "/api/combos/featured",
    );
    return normalizeCombo(res.data);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function fetchComboBySlug(slug: string): Promise<Combo | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendCombo>>(
      `/api/combos/${slug}`,
    );
    return normalizeCombo(res.data);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}
