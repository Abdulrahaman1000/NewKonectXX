/** SC-WAL  Wallet calls. Customer ones need the customer's sign-in token; admin ones use the admin client. */
import { apiFetch } from '@/api/client';
import { getCustomerToken } from '@/lib/customerSession';

const BASE = (import.meta as any).env?.VITE_API_URL ?? '';

export interface WalletEntry { ref: string; kind: 'fund' | 'spend' | 'refund' | 'referral' | 'bonus' | 'adjust'; amount: number; note: string; orderRef?: string; at: string }
export interface WalletView { balance: number; history: WalletEntry[] }

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getCustomerToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/api/wallet${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data?.error?.message || 'Something went wrong. Please try again.');
  return data as T;
}

export const hasCustomerToken = () => !!getCustomerToken();
export const getWallet = () => call<WalletView>('/');
export const fundWallet = (amount: number) => call<{ reference: string; amount: number; authorizationUrl: string }>('/fund', 'POST', { amount });
export const checkFunding = (reference: string) => call<{ reference: string; status: 'pending' | 'paid' | 'failed' | 'mismatch'; amount: number; balance: number }>(`/fund/${encodeURIComponent(reference)}`);

// ---- admin ----
export interface AdminWalletRow { customerId: string; email: string; balance: number }
export interface AdminWalletSummary { totalOwed: number; wallets: number; withBalance: number; list: AdminWalletRow[] }
export const adminWallets = (q = '') => apiFetch<AdminWalletSummary>(`/api/admin/wallet?q=${encodeURIComponent(q)}`);
export const adminWalletHistory = (customerId: string) => apiFetch<{ balance: number; history: WalletEntry[] }>(`/api/admin/wallet/${encodeURIComponent(customerId)}`);
export const adminWalletAdjust = (b: { email: string; amount: number; kind: 'referral' | 'bonus' | 'adjust'; note?: string }) =>
  apiFetch<{ balance: number }>('/api/admin/wallet/adjust', { method: 'POST', body: JSON.stringify(b) });
