/**
 * Admin testimonials API — frontend client.
 */

import { apiFetch } from "./client";

interface ApiResponse<T> { data: T; }

export interface AdminTestimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  isVerified: boolean;
  isPublished: boolean;
}

interface BackendTestimonial {
  _id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  isVerified: boolean;
  isPublished: boolean;
}

function normalize(raw: BackendTestimonial): AdminTestimonial {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export interface TestimonialPayload {
  name: string;
  location: string;
  rating: number;
  text: string;
  isVerified?: boolean;
  isPublished?: boolean;
}

export async function listTestimonialsAdmin(): Promise<AdminTestimonial[]> {
  const res = await apiFetch<ApiResponse<BackendTestimonial[]>>("/api/admin/testimonials");
  return res.data.map(normalize);
}

export async function createTestimonial(payload: TestimonialPayload): Promise<AdminTestimonial> {
  const res = await apiFetch<ApiResponse<BackendTestimonial>>("/api/admin/testimonials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function updateTestimonial(id: string, payload: Partial<TestimonialPayload>): Promise<AdminTestimonial> {
  const res = await apiFetch<ApiResponse<BackendTestimonial>>(`/api/admin/testimonials/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function deleteTestimonial(id: string): Promise<void> {
  await apiFetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
}
