/**
 * SC-INST  Pay in instalments: database side.
 *
 * An instalment order is a normal Order with a `plan` on it. Stock is taken when the order is placed
 * (so the item is kept for the customer). The order stays "pending" while the customer pays in parts and flips to
 * "paid" through the normal markOrderPaid only when the whole amount is in. Goods are never packed before that.
 * Money rules live in installmentRules.ts.
 */

import { Order } from "../models/Order";
import { StoreCredit } from "../models/StoreCredit";
import { markOrderPaid, cancelOrRefundOrder, findByOrderNumber, OrderError } from "./orderService";
import { normalizePhone } from "./giftProgress";
import { verifyTransaction } from "./paystackService";
import {
  INSTALLMENT_RULES,
  addDays,
  deadlineFrom,
  problemWithPayment,
  suggestedNext,
  viewPlan,
} from "./installmentRules";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const hasPlan = (o: any) => Boolean(o && o.plan && o.plan.kind);

/** The amount to charge for the customer's next payment. Remembers it so the payment can be checked later. */
export async function startPlanPayment(order: any, requested?: number): Promise<number> {
  const plan = order.plan;
  if (!plan || (plan.status !== "awaiting_first" && plan.status !== "active")) {
    throw new OrderError(409, "PLAN_CLOSED", "This instalment plan is closed.");
  }
  if (order.status !== "pending") throw new OrderError(409, "ORDER_CLOSED", "This order is not waiting for payment.");
  const amount = Math.round(Number(requested ?? suggestedNext(plan, order.total)));
  const problem = problemWithPayment(plan, order.total, amount);
  if (problem) throw new OrderError(400, "BAD_AMOUNT", problem);
  return amount;
}

/** Remember the reference and the amount BEFORE the customer pays. */
export async function rememberInitiated(orderNumber: string, ref: string, amount: number): Promise<void> {
  await Order.updateOne({ orderNumber }, { $push: { "plan.initiated": { ref, amount, at: new Date() } } });
}

export interface ConfirmResult {
  ok: boolean;
  reason?: string;
  complete: boolean;
  amount: number;
  paidTotal: number;
  balance: number;
  already?: boolean;
}

/**
 * A Paystack payment for an instalment order succeeded. Records it ONCE (webhook and return page can both call this),
 * starts the clock on the first payment, and marks the order paid when the balance reaches zero.
 */
export async function confirmPlanPayment(
  order: any,
  v: { status: string; amount: number; currency?: string },
  ref: string,
): Promise<ConfirmResult> {
  const fresh: any = (await Order.findOne({ orderNumber: order.orderNumber })) ?? order;
  const plan = fresh.plan;
  const fail = (reason: string): ConfirmResult => ({ ok: false, reason, complete: false, amount: 0, paidTotal: plan?.paidTotal ?? 0, balance: Math.max(0, fresh.total - (plan?.paidTotal ?? 0)) });

  if (!plan) return fail("no_plan");
  if (v.status !== "success") return fail("not_successful");
  if (v.currency && v.currency !== "NGN") return fail("currency");
  if (!ref.startsWith(`${fresh.orderNumber}-`)) return fail("wrong_order");

  const started = (plan.initiated ?? []).find((x: any) => x.ref === ref);
  if (!started) return fail("unknown_reference");
  if (v.amount !== Math.round(started.amount * 100)) return fail("amount_mismatch");
  const amount = Math.round(started.amount);

  // Already counted (webhook and return page both arrive): just make sure the order is finished.
  if ((plan.payments ?? []).some((p: any) => p.ref === ref)) {
    return finish(fresh.orderNumber, ref, amount, true);
  }

  // The plan was closed before this payment arrived: keep the money as store credit instead of losing it.
  if (plan.status === "lapsed" || fresh.status === "cancelled") {
    await addLateCredit(fresh, amount, ref);
    return { ok: true, reason: "plan_closed_credit", complete: false, amount, paidTotal: plan.paidTotal, balance: Math.max(0, fresh.total - plan.paidTotal), already: false };
  }

  const now = new Date();
  const recorded: any = await Order.findOneAndUpdate(
    {
      orderNumber: fresh.orderNumber,
      "plan.payments.ref": { $ne: ref },
      "plan.status": { $in: ["awaiting_first", "active"] },
    },
    {
      $push: { "plan.payments": { n: (plan.payments?.length ?? 0) + 1, ref, amount, paidAt: now } },
      $inc: { "plan.paidTotal": amount },
    },
    { new: true },
  );
  if (!recorded) {
    // Not recorded: either it was counted a moment ago (webhook and return page together), or the plan is already
    // complete (the customer started two payments). In the second case the money must not vanish: tell the owner.
    const again: any = await Order.findOne({ orderNumber: fresh.orderNumber });
    if (!(again?.plan?.payments ?? []).some((x: any) => x.ref === ref)) {
      await Order.updateOne(
        { orderNumber: fresh.orderNumber },
        { $set: { adminNotes: `${again?.adminNotes ? again.adminNotes + "\n" : ""}EXTRA PAYMENT: ${naira(amount)} arrived on Paystack (ref ${ref}) after this plan was already complete. Refund it on Paystack.` } },
      );
    }
    return finish(fresh.orderNumber, ref, amount, true);
  }

  // First payment: the clock starts now.
  await Order.updateOne(
    { orderNumber: fresh.orderNumber, "plan.status": "awaiting_first" },
    { $set: { "plan.status": "active", "plan.startedAt": now, "plan.deadline": deadlineFrom(now, recorded.plan.days) } },
  );
  if (recorded.plan.paidTotal > recorded.total) {
    await Order.updateOne(
      { orderNumber: fresh.orderNumber },
      { $set: { adminNotes: `${recorded.adminNotes ? recorded.adminNotes + "\n" : ""}OVERPAID: customer paid ${naira(recorded.plan.paidTotal - recorded.total)} more than the total on the instalment plan. Refund the difference on Paystack.` } },
    );
  }
  return finish(fresh.orderNumber, ref, amount, false);
}

async function finish(orderNumber: string, ref: string, amount: number, already: boolean): Promise<ConfirmResult> {
  const o: any = await Order.findOne({ orderNumber });
  const paidTotal = o?.plan?.paidTotal ?? 0;
  const complete = Boolean(o && paidTotal >= o.total);
  if (complete && o.status === "pending") {
    await Order.updateOne({ orderNumber, "plan.status": "active" }, { $set: { "plan.status": "paid", "plan.completedAt": new Date() } });
    await markOrderPaid(orderNumber, ref); // normal paid flow: email, gift and partner commission count from here
  }
  return { ok: true, complete, amount, paidTotal, balance: Math.max(0, (o?.total ?? 0) - paidTotal), already };
}

async function addLateCredit(order: any, amount: number, ref: string) {
  const dup = await StoreCredit.findOne({ ref });
  if (dup) return;
  await StoreCredit.create({
    phoneKey: order.phoneKey || normalizePhone(order.shipping?.phone),
    phone: order.shipping?.phone ?? "",
    name: order.shipping?.fullName ?? "",
    amount,
    orderNumber: order.orderNumber,
    ref,
    note: "Payment arrived after the instalment plan was closed.",
    expiresAt: addDays(new Date(), INSTALLMENT_RULES.creditDays),
  });
}

/** Customer asks for extra days (3 to 7, once). Identified by order number and phone, like tracking. */
export async function requestExtension(orderNumber: string, phone: string, days: number): Promise<any> {
  const d = Math.floor(Number(days));
  if (!Number.isInteger(d) || d < INSTALLMENT_RULES.extMin || d > INSTALLMENT_RULES.extMax) {
    throw new OrderError(400, "BAD_DAYS", `Choose between ${INSTALLMENT_RULES.extMin} and ${INSTALLMENT_RULES.extMax} extra days.`);
  }
  const order: any = await Order.findOne({ orderNumber: orderNumber.trim().toUpperCase() });
  // the phone can be typed in any format (0803..., +234803..., 803...): compare the last 10 digits
  const typed = normalizePhone(phone);
  const stored = normalizePhone(order?.shipping?.phone);
  const phoneOk = Boolean(order) && ((Boolean(typed) && typed === stored) || String(order.shipping?.phone ?? "") === phone.trim());
  if (!order || !phoneOk || !hasPlan(order)) throw new OrderError(404, "NOT_FOUND", "No instalment order matches those details.");
  const view = viewPlan(order);
  if (order.plan.status !== "active") throw new OrderError(409, "PLAN_CLOSED", "This plan is not open.");
  if ((order.plan.extensionDays ?? 0) > 0) throw new OrderError(409, "ALREADY_EXTENDED", "You already used your extra days.");
  if (!view.canExtend) throw new OrderError(409, "TOO_EARLY", "You can ask for extra days in the last 3 days before your deadline, or shortly after it.");
  const now = new Date();
  const base = new Date(Math.max(new Date(order.plan.deadline).getTime(), now.getTime()));
  const updated = await Order.findOneAndUpdate(
    { orderNumber: order.orderNumber, "plan.status": "active", "plan.extensionDays": 0 },
    { $set: { "plan.deadline": addDays(base, d), "plan.extensionDays": d, "plan.extendedAt": now } },
    { new: true },
  );
  if (!updated) throw new OrderError(409, "ALREADY_EXTENDED", "You already used your extra days.");
  return updated;
}

/** Owner gives more days (any time, any number of times, 1 to 14 each). */
export async function adminGiveDays(orderNumber: string, days: number, by?: string): Promise<any> {
  const d = Math.floor(Number(days));
  if (!Number.isInteger(d) || d < 1 || d > 14) throw new OrderError(400, "BAD_DAYS", "Give between 1 and 14 days.");
  const order: any = await findByOrderNumber(orderNumber);
  if (!order || !hasPlan(order) || order.plan.status !== "active") throw new OrderError(404, "NOT_FOUND", "No open instalment plan for that order.");
  const base = new Date(Math.max(new Date(order.plan.deadline).getTime(), Date.now()));
  const updated: any = await Order.findOneAndUpdate(
    { orderNumber: order.orderNumber, "plan.status": "active" },
    {
      $set: {
        "plan.deadline": addDays(base, d),
        adminNotes: `${order.adminNotes ? order.adminNotes + "\n" : ""}${new Date().toISOString().slice(0, 10)}: ${by ?? "admin"} gave ${d} more day(s) on the instalment plan.`,
      },
    },
    { new: true },
  );
  return updated;
}

/**
 * Owner closes a plan the customer did not finish. The item goes back on sale and what the customer paid becomes
 * store credit (no cash refund). Done by hand on purpose: it moves money.
 */
export async function lapsePlan(orderNumber: string, by?: string): Promise<{ order: any; credit: any }> {
  const order: any = await findByOrderNumber(orderNumber);
  if (!order || !hasPlan(order)) throw new OrderError(404, "NOT_FOUND", "No instalment order with that number.");
  const claimed: any = await Order.findOneAndUpdate(
    { orderNumber: order.orderNumber, "plan.status": "active", status: "pending" },
    { $set: { "plan.status": "lapsed", "plan.lapsedAt": new Date() } },
    { new: true },
  );
  if (!claimed) throw new OrderError(409, "NOT_OPEN", "This plan is not open, so it cannot be closed.");
  const paid = claimed.plan.paidTotal ?? 0;
  await cancelOrRefundOrder(
    claimed.orderNumber,
    "cancelled",
    `Instalment plan closed by ${by ?? "admin"} (not completed). ${naira(paid)} paid is kept as store credit. Stock returned.`,
  );
  const credit = paid > 0
    ? await StoreCredit.create({
        phoneKey: claimed.phoneKey || normalizePhone(claimed.shipping?.phone),
        phone: claimed.shipping?.phone ?? "",
        name: claimed.shipping?.fullName ?? "",
        amount: paid,
        orderNumber: claimed.orderNumber,
        note: "Instalment plan not completed.",
        expiresAt: addDays(new Date(), INSTALLMENT_RULES.creditDays),
      })
    : null;
  return { order: await findByOrderNumber(orderNumber), credit };
}

export type PlanFilter = "all" | "awaiting_first" | "active" | "due_soon" | "overdue" | "ready_to_lapse" | "paid" | "lapsed";

/** Admin list. Computes the due-soon / overdue flags from the dates, so nothing has to run on a timer. */
export async function listPlans(filter: PlanFilter = "all", now = new Date()) {
  const statuses = filter === "paid" ? ["paid"] : filter === "lapsed" ? ["lapsed"] : filter === "awaiting_first" ? ["awaiting_first"] : filter === "all" ? ["active", "paid", "lapsed", "awaiting_first"] : ["active"];
  const rows: any[] = await Order.find({ "plan.status": { $in: statuses } }).sort({ createdAt: -1 }).limit(300);
  const out = rows.map((o: any) => {
    const v = viewPlan(o, now);
    return {
      orderNumber: o.orderNumber,
      customer: o.shipping?.fullName ?? "",
      phone: o.shipping?.phone ?? "",
      email: o.shipping?.email ?? "",
      itemName: o.items?.[0]?.name ?? "",
      total: o.total,
      createdAt: o.createdAt,
      ...v,
      dueSoon: v.status === "active" && !v.overdue && v.daysLeft !== null && v.daysLeft <= 3,
    };
  });
  const keep = (r: any) =>
    filter === "due_soon" ? r.dueSoon : filter === "overdue" ? r.overdue : filter === "ready_to_lapse" ? r.readyToLapse : true;
  return out.filter(keep);
}

/** Counts for the dashboard badge and the daily summary. */
export async function planCounts(now = new Date()) {
  const rows: any[] = await Order.find({ "plan.status": "active" }).limit(500);
  let overdue = 0, dueSoon = 0, readyToLapse = 0;
  for (const o of rows) {
    const v = viewPlan(o, now);
    if (v.overdue) overdue++;
    else if (v.daysLeft !== null && v.daysLeft <= 3) dueSoon++;
    if (v.readyToLapse) readyToLapse++;
  }
  return { active: rows.length, overdue, dueSoon, readyToLapse };
}

export async function listCredits() {
  const rows: any[] = await StoreCredit.find({}).sort({ createdAt: -1 }).limit(300);
  const now = Date.now();
  return rows.map((c: any) => ({
    id: String(c._id),
    phone: c.phone,
    name: c.name,
    orderNumber: c.orderNumber,
    amount: c.amount,
    usedAmount: c.usedAmount,
    remaining: Math.max(0, c.amount - c.usedAmount),
    expiresAt: c.expiresAt,
    expired: new Date(c.expiresAt).getTime() < now,
    note: c.note,
    createdAt: c.createdAt,
  }));
}

export async function useCredit(id: string, amount: number, note?: string) {
  const a = Math.round(Number(amount));
  if (!Number.isFinite(a) || a < 1) throw new OrderError(400, "BAD_AMOUNT", "Enter the amount used.");
  const c: any = await StoreCredit.findById(id);
  if (!c) throw new OrderError(404, "NOT_FOUND", "Credit not found.");
  if (new Date(c.expiresAt).getTime() < Date.now()) throw new OrderError(409, "EXPIRED", "This credit has expired.");
  if (a > c.amount - c.usedAmount) throw new OrderError(400, "TOO_MUCH", `Only ${naira(c.amount - c.usedAmount)} is left on this credit.`);
  const updated = await StoreCredit.findOneAndUpdate(
    { _id: id, usedAmount: c.usedAmount },
    { $inc: { usedAmount: a }, ...(note ? { $set: { note: `${c.note ? c.note + " | " : ""}used ${naira(a)}: ${note}` } } : {}) },
    { new: true },
  );
  if (!updated) throw new OrderError(409, "CHANGED", "That credit just changed. Try again.");
  return updated;
}

/**
 * Asks Paystack about every payment the customer STARTED but we have not counted yet, and records the ones that succeeded.
 * Needed because the "payment done" message from Paystack (webhook) cannot reach a computer running locally, and
 * because a customer may pay and close the page before coming back. Safe to run many times: a payment is counted once.
 */
export async function recheckPlanPayments(orderNumber: string, opts: { sinceHours?: number; maxRefs?: number } = {}) {
  const number = String(orderNumber).trim().toUpperCase();
  const order: any = await Order.findOne({ orderNumber: number });
  const out = { found: Boolean(order?.plan), checked: 0, recorded: 0, notPaid: 0, problems: [] as string[], paidTotal: order?.plan?.paidTotal ?? 0, complete: false };
  if (!order?.plan) return out;
  const counted = new Set((order.plan.payments ?? []).map((p: any) => p.ref));
  const since = Date.now() - (opts.sinceHours ?? 72) * 3_600_000;
  const todo = (order.plan.initiated ?? [])
    .filter((x: any) => !counted.has(x.ref) && new Date(x.at).getTime() >= since)
    .slice(-(opts.maxRefs ?? 5));
  for (const x of todo) {
    out.checked++;
    try {
      const v: any = await verifyTransaction(x.ref);
      if (v?.status !== "success") {
        out.notPaid++;
        continue;
      }
      const r = await confirmPlanPayment(order, v, x.ref);
      if (r.ok && !r.already) out.recorded++;
      if (!r.ok) out.problems.push(`${x.ref}: ${r.reason}`);
      out.paidTotal = r.paidTotal;
      out.complete = out.complete || r.complete;
    } catch (e: any) {
      out.problems.push(`${x.ref}: ${e?.message || "could not check"}`);
    }
  }
  return out;
}
