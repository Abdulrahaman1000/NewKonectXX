/** SC-SPEND  The signed-in customer's bill purchases, up to 500, for the My spending page. */
import { getCustomerToken } from '@/lib/customerSession';
import type { VtuView } from '@/api/vtu';

const BASE = (import.meta as any).env?.VITE_API_URL ?? '';

export async function myAllPurchases(): Promise<VtuView[]> {
  const t = getCustomerToken();
  const res = await fetch(`${BASE}/api/vtu/mine?limit=500`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data?.error?.message || 'Could not load your purchases.');
  return (data?.orders ?? []) as VtuView[];
}
