/** SC-ACCT  Customer account calls. Plain fetch so the admin token is never sent here. */
import { clearCustomerToken, getCustomerToken } from "@/lib/customerSession";

const BASE = (import.meta as any).env?.VITE_API_URL ?? "";

export interface Customer { id: string; email: string; name: string; phone: string; needsProfile: boolean }
export interface AccountOrder {
  orderNumber: string; createdAt: string; status: string; total: number; itemCount: number; firstItem: string;
  plan: { status: string; paidTotal: number; deadline: string | null } | null;
}

async function call<T>(path: string, method = "GET", body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = getCustomerToken();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/api/account${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    if (res.status === 401 && auth) clearCustomerToken();
    throw new Error(data?.error?.message || "Something went wrong. Please try again.");
  }
  return data as T;
}

export const requestCode = (email: string) => call<{ sent: boolean; minutes: number }>("/request-code", "POST", { email }, false);
export const verifyCode = (email: string, code: string) => call<{ token: string; customer: Customer }>("/verify-code", "POST", { email, code }, false);
export const fetchMe = () => call<{ customer: Customer }>("/me");
export const saveProfile = (name: string, phone: string) => call<{ customer: Customer }>("/me", "PUT", { name, phone });
export const fetchMyOrders = () => call<{ orders: AccountOrder[] }>("/orders");
export const addOrder = (orderNumber: string, phone: string) => call<{ order: AccountOrder }>("/orders/add", "POST", { orderNumber, phone });
