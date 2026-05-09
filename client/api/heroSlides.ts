import type { HeroSlide } from "@/types/settings";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

interface BackendHeroSlide extends Omit<HeroSlide, "id"> {
  _id: string;
}

function normalize(raw: BackendHeroSlide): HeroSlide {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const res = await apiFetch<ApiResponse<BackendHeroSlide[]>>("/api/hero-slides");
  return res.data.map(normalize);
}
