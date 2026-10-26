/**
 * "To get": pre-order orders that are paid but whose goods you still have to buy.
 *
 * GET  /api/admin/to-get              what to buy (totals per product) + the orders waiting
 * POST /api/admin/to-get/:id/got-it   the goods arrived: the order moves to Fulfilment > To pack
 *
 * Until you press Got it, the order is kept out of the packing queue.
 */
import { Router, Request, Response } from "express";
import { Order } from "../../models/Order";
import { gotItOrder } from "../../services/orderService";

const router = Router();

/** Adds business days (Monday to Friday) to a date. */
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

const WAITING = { awaitingGoods: true, status: { $in: ["paid", "processing"] } };

router.get("/", async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find(WAITING).sort({ paidAt: 1, createdAt: 1 }).limit(300).lean();
    const totals = new Map<string, { name: string; quantity: number; orders: number }>();
    const now = Date.now();
    const shaped = orders.map((o: any) => {
      const lines = (o.items ?? []).filter((i: any) => i.preorder);
      const maxDays = Math.max(0, ...lines.map((i: any) => Number(i.leadDaysMax) || 0));
      const paid = new Date(o.paidAt || o.createdAt);
      const promisedBy = addBusinessDays(paid, maxDays);
      for (const i of lines) {
        const key = `${i.comboId}`;
        const t = totals.get(key) ?? { name: i.name, quantity: 0, orders: 0 };
        t.quantity += i.quantity;
        t.orders += 1;
        totals.set(key, t);
      }
      return {
        _id: String(o._id),
        orderNumber: o.orderNumber,
        customer: o.shipping?.fullName ?? "",
        phone: o.shipping?.phone ?? "",
        paidAt: paid,
        promisedBy,
        late: promisedBy.getTime() < now,
        items: lines.map((i: any) => ({
          name: i.name,
          variantSummary: i.variantSummary ?? "",
          quantity: i.quantity,
          leadDaysMin: Number(i.leadDaysMin) || 0,
          leadDaysMax: Number(i.leadDaysMax) || 0,
        })),
      };
    });
    res.json({ data: { list: [...totals.values()].sort((a, b) => b.quantity - a.quantity), orders: shaped } });
  } catch (err) {
    console.error("GET /api/admin/to-get failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load the list" } });
  }
});

router.post("/:id/got-it", async (req: Request, res: Response) => {
  try {
    const o = await gotItOrder(req.params.id, WAITING);
    if (!o) {
      return res.status(409).json({
        error: { code: "BAD_REQUEST", message: "This order is not waiting for goods (already done, unpaid, or closed)." },
      });
    }
    res.json({ data: { _id: String(o._id), orderNumber: o.orderNumber } });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    console.error("to-get got-it failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to update the order" } });
  }
});

export default router;
