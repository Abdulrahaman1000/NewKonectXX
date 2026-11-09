/** SC-REM  Renewal reminders and the low-wallet alert. Customer sign-in token required. */
import { getCustomerToken } from '@/lib/customerSession';

const BASE = (import.meta as any).env?.VITE_API_URL ?? '';

export interface Reminder {
  id: string; service: 'airtime' | 'data' | 'electricity' | 'tv'; label: string; everyDays: number; paused: boolean;
  lastAt: string; dueAt: string; daysLeft: number; state: 'due' | 'soon' | 'later' | 'paused';
  draft: Record<string, any>; // what to put back in the Pay form for "Buy again"
}
export interface RemindersView { reminders: Reminder[]; lowBalance: number }

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getCustomerToken(); if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/api/reminders${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data: any = null; try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data?.error?.message || 'Something went wrong. Please try again.');
  return data as T;
}
export const getReminders = () => call<RemindersView>('/');
export const addReminder = (reference: string, everyDays: number) => call<{ reminder: Reminder | null }>('/', 'POST', { reference, everyDays });
export const changeReminder = (id: string, patch: { everyDays?: number; paused?: boolean }) => call<{ reminder: Reminder | null }>(`/${encodeURIComponent(id)}`, 'PATCH', patch);
export const deleteReminder = (id: string) => call<{ ok: boolean }>(`/${encodeURIComponent(id)}`, 'DELETE');
export const setLowBalance = (amount: number) => call<{ lowBalance: number }>('/low', 'PUT', { amount });

export const dueText = (r: Pick<Reminder, 'daysLeft' | 'state'>) =>
  r.state === 'paused' ? 'Paused' : r.daysLeft < 0 ? `Overdue by ${-r.daysLeft} ${r.daysLeft === -1 ? 'day' : 'days'}` : r.daysLeft === 0 ? 'Due today' : r.daysLeft === 1 ? 'Due tomorrow' : `Due in ${r.daysLeft} days`;
