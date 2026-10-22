/**
 * Daily summary: yesterday's (or today's) numbers plus what needs attention right now.
 * Used by the admin "Today" page and the morning email.
 */
import { Resend } from "resend";
import { config } from "../config";
import { Order } from "../models/Order";
import { OrderCost } from "../models/OrderCost";
import { Expense } from "../models/Expense";
import { Combo } from "../models/Combo";
import { Commission } from "../models/Commission";
import { SummaryLog } from "../models/SummaryLog";
import { buildReport } from "./costService";
import { resolveCommissionStatuses } from "./referralService";

export const SUMMARY_HOUR = 7; // Lagos time
const LOW_AT = 3;
const COUNTED = ["paid", "processing", "shipped", "delivered"];

/** Lagos is UTC+1 all year (no daylight saving). */
function lagosYmd(offsetDays = 0): string {
  const d = new Date(Date.now() + 3600_000 + offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
}
function lagosHour(): number {
  return new Date(Date.now() + 3600_000).getUTCHours();
}

export type SummaryDay = "today" | "yesterday";

export async function buildSummary(day: SummaryDay = "yesterday") {
  const ymd = lagosYmd(day === "today" ? 0 : -1);
  const start = new Date(`${ymd}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 86400_000 - 1);

  const [orders, toPackCount, oldestToPack, unpaidCount, stock, expenses] = await Promise.all([
    Order.find({ status: { $in: COUNTED }, createdAt: { $gte: start, $lte: end } })
      .select("subtotal shippingFee total source items.name items.quantity items.isFreeGift")
      .lean(),
    Order.countDocuments({ $or: [{ status: { $in: ["paid", "processing"] } }, { status: "pending", paymentMethod: "cod" }] }),
    Order.findOne({ $or: [{ status: { $in: ["paid", "processing"] } }, { status: "pending", paymentMethod: "cod" }] })
      .sort({ createdAt: 1 })
      .select("createdAt")
      .lean(),
    Order.countDocuments({ status: "pending", paymentMethod: { $ne: "cod" } }),
    Combo.find({ isActive: { $ne: false }, stockLeft: { $lte: LOW_AT } }).select("name stockLeft").sort({ stockLeft: 1, name: 1 }).limit(30).lean(),
    Expense.find({ date: { $gte: start, $lte: end } }).select("amount category").lean(),
  ]);

  const costs = orders.length ? await OrderCost.find({ orderId: { $in: orders.map((o: any) => o._id) } }).lean() : [];
  const report = buildReport(orders as any, costs as any, expenses as any);

  // best sellers by units
  const units = new Map<string, number>();
  for (const o of orders as any[]) for (const it of o.items ?? []) if (!it.isFreeGift) units.set(it.name, (units.get(it.name) ?? 0) + it.quantity);
  const bestSellers = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => ({ name, units: n }));

  // partner commissions: owed now vs still waiting out the hold period
  let commissionOwed = 0;
  let commissionPending = 0;
  try {
    const open: any[] = await Commission.find({ paidAt: { $exists: false } }).select("resellerId amount").lean();
    const valid = open.filter((c) => c.resellerId);
    if (valid.length) {
      const { statusById } = await resolveCommissionStatuses(valid.map((c) => c.resellerId));
      for (const c of valid) {
        const s = statusById.get(String(c._id));
        if (s === "approved") commissionOwed += c.amount;
        else if (s === "pending") commissionPending += c.amount;
      }
    }
  } catch (e) {
    console.error("[summary] commissions failed:", e);
  }

  const revenue = (orders as any[]).reduce((s, o) => s + (o.total ?? 0), 0);
  return {
    day,
    date: ymd,
    orders: orders.length,
    manualOrders: (orders as any[]).filter((o) => (o.source ?? "website") !== "website").length,
    revenue,
    profit: report.orders.costed > 0 ? report.netProfit : null,
    profitCoverage: { costed: report.orders.costed, total: report.orders.total },
    expenses: report.expensesTotal,
    bestSellers,
    toPack: toPackCount,
    oldestToPackHours: oldestToPack ? Math.floor((Date.now() - new Date((oldestToPack as any).createdAt).getTime()) / 3600_000) : 0,
    unpaid: unpaidCount,
    lowStock: (stock as any[]).map((c) => ({ name: c.name, stockLeft: c.stockLeft ?? 0 })),
    commissionOwed,
    commissionPending,
  };
}

export type Summary = Awaited<ReturnType<typeof buildSummary>>;

const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function summaryHtml(s: Summary): string {
  const label = s.day === "today" ? "Today so far" : "Yesterday";
  const box = (title: string, value: string, sub = "") =>
    `<td style="width:50%;padding:6px;"><div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:14px;"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#999;font-weight:bold;">${title}</div><div style="font-size:22px;font-weight:900;color:#111;margin-top:4px;">${value}</div>${sub ? `<div style="font-size:11px;color:#888;margin-top:2px;">${sub}</div>` : ""}</div></td>`;
  const stockRows = s.lowStock.length
    ? s.lowStock.map((c) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">${esc(c.name)}</td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:bold;color:${c.stockLeft <= 0 ? "#c0392b" : "#b9770e"};">${c.stockLeft <= 0 ? "OUT" : c.stockLeft + " left"}</td></tr>`).join("")
    : `<tr><td style="font-size:13px;color:#2e7d32;padding:6px 0;">Nothing is running low.</td></tr>`;
  const best = s.bestSellers.length ? s.bestSellers.map((b) => `${esc(b.name)} (${b.units})`).join(", ") : "No sales yet";
  const profit = s.profit === null ? "Add cost prices to see profit" : naira(s.profit);
  const alerts = [
    s.toPack > 0 ? `<b>${s.toPack}</b> order${s.toPack === 1 ? "" : "s"} waiting to be packed${s.oldestToPackHours >= 24 ? ` (oldest ${Math.floor(s.oldestToPackHours / 24)} day${s.oldestToPackHours >= 48 ? "s" : ""})` : ""}` : "",
    s.unpaid > 0 ? `<b>${s.unpaid}</b> unpaid order${s.unpaid === 1 ? "" : "s"} still pending` : "",
    s.commissionOwed > 0 ? `You owe partners <b>${naira(s.commissionOwed)}</b> (ready to pay)` : "",
  ].filter(Boolean).map((a) => `<li style="margin:4px 0;">${a}</li>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0a0a0a;padding:22px;text-align:center;">
 <table role="presentation" style="margin:0 auto;"><tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);width:36px;height:36px;border-radius:8px;text-align:center;"><span style="color:#000;font-weight:900;font-size:13px;">SC</span></td>
 <td style="padding-left:10px;text-align:left;"><div style="color:#fff;font-weight:900;font-size:14px;">Smart Combo</div><div style="color:#FFD700;font-size:9px;letter-spacing:2px;text-transform:uppercase;">Daily summary</div></td></tr></table></td></tr>
<tr><td style="padding:26px 22px;color:#111;">
 <h1 style="margin:0 0 4px;font-size:21px;">${label}: ${esc(s.date)}</h1>
 <p style="margin:0 0 16px;font-size:13px;color:#777;">${s.orders} order${s.orders === 1 ? "" : "s"}${s.manualOrders ? ` (${s.manualOrders} recorded by hand)` : ""}</p>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${box("Revenue", naira(s.revenue))}${box("Profit", profit, s.profit === null ? "" : `${s.profitCoverage.costed} of ${s.profitCoverage.total} orders have cost prices`)}</tr></table>
 <p style="font-size:13px;color:#444;margin:14px 0 0;"><b>Best sellers:</b> ${best}</p>
 ${alerts ? `<h3 style="margin:22px 0 6px;font-size:14px;">Needs your attention</h3><ul style="margin:0;padding-left:18px;font-size:13px;color:#333;">${alerts}</ul>` : `<p style="margin:22px 0 0;font-size:13px;color:#2e7d32;">Nothing needs your attention. All caught up.</p>`}
 <h3 style="margin:22px 0 6px;font-size:14px;">Stock (3 or fewer left)</h3>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stockRows}</table>
 <div style="text-align:center;margin:26px 0 4px;"><a href="${config.siteUrl}/admin/today" style="display:inline-block;background:#FFD700;color:#000;padding:13px 28px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:14px;">Open admin</a></div>
</td></tr>
<tr><td style="background:#fafafa;padding:16px;text-align:center;border-top:1px solid #eee;"><p style="margin:0;font-size:10px;color:#999;">Sent automatically every morning at ${SUMMARY_HOUR}:00 (Lagos time).</p></td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendSummaryEmail(day: SummaryDay = "yesterday"): Promise<{ sent: boolean; message: string; to?: string }> {
  const to = config.resend.adminNotify;
  if (!to) return { sent: false, message: "ADMIN_NOTIFY_EMAIL is not set, so there is nowhere to send the summary." };
  if (!config.resend.apiKey) return { sent: false, message: "RESEND_API_KEY is not set, so emails are switched off." };
  const s = await buildSummary(day);
  const resend = new Resend(config.resend.apiKey);
  try {
    const r = await resend.emails.send({
      from: config.resend.from,
      to,
      subject: `Smart Combo ${s.day === "today" ? "so far today" : "yesterday"}: ${naira(s.revenue)} from ${s.orders} order${s.orders === 1 ? "" : "s"}`,
      html: summaryHtml(s),
      replyTo: config.resend.replyTo || undefined,
    });
    if (r.error) return { sent: false, message: `Email failed: ${r.error.message}` };
    return { sent: true, message: "Summary sent.", to };
  } catch (e: any) {
    return { sent: false, message: `Email failed: ${e?.message ?? e}` };
  }
}

/** Live site only. Checks every 10 minutes; sends once per Lagos day after SUMMARY_HOUR. */
export function startDailySummary() {
  const g = globalThis as any;
  if (g.__scSummaryTimer) return;
  const tick = async () => {
    try {
      if (lagosHour() < SUMMARY_HOUR) return;
      const ymd = lagosYmd(0);
      try {
        await SummaryLog.create({ _id: ymd }); // fails if today's was already claimed
      } catch {
        return;
      }
      const r = await sendSummaryEmail("yesterday");
      console.log(`[summary] ${ymd}: ${r.message}`);
    } catch (e) {
      console.error("[summary] job failed:", e);
    }
  };
  g.__scSummaryTimer = setInterval(tick, 10 * 60 * 1000);
  g.__scSummaryTimer.unref?.();
  setTimeout(tick, 30_000).unref?.();
}
