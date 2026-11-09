/** SC-REM  Renewal reminders and the low-wallet alert. A reminder never buys anything: it only tells the customer it is time, and the customer taps Buy again.
 *  Due date = the customer's latest delivered purchase for the same smartcard / meter / phone + the chosen number of days. Buying early moves it on by itself. */
import { Reminder } from "../models/Reminder";
import { ReminderPrefs } from "../models/ReminderPrefs";
import { VtuOrder } from "../models/VtuOrder";

export class ReminderError extends Error { constructor(public status: number, message: string) { super(message); } }

const DAY = 86_400_000;
const SERVICES = new Set(["airtime", "data", "electricity", "tv"]);
export const MAX_REMINDERS = 20;
const idOf = (c: any) => String(c._id);

/** What identifies "the same thing" being renewed. */
export function keyOfOrder(o: any): { key: string; ok: boolean } {
  const net = String(o?.network ?? "");
  if (o?.service === "tv") { const n = String(o?.card?.number ?? ""); return { key: `tv:${net}:${n}`, ok: !!n && !!net }; }
  if (o?.service === "electricity") { const n = String(o?.meter?.number ?? ""); return { key: `electricity:${net}:${n}`, ok: !!n && !!net }; }
  const p = String(o?.phoneNumber ?? o?.phone ?? ""); return { key: `${o?.service}:${net}:${p}`, ok: !!p && !!net && (o?.service === "airtime" || o?.service === "data") };
}

const ownsOrder = (o: any, c: any) => (o.userId && o.userId === idOf(c)) || (!!o.email && !!c.email && String(o.email).toLowerCase() === String(c.email).toLowerCase());

const days = (n: any) => { const v = Math.round(Number(n)); if (!Number.isFinite(v) || v < 1 || v > 365) throw new ReminderError(400, "Choose between 1 and 365 days."); return v; };

/** The customer's delivered bill purchases, newest first. */
async function myOrders(c: any): Promise<any[]> {
  const rows: any[] = await (VtuOrder as any).find({ $or: [{ userId: idOf(c) }, { email: c.email }], fulfilmentStatus: "successful" }).sort({ createdAt: -1 }).limit(500).lean();
  return rows.filter((r) => SERVICES.has(r.service) && (!r.userId || r.userId === idOf(c) || ownsOrder(r, c))).sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
}

export function viewOf(r: any, latest: any, now = Date.now()) {
  const lastAt = latest ? new Date(latest.createdAt).getTime() : new Date(r.sourceAt ?? r.createdAt).getTime();
  const dueAt = lastAt + r.everyDays * DAY;
  const daysLeft = Math.ceil((dueAt - now) / DAY);
  const src = latest ?? r;
  const draft: Record<string, unknown> =
    r.service === "tv" ? { tab: "tv", operator: r.network, card: r.cardNumber, bouquetCode: src.planCode ?? r.planCode, phone: src.phoneNumber ?? r.phone }
    : r.service === "electricity" ? { tab: "electricity", disco: r.network, meterType: r.meterKind, meter: r.meterNumber, amount: src.faceValue ?? r.amount, phone: src.phoneNumber ?? r.phone }
    : r.service === "data" ? { tab: "data", network: r.network, phone: r.phone, planCode: src.planCode ?? r.planCode }
    : { tab: "airtime", network: r.network, phone: r.phone, amount: src.faceValue ?? r.amount };
  return {
    id: String(r._id), service: r.service, label: r.label, everyDays: r.everyDays, paused: !!r.paused,
    lastAt: new Date(lastAt).toISOString(), dueAt: new Date(dueAt).toISOString(), daysLeft,
    state: r.paused ? "paused" : daysLeft <= 0 ? "due" : daysLeft <= 3 ? "soon" : "later",
    draft,
  };
}

export async function list(c: any) {
  const [mine, orders, prefs] = await Promise.all([
    (Reminder as any).find({ customerId: idOf(c) }).lean(), myOrders(c), (ReminderPrefs as any).findOne({ customerId: idOf(c) }).lean(),
  ]);
  const latestByKey = new Map<string, any>();
  for (const o of orders) { const k = keyOfOrder(o); if (k.ok && !latestByKey.has(k.key)) latestByKey.set(k.key, o); } // orders are newest first
  const reminders = (mine as any[]).map((r) => viewOf(r, latestByKey.get(r.key))).sort((a, b) => (a.state === "paused" ? 1 : 0) - (b.state === "paused" ? 1 : 0) || a.daysLeft - b.daysLeft);
  return { reminders, lowBalance: Number(prefs?.lowBalance ?? 0) };
}

export async function createFromOrder(c: any, reference: string, everyDaysRaw: any) {
  const everyDays = days(everyDaysRaw ?? 30);
  const o: any = await (VtuOrder as any).findOne({ reference: String(reference ?? "") }).lean();
  if (!o || !ownsOrder(o, c)) throw new ReminderError(404, "We could not find that purchase in your account.");
  if (o.fulfilmentStatus !== "successful") throw new ReminderError(400, "You can set a reminder after the purchase is delivered.");
  if (!SERVICES.has(o.service)) throw new ReminderError(400, "Reminders are for airtime, data, electricity and TV.");
  const { key, ok } = keyOfOrder(o); if (!ok) throw new ReminderError(400, "We could not set a reminder for this purchase.");
  const existing = await (Reminder as any).findOne({ customerId: idOf(c), key }).lean();
  if (!existing && (await (Reminder as any).countDocuments({ customerId: idOf(c) })) >= MAX_REMINDERS) throw new ReminderError(400, `You can keep up to ${MAX_REMINDERS} reminders. Delete one first.`);
  const what = o.service === "tv" ? `${o.networkName || o.network} ${o.planName || ""} · ${o.card?.number}` : o.service === "electricity" ? `${o.networkName || o.network} ${o.meter?.type || ""} · ${o.meter?.number}` : `${o.network} ${o.service === "data" ? o.planName || "data" : "airtime"} · ${o.phoneNumber || o.phone}`;
  const fields = {
    customerId: idOf(c), key, service: o.service, label: what.replace(/\s+/g, " ").trim(), network: String(o.network ?? ""), networkName: String(o.networkName ?? ""),
    phone: String(o.phoneNumber ?? o.phone ?? ""), cardNumber: String(o.card?.number ?? ""), meterNumber: String(o.meter?.number ?? ""), meterKind: String(o.meter?.type ?? ""),
    planCode: String(o.planCode ?? ""), planName: String(o.planName ?? ""), amount: Number(o.faceValue ?? o.amount ?? 0), everyDays, paused: false, sourceAt: o.createdAt ?? new Date(),
  };
  const r = await (Reminder as any).findOneAndUpdate({ customerId: idOf(c), key }, { $set: fields }, { upsert: true, new: true });
  const { reminders } = await list(c);
  return reminders.find((x) => x.id === String(r._id)) ?? null;
}

export async function update(c: any, id: string, patch: { everyDays?: any; paused?: any }) {
  const set: any = {};
  if (patch.everyDays !== undefined) set.everyDays = days(patch.everyDays);
  if (patch.paused !== undefined) set.paused = Boolean(patch.paused);
  if (!Object.keys(set).length) throw new ReminderError(400, "Nothing to change.");
  const r = await (Reminder as any).findOneAndUpdate({ _id: id, customerId: idOf(c) }, { $set: set }, { new: true });
  if (!r) throw new ReminderError(404, "Reminder not found.");
  return (await list(c)).reminders.find((x) => x.id === String(r._id)) ?? null;
}

export async function remove(c: any, id: string) {
  const r = await (Reminder as any).deleteOne({ _id: id, customerId: idOf(c) });
  if (!r?.deletedCount) throw new ReminderError(404, "Reminder not found.");
  return { ok: true };
}

export async function setLowBalance(c: any, amountRaw: any) {
  const n = Math.round(Number(amountRaw));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new ReminderError(400, "Enter an amount between ₦0 and ₦1,000,000. Use 0 to switch the alert off.");
  await (ReminderPrefs as any).findOneAndUpdate({ customerId: idOf(c) }, { $set: { lowBalance: n } }, { upsert: true, new: true });
  return { lowBalance: n };
}
