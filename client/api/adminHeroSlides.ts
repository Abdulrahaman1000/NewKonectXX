/**
 * Admin hero slides API — frontend client.
 * Uses the existing schema field names.
 */

import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

export interface AdminHeroSlide {
  id: string;
  desktopImage: string;
  mobileImage?: string;
  tag?: string;
  headline?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  accent: string;
  displayOrder: number;
  isActive: boolean;
}

interface BackendSlide {
  _id: string;
  desktopImage: string;
  mobileImage?: string;
  tag?: string;
  headline?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  accent: string;
  displayOrder: number;
  isActive: boolean;
}

function normalize(raw: BackendSlide): AdminHeroSlide {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export interface HeroSlidePayload {
  desktopImage: string;
  mobileImage?: string;
  tag?: string;
  headline?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  accent?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export async function listHeroSlidesAdmin(): Promise<AdminHeroSlide[]> {
  const res = await apiFetch<ApiResponse<BackendSlide[]>>("/api/admin/hero-slides");
  return res.data.map(normalize);
}

export async function createHeroSlide(payload: HeroSlidePayload): Promise<AdminHeroSlide> {
  const res = await apiFetch<ApiResponse<BackendSlide>>("/api/admin/hero-slides", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function updateHeroSlide(
  id: string,
  payload: Partial<HeroSlidePayload>,
): Promise<AdminHeroSlide> {
  const res = await apiFetch<ApiResponse<BackendSlide>>(`/api/admin/hero-slides/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function deleteHeroSlide(id: string): Promise<void> {
  await apiFetch(`/api/admin/hero-slides/${id}`, { method: "DELETE" });
}

export async function reorderHeroSlides(ids: string[]): Promise<AdminHeroSlide[]> {
  const res = await apiFetch<ApiResponse<BackendSlide[]>>(
    "/api/admin/hero-slides/reorder",
    { method: "POST", body: JSON.stringify({ ids }) },
  );
  return res.data.map(normalize);
}
