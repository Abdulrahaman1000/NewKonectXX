/**
 * Remembers, on this phone or computer only, the instalment plans the customer has started,
 * so the site can show a "Pay now" bar until the plan is finished. Nothing secret is stored:
 * order number, phone number (the customer's own), the balance and the pay-by date.
 */
export interface SavedPlan {
  orderNumber: string;
  phone: string;
  total: number;
  paid: number;
  balance: number;
  deadline?: string | null;
  checkedAt?: number;
}

const KEY = 'smartcombo:plans';

export function listSavedPlans(): SavedPlan[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((p) => p && p.orderNumber && p.phone) : [];
  } catch {
    return [];
  }
}

function write(list: SavedPlan[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    /* private mode: the bar simply will not appear */
  }
}

export function savePlan(p: SavedPlan) {
  const rest = listSavedPlans().filter((x) => x.orderNumber !== p.orderNumber);
  write([p, ...rest]);
}

export function removePlan(orderNumber: string) {
  write(listSavedPlans().filter((x) => x.orderNumber !== orderNumber));
}

/** The link that opens this order directly (order number and phone already filled in). */
export function planLink(p: { orderNumber: string; phone: string }) {
  return `${window.location.origin}/order-tracking?order=${encodeURIComponent(p.orderNumber)}&phone=${encodeURIComponent(p.phone)}`;
}
