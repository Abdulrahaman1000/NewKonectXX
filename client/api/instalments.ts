/**
 * Pay in instalments (SC-INST): client calls. Customer side and admin side.
 */
import { apiFetch } from "./client";

interface R<T> {
  data: T;
}

export interface PartOption {
  parts: number;
  firstAmount: number;
  laterEach: number;
}
export interface InstallmentQuote {
  kind: "A" | "B";
  days: number;
  total: number;
  minFirst: number;
  maxPayments: number;
  minLater: number;
  options: PartOption[];
}
export interface QuoteResult {
  eligible: boolean;
  reason: string;
  goodsPrice?: number;
  shippingFee?: number;
  total?: number;
  quote?: InstallmentQuote | null;
}

/** What instalment choices this cart has. Returns null if the server cannot tell. */
export async function getInstallmentQuote(
  items: Array<{ comboId: string; quantity: number }>,
  city: string,
): Promise<QuoteResult | null> {
  try {
    const res = await apiFetch<R<QuoteResult>>("/api/orders/installment-quote", {
      method: "POST",
      body: JSON.stringify({ items: items.map((i) => ({ comboId: i.comboId, quantity: i.quantity })), city }),
    });
    return res.data;
  } catch {
    return null;
  }
}

/** Starts a Paystack payment for part of an instalment order. Returns the page to send the customer to. */
export async function payInstalment(orderNumber: string, amount: number): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await apiFetch<R<{ authorizationUrl: string; reference: string }>>("/api/payments/initialize", {
    method: "POST",
    body: JSON.stringify({ orderNumber, amount }),
  });
  return res.data;
}

/** The customer asks for 3 to 7 extra days (once). */
export async function askExtraDays(orderNumber: string, phone: string, days: number) {
  const res = await apiFetch<R<{ deadline: string; extensionDays: number }>>("/api/orders/extension", {
    method: "POST",
    body: JSON.stringify({ orderNumber, phone, days }),
  });
  return res.data;
}

/* ------------------------------ admin ------------------------------ */

export interface AdminPlan {
  orderNumber: string;
  customer: string;
  phone: string;
  email: string;
  itemName: string;
  total: number;
  createdAt: string;
  status: "awaiting_first" | "active" | "paid" | "lapsed";
  kind: "A" | "B";
  paidTotal: number;
  balance: number;
  payments: Array<{ amount: number; paidAt: string }>;
  deadline: string | null;
  daysLeft: number | null;
  overdue: boolean;
  readyToLapse: boolean;
  extensionDays: number;
  dueSoon: boolean;
}
export interface PlanCounts {
  active: number;
  overdue: number;
  dueSoon: number;
  readyToLapse: number;
}
export interface AdminCredit {
  id: string;
  phone: string;
  name: string;
  orderNumber: string;
  amount: number;
  usedAmount: number;
  remaining: number;
  expiresAt: string;
  expired: boolean;
  note: string;
  createdAt: string;
}

export async function listInstalments(filter: string): Promise<AdminPlan[]> {
  const res = await apiFetch<R<AdminPlan[]>>(`/api/admin/orders/installments?filter=${encodeURIComponent(filter)}`);
  return res.data;
}
export async function getInstalmentCounts(): Promise<PlanCounts> {
  const res = await apiFetch<R<PlanCounts>>("/api/admin/orders/installments-counts");
  return res.data;
}
export async function giveMoreDays(orderNumber: string, days: number) {
  await apiFetch(`/api/admin/orders/installments/${encodeURIComponent(orderNumber)}/days`, {
    method: "POST",
    body: JSON.stringify({ days }),
  });
}
export async function closePlan(orderNumber: string) {
  const res = await apiFetch<R<{ status: string; creditAmount: number }>>(
    `/api/admin/orders/installments/${encodeURIComponent(orderNumber)}/lapse`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return res.data;
}
export async function listCredits(): Promise<AdminCredit[]> {
  const res = await apiFetch<R<AdminCredit[]>>("/api/admin/orders/credits");
  return res.data;
}
export async function spendCredit(id: string, amount: number, note: string) {
  await apiFetch(`/api/admin/orders/credits/${encodeURIComponent(id)}/use`, {
    method: "POST",
    body: JSON.stringify({ amount, note }),
  });
}

/** Admin: ask Paystack again about payments the customer started, and count the ones that went through. */
export async function checkPlanPayments(orderNumber: string) {
  const res = await apiFetch<R<{ checked: number; recorded: number; notPaid: number; problems: string[]; paidTotal: number; complete: boolean }>>(
    `/api/admin/orders/installments/${encodeURIComponent(orderNumber)}/check`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return res.data;
}
