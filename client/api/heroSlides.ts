/**
 * Hero slides API — frontend client.
 *
 * Calls /api/hero-slides and adapts the backend shape to what HeroCarousel expects.
 * Backend returns: { _id, desktopImage, accent, tag, ... }
 * Carousel expects: { id, image, accent, tag }
 *
 * The adapter keeps the existing HeroCarousel component unchanged.
 */

import type { HeroSlide } from "@/types/settings";
import { apiFetch } from "./client";

interface BackendHeroSlide {
  _id: string;
  desktopImage: string;
  mobileImage?: string;
  accent: string;
  tag?: string;
  headline?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  displayOrder: number;
  isActive: boolean;
}

interface ApiResponse<T> {
  data: T;
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const res = await apiFetch<ApiResponse<BackendHeroSlide[]>>("/api/hero-slides");

  return res.data.map((slide) => ({
    id: slide._id,
    image: slide.desktopImage,
    accent: slide.accent,
    tag: slide.tag ?? "",
  }));
}
