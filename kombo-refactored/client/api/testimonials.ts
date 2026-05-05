import type { Testimonial } from '@/types/testimonial';
import { getPublishedTestimonials } from '@/data/testimonials';

export async function fetchTestimonials(): Promise<Testimonial[]> {
  // TODO: return apiFetch<Testimonial[]>('/api/testimonials');
  return Promise.resolve(getPublishedTestimonials());
}
