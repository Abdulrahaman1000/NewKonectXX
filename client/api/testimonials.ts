import type { Testimonial } from "@/types/testimonial";
import { apiFetch } from "./client";

interface ApiResponse<T> {
  data: T;
}

interface BackendTestimonial extends Omit<Testimonial, "id"> {
  _id: string;
}

function normalize(raw: BackendTestimonial): Testimonial {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const res = await apiFetch<ApiResponse<BackendTestimonial[]>>("/api/testimonials");
  return res.data.map(normalize);
}
