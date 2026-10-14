/** Partner portal API. Destination: client/api/partner.ts. Uses its own token, separate from admin and customers. */

const TOKEN_KEY = 'smartcombo_partner_token';

export const getPartnerToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const clearPartnerToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

export type CommissionState = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface PartnerDashboard {
  partner: { fullName: string; code: string; bankName: string; accountNumber: string };
  linkPath: string;
  siteUrl: string | null;
  stats: { clicks: number; clicks30: number; orders: number; conversion: number };
  totals: Record<CommissionState, number>;
  withdrawable: number;
  minWithdrawal: number;
  /** Approved money already inside an open withdrawal request */
  requested: number;
  /** Current payout week: starts at the first delivered order, opens at releaseAt */
  cycle: { startedAt: string; releaseAt: string } | null;
  nextPayout: string;
  recent: { orderNumber: string; date: string; amount: number; base: number; status: CommissionState; availableOn: string | null }[];
  withdrawals: { id: string; date: string; amount: number; orders: number; status: 'requested' | 'paid' | 'rejected'; paidAt: string | null; note: string }[];
}

async function call<T>(path: string, init?: RequestInit, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getPartnerToken() ?? ''}`;
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new Error('Could not reach the server. Check your connection.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) clearPartnerToken();
    const err: any = new Error(typeof body?.error === 'string' ? body.error : 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return body.data as T;
}

export async function partnerLogin(email: string, password: string): Promise<void> {
  const { token } = await call<{ token: string }>('/api/partner/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}

export const getPartnerDashboard = () => call<PartnerDashboard>('/api/partner/dashboard', undefined, true);

export interface PartnerAd {
  id: string;
  title: string;
  product: string;
  kind: 'image' | 'video' | 'text';
  url: string;
  whatsappCaption: string;
  instagramCaption: string;
  tiktokCaption: string;
}
export const getPartnerAds = () => call<PartnerAd[]>('/api/partner/ads', undefined, true);

export const requestWithdrawal = () => call<{ id: string; amount: number }>('/api/partner/withdraw', { method: 'POST', body: '{}' }, true);
