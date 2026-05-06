import type { Testimonial } from "@/types/testimonial";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const res = await apiFetch<ApiResponse<Testimonial[]>>("/api/testimonials");
  return res.data;
}
