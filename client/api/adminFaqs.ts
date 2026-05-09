/**
 * Admin FAQs API — frontend client.
 */

import { apiFetch } from "./client";

interface ApiResponse<T> { data: T; }

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
}

interface BackendFaq {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
}

function normalize(raw: BackendFaq): AdminFaq {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export interface FaqPayload {
  question: string;
  answer: string;
  order?: number;
  isPublished?: boolean;
}

export async function listFaqsAdmin(): Promise<AdminFaq[]> {
  const res = await apiFetch<ApiResponse<BackendFaq[]>>("/api/admin/faqs");
  return res.data.map(normalize);
}

export async function createFaq(payload: FaqPayload): Promise<AdminFaq> {
  const res = await apiFetch<ApiResponse<BackendFaq>>("/api/admin/faqs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function updateFaq(id: string, payload: Partial<FaqPayload>): Promise<AdminFaq> {
  const res = await apiFetch<ApiResponse<BackendFaq>>(`/api/admin/faqs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function deleteFaq(id: string): Promise<void> {
  await apiFetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
}

export async function reorderFaqs(ids: string[]): Promise<AdminFaq[]> {
  const res = await apiFetch<ApiResponse<BackendFaq[]>>("/api/admin/faqs/reorder", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  return res.data.map(normalize);
}
