import type { FAQ } from '@/types/faq';
import { getPublishedFaqs } from '@/data/faqs';

export async function fetchFaqs(): Promise<FAQ[]> {
  // TODO: return apiFetch<FAQ[]>('/api/faqs');
  return Promise.resolve(getPublishedFaqs());
}
