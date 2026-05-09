import type { FAQ } from "@/types/faq";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

interface BackendFaq extends Omit<FAQ, "id"> {
  _id: string;
}

function normalize(raw: BackendFaq): FAQ {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export async function fetchFaqs(): Promise<FAQ[]> {
  const res = await apiFetch<ApiResponse<BackendFaq[]>>("/api/faqs");
  return res.data.map(normalize);
}
