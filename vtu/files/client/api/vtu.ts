/** SC-VTU  Recharge calls. Public ones use plain fetch (the customer's token is added only if signed in). Admin ones use the admin client. */
import { apiFetch } from '@/api/client';
import { getCustomerToken } from '@/lib/customerSession';

const BASE = (import.meta as any).env?.VITE_API_URL ?? '';

export type Service = 'airtime' | 'data' | 'electricity';
export interface Catalog {
  enabled: boolean; simulated: boolean; networks: string[];
  airtime: { min: number; max: number };
  electricity: { min: number; max: number; fee: number; discos: { code: string; name: string }[] };
}
export interface Plan { code: string; name: string; validity: string; category: 'daily' | 'weekly' | 'monthly'; price: number }
export interface VtuView {
  reference: string; service: Service; network: string; planName: string; phone: string;
  meter: { number: string; type: string; name: string } | null; amount: number;
  paymentStatus: 'pending' | 'paid' | 'mismatch' | 'failed'; fulfilmentStatus: 'pending' | 'processing' | 'successful' | 'failed';
  token: string; units: string; message: string; refundStatus: string; createdAt: string;
}

async function pub<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getCustomerToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/api/vtu${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data?.error?.message || 'Something went wrong. Please try again.');
  return data as T;
}

export const getCatalog = () => pub<Catalog>('/catalog');
export const getPlans = (network: string) => pub<{ plans: Plan[] }>(`/plans/${encodeURIComponent(network)}`).then((r) => r.plans);
export const checkMeter = (disco: string, meterType: string, meter: string) =>
  pub<{ ok: boolean; name?: string; address?: string; message?: string }>('/verify-meter', 'POST', { disco, meterType, meter });
export const startPurchase = (b: Record<string, unknown>) => pub<{ reference: string; amount: number; authorizationUrl: string }>('/orders', 'POST', b);
export const getPurchase = (reference: string) => pub<{ order: VtuView }>(`/orders/${encodeURIComponent(reference)}`).then((r) => r.order);

// ---- admin ----
export interface AdminVtuOrder extends VtuView { _id: string; cost: number; email: string; providerReference: string; refundNote: string; attempts: number; providerMessage: string; paymentReference: string }
export interface AdminSummary { sales: number; profit: number; count: number; processing: number; refundsNeeded: number; mismatches: number }
export interface VtuSettings { airtimeDiscountPct: number; dataMarginPct: number; electricityFee: number; airtimeMin: number; airtimeMax: number; electricityMin: number; electricityMax: number; paused: boolean }
export const adminVtuList = (filter: string) => apiFetch<{ summary: AdminSummary; orders: AdminVtuOrder[] }>(`/api/admin/vtu?filter=${filter}`);
export const adminVtuSettings = () => apiFetch<{ settings: VtuSettings }>('/api/admin/vtu/settings').then((r) => r.settings);
export const adminVtuSaveSettings = (s: Partial<VtuSettings>) => apiFetch<{ settings: VtuSettings }>('/api/admin/vtu/settings', { method: 'PUT', body: JSON.stringify(s) });
export const adminVtuAct = (reference: string, action: 'check' | 'refund' | 'mark-refunded' | 'mark-failed') =>
  apiFetch<{ order: AdminVtuOrder }>(`/api/admin/vtu/${encodeURIComponent(reference)}/${action}`, { method: 'POST', body: JSON.stringify({}) });
