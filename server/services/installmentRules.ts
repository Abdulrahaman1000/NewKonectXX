/**
 * SC-INST  Pay in instalments: the rules, as pure functions (no database).
 *
 * Owner's rules (26 Oct 2026):
 *  - Plan A: goods N10,000 to N50,000. All paid within 30 days.
 *  - Plan B: goods N50,001 to N200,000. All paid within 60 days.
 *  - Single product or combo only (one cart line), paid online, not bulk, not pre-order.
 *  - Goods are sent only after the full amount is paid.
 *  - No refund after any part payment. A plan that is not completed becomes store credit (see installments.ts).
 *  - If the time runs out the customer may ask for 3 to 7 extra days, once.
 *
 * Numbers marked "proposed" are my suggestion and wait for the owner's yes. Change them here only.
 */

export type PlanKind = "A" | "B";
export type PlanStatus = "awaiting_first" | "active" | "paid" | "lapsed";

export const INSTALLMENT_RULES = {
  A: { minPrice: 10_000, maxPrice: 50_000, days: 30, minFirstPct: 50, maxPayments: 3 }, // proposed: 50% first, 3 payments
  B: { minPrice: 50_001, maxPrice: 200_000, days: 60, minFirstPct: 40, maxPayments: 4 }, // proposed: 40% first, 4 payments
  minLater: 5_000, // proposed: smallest later payment (or the balance if it is smaller)
  extMin: 3, // customer extension: 3 to 7 days, once
  extMax: 7,
  extOpenDaysBefore: 3, // the customer can ask for extra days from 3 days before the deadline
  lapseGraceDays: 7, // after the deadline (with any extension) the admin is told "ready to lapse" this many days later
  creditDays: 90, // store credit from a lapsed plan is valid this long
  termsVersion: "2026-10-26",
} as const;

const DAY = 86_400_000;
export const roundUp100 = (n: number) => Math.ceil(n / 100) * 100;

/** Which plan the goods price falls in (price of the goods, delivery not counted), or null. */
export function planKindFor(goodsPrice: number): PlanKind | null {
  const p = Math.round(goodsPrice);
  if (p >= INSTALLMENT_RULES.A.minPrice && p <= INSTALLMENT_RULES.A.maxPrice) return "A";
  if (p >= INSTALLMENT_RULES.B.minPrice && p <= INSTALLMENT_RULES.B.maxPrice) return "B";
  return null;
}

export interface PartOption {
  parts: number;
  firstAmount: number;
  /** what each later payment would be if split evenly (the last one is the exact balance) */
  laterEach: number;
}

export interface InstallmentQuote {
  kind: PlanKind;
  days: number;
  total: number;
  minFirst: number;
  maxPayments: number;
  minLater: number;
  options: PartOption[];
}

/** minimum first payment for a total (rounded up to N100) */
export function minFirstFor(kind: PlanKind, total: number): number {
  return Math.min(total, roundUp100((total * INSTALLMENT_RULES[kind].minFirstPct) / 100));
}

/** First payment for a chosen number of payments. */
export function firstAmountFor(kind: PlanKind, total: number, parts: number): number {
  return Math.min(total, Math.max(minFirstFor(kind, total), roundUp100(total / parts)));
}

/** What the customer can choose at checkout. null = not eligible. goodsPrice picks the plan, total includes delivery. */
export function quoteInstallment(goodsPrice: number, total: number): InstallmentQuote | null {
  const kind = planKindFor(goodsPrice);
  if (!kind) return null;
  const r = INSTALLMENT_RULES[kind];
  const options: PartOption[] = [];
  for (let parts = 2; parts <= r.maxPayments; parts++) {
    const first = firstAmountFor(kind, total, parts);
    const rest = total - first;
    const laterEach = Math.ceil(rest / (parts - 1));
    if (rest <= 0 || laterEach < Math.min(INSTALLMENT_RULES.minLater, rest)) continue;
    options.push({ parts, firstAmount: first, laterEach });
  }
  if (options.length === 0) return null;
  return { kind, days: r.days, total, minFirst: minFirstFor(kind, total), maxPayments: r.maxPayments, minLater: INSTALLMENT_RULES.minLater, options };
}

export interface PlanLike {
  kind: PlanKind;
  status: PlanStatus;
  parts: number;
  firstAmount: number;
  minFirst: number;
  maxPayments: number;
  days: number;
  paidTotal: number;
  payments: Array<{ ref: string; amount: number; paidAt: Date | string }>;
  startedAt?: Date | string | null;
  deadline?: Date | string | null;
  extensionDays?: number;
}

/**
 * Is this amount allowed as the customer's next payment? Returns a plain-words problem, or "" when fine.
 */
export function problemWithPayment(plan: PlanLike, total: number, amount: number): string {
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt < 1) return "Enter an amount to pay.";
  const balance = total - plan.paidTotal;
  if (balance <= 0) return "This order is already fully paid.";
  if (amt > balance) return `The most you can pay now is ₦${balance.toLocaleString("en-NG")}, which is what is left.`;
  const first = plan.payments.length === 0;
  if (first) {
    if (amt < plan.minFirst) return `Your first payment must be at least ₦${plan.minFirst.toLocaleString("en-NG")}.`;
  } else if (amt < Math.min(INSTALLMENT_RULES.minLater, balance)) {
    return `Each payment must be at least ₦${INSTALLMENT_RULES.minLater.toLocaleString("en-NG")}, unless it is the last one.`;
  }
  const paymentsAfter = plan.payments.length + 1;
  const left = balance - amt;
  if (left > 0 && paymentsAfter >= plan.maxPayments) {
    return `This must be your last payment, so please pay the full ₦${balance.toLocaleString("en-NG")}.`;
  }
  if (left > 0 && left < INSTALLMENT_RULES.minLater) {
    return `Please pay the full ₦${balance.toLocaleString("en-NG")}, or leave at least ₦${INSTALLMENT_RULES.minLater.toLocaleString("en-NG")} for the next payment.`;
  }
  return "";
}

/** The amount we suggest for the next payment. */
export function suggestedNext(plan: PlanLike, total: number): number {
  const balance = total - plan.paidTotal;
  if (balance <= 0) return 0;
  if (plan.payments.length === 0) return Math.min(balance, plan.firstAmount);
  const partsLeft = Math.max(1, plan.parts - plan.payments.length);
  return Math.min(balance, roundUp100(balance / partsLeft));
}

export interface PlanView {
  status: PlanStatus;
  kind: PlanKind;
  paidTotal: number;
  balance: number;
  payments: Array<{ amount: number; paidAt: Date | string }>;
  maxPayments: number;
  paymentsLeft: number;
  nextSuggested: number;
  startedAt: Date | string | null;
  deadline: Date | string | null;
  daysLeft: number | null; // negative = days past the deadline
  overdue: boolean;
  /** overdue by more than the grace days: the owner can lapse the plan */
  readyToLapse: boolean;
  /** the customer may still ask for 3 to 7 extra days (once) */
  canExtend: boolean;
  extensionDays: number;
}

const ms = (d?: Date | string | null) => (d ? new Date(d).getTime() : NaN);

export function viewPlan(order: { total: number; plan: PlanLike }, now = new Date()): PlanView {
  const p = order.plan;
  const balance = Math.max(0, order.total - p.paidTotal);
  const dl = ms(p.deadline);
  const active = p.status === "active" && !Number.isNaN(dl);
  const daysLeft = active ? Math.ceil((dl - now.getTime()) / DAY) : null;
  const overdue = active && now.getTime() > dl;
  const readyToLapse = active && now.getTime() > dl + INSTALLMENT_RULES.lapseGraceDays * DAY;
  const canExtend =
    active &&
    !(p.extensionDays && p.extensionDays > 0) &&
    now.getTime() >= dl - INSTALLMENT_RULES.extOpenDaysBefore * DAY &&
    now.getTime() <= dl + INSTALLMENT_RULES.lapseGraceDays * DAY;
  return {
    status: p.status,
    kind: p.kind,
    paidTotal: p.paidTotal,
    balance,
    payments: p.payments.map((x) => ({ amount: x.amount, paidAt: x.paidAt })),
    maxPayments: p.maxPayments,
    paymentsLeft: Math.max(0, p.maxPayments - p.payments.length),
    nextSuggested: suggestedNext(p, order.total),
    startedAt: p.startedAt ?? null,
    deadline: p.deadline ?? null,
    daysLeft,
    overdue,
    readyToLapse,
    canExtend,
    extensionDays: p.extensionDays ?? 0,
  };
}

export function deadlineFrom(start: Date, days: number): Date {
  return new Date(start.getTime() + days * DAY);
}
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY);
}
