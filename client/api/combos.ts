/**
 * Combos API.
 *
 * Right now: returns hardcoded data from data/combos.ts.
 * Later: replace each function body with apiFetch() calls.
 *
 * The signatures will not change — that's the whole point.
 */

import type { Combo } from '@/types/combo';
import {
  COMBOS,
  getActiveCombos,
  getComboBySlug,
  getFeaturedCombo,
} from '@/data/combos';
// import { apiFetch } from './client'; // ← uncomment when backend exists

export async function fetchCombos(): Promise<Combo[]> {
  // TODO: replace with: return apiFetch<Combo[]>('/api/combos');
  return Promise.resolve(getActiveCombos());
}

export async function fetchFeaturedCombo(): Promise<Combo | null> {
  // TODO: replace with: return apiFetch<Combo>('/api/combos/featured');
  return Promise.resolve(getFeaturedCombo() ?? null);
}

export async function fetchComboBySlug(slug: string): Promise<Combo | null> {
  // TODO: replace with: return apiFetch<Combo>(`/api/combos/${slug}`);
  return Promise.resolve(getComboBySlug(slug) ?? null);
}
