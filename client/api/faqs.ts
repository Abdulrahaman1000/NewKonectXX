import type { FAQ } from "@/types/faq";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

export async function fetchFaqs(): Promise<FAQ[]> {
  const res = await apiFetch<ApiResponse<FAQ[]>>("/api/faqs");
  return res.data;
}
