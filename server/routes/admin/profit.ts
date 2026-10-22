/**
 * Admin profit & expenses.
 *
 * GET    /api/admin/profit/report?from=YYYY-MM-DD&to=YYYY-MM-DD
 * GET    /api/admin/profit/expenses?from=&to=
 * POST   /api/admin/profit/expenses        { date?, category, amount, note? }
 * DELETE /api/admin/profit/expenses/:id
 * GET    /api/admin/profit/order/:orderId  cost lines for one order
 *
 * Dates are read as Nigerian time (UTC+1).
 */
import { Router, Request, Response } from "express";
import { Order } from "../../models/Order";
import { OrderCost } from "../../models/OrderCost";
import { Expense, EXPENSE_CATEGORIES } from "../../models/Expense";
import { buildReport, recordOrderCost } from "../../services/costService";
import { Commission } from "../../models/Commission";

const router = Router();
const SALE_STATUSES = ["paid", "processing", "shipped", "delivered"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function lagosToday(): string {
  return new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
}

function parseRange(req: Request): { from: string; to: string; start: Date; end: Date } | null {
  const today = lagosToday();
  const from = typeof req.query.from === "string" && DATE_RE.test(req.query.from) ? req.query.from : `${today.slice(0, 8)}01`;
  const to = typeof req.query.to === "string" && DATE_RE.test(req.query.to) ? req.query.to : today;
  const start = new Date(`${from}T00:00:00+01:00`);
  const end = new Date(`${to}T23:59:59.999+01:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
  return { from, to, start, end };
}

const bad = (res: Response, message: string) =>
  res.status(400).json({ error: { code: "BAD_REQUEST", message } });
const fail = (res: Response, what: string, err: unknown) => {
  console.error(`${what} failed:`, err);
  return res.status(500).json({ error: { code: "SERVER_ERROR", message: `Failed to ${what}` } });
};

router.get("/report", async (req: Request, res: Response) => {
  try {
    const range = parseRange(req);
    if (!range) return bad(res, "Invalid date range");

    const orders = await Order.find({
      status: { $in: SALE_STATUSES },
      createdAt: { $gte: range.start, $lte: range.end },
    })
      .select("subtotal shippingFee")
      .limit(5000)
      .lean();

    const [costs, expenses] = await Promise.all([
      OrderCost.find({ orderId: { $in: orders.map((o) => o._id) } }).lean(),
      Expense.find({ date: { $gte: range.start, $lte: range.end } }).select("amount category").lean(),
    ]);

    const base = buildReport(orders as any, costs as any, expenses as any);
    // Partner commission only on the orders that are counted in the profit figures
    const costedIds = (costs as any[]).filter((c) => c.complete).map((c) => c.orderId);
    const partnerCommissions = costedIds.length
      ? ((await Commission.find({ orderId: { $in: costedIds } }).select("amount").lean()) as any[]).reduce((t, c) => t + (c.amount ?? 0), 0)
      : 0;
    res.json({
      data: { from: range.from, to: range.to, ...base, partnerCommissions, netProfit: base.netProfit - partnerCommissions },
    });
  } catch (err) {
    fail(res, "build the profit report", err);
  }
});

// Re-works the cost of orders in the period that were left out (sold before cost prices were entered),
// using the cost prices you have entered NOW. Orders that already have a complete cost are not touched.
router.post("/recalculate", async (req: Request, res: Response) => {
  try {
    const range = parseRange({ query: { from: req.body?.from, to: req.body?.to } } as any);
    if (!range) return bad(res, "Invalid date range");
    const ids = (
      await Order.find({ status: { $in: SALE_STATUSES }, createdAt: { $gte: range.start, $lte: range.end } }).select("_id").limit(5000).lean()
    ).map((o: any) => o._id);
    const done = new Set(
      ((await OrderCost.find({ orderId: { $in: ids }, complete: true }).select("orderId").lean()) as any[]).map((c) => String(c.orderId)),
    );
    const todo = ids.filter((id: any) => !done.has(String(id))).slice(0, 500);
    for (const id of todo) {
      const order = await Order.findById(id).lean();
      if (order) await recordOrderCost(order);
    }
    const nowDone = await OrderCost.countDocuments({ orderId: { $in: todo }, complete: true });
    res.json({ data: { tried: todo.length, fixed: nowDone, stillMissing: todo.length - nowDone } });
  } catch (err) {
    fail(res, "recalculate costs", err);
  }
});

router.get("/expenses", async (req: Request, res: Response) => {
  try {
    const range = parseRange(req);
    if (!range) return bad(res, "Invalid date range");
    const items = await Expense.find({ date: { $gte: range.start, $lte: range.end } })
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();
    res.json({ data: items });
  } catch (err) {
    fail(res, "load expenses", err);
  }
});

router.post("/expenses", async (req: Request, res: Response) => {
  try {
    const { date, category, amount, note } = req.body ?? {};
    if (!EXPENSE_CATEGORIES.includes(category)) return bad(res, "Choose a valid category");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000_000) return bad(res, "Enter a valid amount");
    const when = typeof date === "string" && DATE_RE.test(date) ? new Date(`${date}T12:00:00+01:00`) : new Date();
    if (isNaN(when.getTime())) return bad(res, "Invalid date");
    const expense = await Expense.create({
      date: when,
      category,
      amount: Math.round(amt),
      note: typeof note === "string" ? note.trim().slice(0, 200) : "",
    });
    res.status(201).json({ data: expense });
  } catch (err) {
    fail(res, "save the expense", err);
  }
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

router.get("/order/:orderId", async (req: Request, res: Response) => {
  try {
    const cost = await OrderCost.findOne({ orderId: req.params.orderId }).lean();
    res.json({ data: cost ?? null });
  } catch (err: any) {
    if (err?.name === "CastError") return res.json({ data: null });
    fail(res, "load order cost", err);
  }
});

export default router;
