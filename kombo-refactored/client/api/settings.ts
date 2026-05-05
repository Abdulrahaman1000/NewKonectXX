import type { SiteSettings } from '@/types/settings';
import { SETTINGS } from '@/data/settings';

export async function fetchSettings(): Promise<SiteSettings> {
  // TODO: return apiFetch<SiteSettings>('/api/settings');
  return Promise.resolve(SETTINGS);
}
