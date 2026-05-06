import type { SiteSettings } from "@/types/settings";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

export async function fetchSettings(): Promise<SiteSettings> {
  const res = await apiFetch<ApiResponse<SiteSettings>>("/api/settings");
  return res.data;
}
