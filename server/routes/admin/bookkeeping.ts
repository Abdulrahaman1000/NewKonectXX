/**
 * SC-STAFF2  Bookkeeping: expenses, sales report and CSV exports.
 * Never returns cost of goods, profit or partner commission, so a bookkeeper
 * can do the books without learning what stock costs.
 *
 * GET    /api/admin/bookkeeping/expenses?from=&to=
 * POST   /api/admin/bookkeeping/expenses        { date?, category, amount, note? }
 * DELETE /api/admin/bookkeeping/expenses/:id
 * GET    /api/admin/bookkeeping/report?from=&to=
 * GET    /api/admin/bookkeeping/export/orders.csv?from=&to=
 * GET    /api/admin/bookkeeping/export/expenses.csv?from=&to=
 * Dates are Nigerian time (UTC+1).
 */
import { Router, Request, Response } from "express";
import { Order } from "../../models/Order";
import { Expense, EXPENSE_CATEGORIES } from "../../models/Expense";

const router = Router();
const SALE_STATUSES = ["paid", "processing", "shipped", "delivered"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const lagosToday = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
const lagosStamp = (d: Date) => new Date(new Date(d).getTime() + 3600_000).toISOString().replace("T", " ").slice(0, 16);

function parseRange(req: Request) {
  const today = lagosToday();
  const from = typeof req.query.from === "string" && DATE_RE.test(req.query.from) ? req.query.from : `${today.slice(0, 8)}01`;
  const to = typeof req.query.to === "string" && DATE_RE.test(req.query.to) ? req.query.to : today;
  const start = new Date(`${from}T00:00:00+01:00`);
  const end = new Date(`${to}T23:59:59.999+01:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
  return { from, to, start, end };
}
const bad = (res: Response, message: string) => res.status(400).json({ error: { code: "BAD_REQUEST", message } });
const fail = (res: Response, what: string, err: unknown) => {
  console.error(`${what} failed:`, err);
  return res.status(500).json({ error: { code: "SERVER_ERROR", message: `Failed to ${what}` } });
};

/** One CSV cell. A leading = + - @ is neutralised so Excel never runs a typed "formula". */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvLine = (cells: unknown[]) => cells.map(csvCell).join(",");
function sendCsv(res: Response, name: string, lines: string[]) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.send("\uFEFF" + lines.join("\r\n"));
}

const ORDER_FIELDS = "orderNumber createdAt status paymentMethod source manual shipping.city subtotal shippingFee total";

router.get("/expenses", async (req: Request, res: Response) => {
  try {
    const range = parseRange(req);
    if (!range) return bad(res, "Invalid date range");
    const items = await Expense.find({ date: { $gte: range.start, $lte: range.end } })
      .sort({ date: -1, createdAt: -1 }).limit(500).lean();
    res.json({ data: items });
  } catch (err) { fail(res, "load expenses", err); }
});

router.post("/expenses", async (req: Request, res: Response) => {
  try {
    const { date, category, amount, note } = req.body ?? {};
    if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return bad(res, "Choose a valid category");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000_000) return bad(res, "Enter a valid amount");
    const when = typeof date === "string" && DATE_RE.test(date) ? new Date(`${date}T12:00:00+01:00`) : new Date();
    if (isNaN(when.getTime())) return bad(res, "Invalid date");
    const expense = await Expense.create({
      date: when, category, amount: Math.round(amt),
      note: typeof note === "string" ? note.trim().slice(0, 200) : "",
    });
    res.status(201).json({ data: expense });
  } catch (err) { fail(res, "save the expense", err); }
});

router.delete("/expenses/:id", async (req: Request, res: Response) => {
  try {
    const removed = await Expense.findByIdAndDelete(req.params.id).lean();
    if (!removed) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err?.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    fail(res, "delete the expense", err);
  }
});

router.get("/report", async (req: Request, res: Response) => {
  try {
    const range = parseRange(req);
    if (!range) return bad(res, "Invalid date range");
    const LIMIT = 5000;
    const [orders, expenses] = await Promise.all([
      Order.find({ createdAt: { $gte: range.start, $lte: range.end } }).select(ORDER_FIELDS).sort({ createdAt: -1 }).limit(LIMIT).lean(),
      Expense.find({ date: { $gte: range.start, $lte: range.end } }).select("amount category").lean(),
    ]);
    const totals = { orders: 0, sales: 0, deliveryFees: 0, collected: 0 };
    const byMethod: Record<string, { orders: number; total: number }> = {};
    const bySource: Record<string, { orders: number; total: number }> = {};
    const byStatus: Record<string, number> = {};
    for (const o of orders as any[]) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (!SALE_STATUSES.includes(o.status)) continue;
      totals.orders += 1;
      totals.sales += o.subtotal || 0;
      totals.deliveryFees += o.shippingFee || 0;
      totals.collected += o.total || 0;
      const m = (byMethod[o.paymentMethod] ||= { orders: 0, total: 0 });
      m.orders += 1; m.total += o.total || 0;
      const s = (bySource[o.source || "website"] ||= { orders: 0, total: 0 });
      s.orders += 1; s.total += o.total || 0;
    }
    const byCategory: Record<string, number> = {};
    let expTotal = 0;
    for (const e of expenses as any[]) { expTotal += e.amount || 0; byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0); }
    res.json({
      data: {
        from: range.from, to: range.to, totals, byMethod, bySource, byStatus,
        expenses: { total: expTotal, byCategory },
        orders: (orders as any[]).slice(0, 300).map((o) => ({
          _id: o._id, orderNumber: o.orderNumber, createdAt: o.createdAt, status: o.status,
          paymentMethod: o.paymentMethod, source: o.source || "website", city: o.shipping?.city || "",
          subtotal: o.subtotal, shippingFee: o.shippingFee, total: o.total,
        })),
        truncated: orders.length > 300,
      },
    });
  } catch (err) { fail(res, "build the sales report", err); }
});

router.get("/export/orders.csv", async (req: Request, res: Response) => {
  try {
    const range = parseRange(req);
    if (!range) return bad(res, "Invalid date range");
    const orders = await Order.find({ createdAt: { $gte: range.start, $lte: range.end } })
      .select(ORDER_FIELDS).sort({ createdAt: 1 }).limit(10000).lean();
    const lines = [csvLine(["Order number", "Date (Lagos)", "Status", "Payment method", "Source", "City", "Items total", "Delivery fee", "Order total"])];
    for (const o of orders as any[]) {
      lines.push(csvLine([o.orderNumber, lagosStamp(o.createdAt), o.status, o.paymentMethod, o.source || "website", o.shipping?.city || "", o.subtotal, o.shippingFee, o.total]));
    }
    sendCsv(res, `orders-${range.from}-to-${range.to}.csv`, lines);
  } catch (err) { fail(res, "export orders", err); }
});

router.get("/export/expenses.csv", async (req: Request, res: Response) => {
  try {
    const range = parseRange(req);
    if (!range) return bad(res, "Invalid date range");
    const items = await Expense.find({ date: { $gte: range.start, $lte: range.end } }).sort({ date: 1 }).limit(10000).lean();
    const lines = [csvLine(["Date (Lagos)", "Category", "Amount", "Note"])];
    for (const e of items as any[]) lines.push(csvLine([lagosStamp(e.date).slice(0, 10), e.category, e.amount, e.note || ""]));
    sendCsv(res, `expenses-${range.from}-to-${range.to}.csv`, lines);
  } catch (err) { fail(res, "export expenses", err); }
});

export default router;
