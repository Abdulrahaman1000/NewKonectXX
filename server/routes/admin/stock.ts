/**
 * Stock levels, low-stock alerts and the restock log.
 *
 * GET  /api/admin/stock              all products with stock + status (out / low / ok), counts
 * GET  /api/admin/stock/log          latest 60 stock changes
 * POST /api/admin/stock/:id/restock  { quantity, note? }  add units
 * POST /api/admin/stock/:id/set      { stockLeft, note? } set the exact count (stock take / correction)
 */
import { Router, Request, Response } from "express";
import { Combo } from "../../models/Combo";
import { StockLog } from "../../models/StockLog";

const router = Router();
export const LOW_STOCK_AT = 3;

const statusOf = (n: number) => (n <= 0 ? "out" : n <= LOW_STOCK_AT ? "low" : "ok");
const err = (res: Response, code: number, message: string) =>
  res.status(code).json({ error: { code: code === 404 ? "NOT_FOUND" : "BAD_REQUEST", message } });

router.get("/", async (_req: Request, res: Response) => {
  try {
    const combos = await Combo.find({}).select("name images stockLeft isActive").sort({ stockLeft: 1, name: 1 }).lean();
    const items = combos.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      image: c.images?.[0]?.url ?? "",
      stockLeft: c.stockLeft ?? 0,
      isActive: c.isActive !== false,
      status: statusOf(c.stockLeft ?? 0),
    }));
    const live = items.filter((i) => i.isActive);
    res.json({
      data: {
        items,
        lowAt: LOW_STOCK_AT,
        counts: { out: live.filter((i) => i.status === "out").length, low: live.filter((i) => i.status === "low").length },
      },
    });
  } catch (e) {
    console.error("GET /api/admin/stock failed:", e);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load stock" } });
  }
});

router.get("/log", async (_req: Request, res: Response) => {
  try {
    const rows = await StockLog.find({}).sort({ createdAt: -1 }).limit(60).lean();
    res.json({ data: rows.map((r: any) => ({ id: String(r._id), comboName: r.comboName, kind: r.kind, delta: r.delta, before: r.before, after: r.after, note: r.note ?? "", createdAt: r.createdAt })) });
  } catch (e) {
    console.error("GET /api/admin/stock/log failed:", e);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load the log" } });
  }
});

router.post("/:id/restock", async (req: Request, res: Response) => {
  try {
    const q = Math.floor(Number(req.body?.quantity));
    if (!Number.isFinite(q) || q < 1 || q > 100000) return err(res, 400, "Enter a quantity between 1 and 100000");
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 200) : "";
    // atomic: $inc cannot lose a sale that happens at the same moment
    const after: any = await Combo.findByIdAndUpdate(req.params.id, { $inc: { stockLeft: q } }, { new: true }).select("name stockLeft").lean();
    if (!after) return err(res, 404, "Product not found");
    await StockLog.create({ comboId: after._id, comboName: after.name, kind: "restock", delta: q, before: after.stockLeft - q, after: after.stockLeft, note });
    res.json({ data: { id: String(after._id), stockLeft: after.stockLeft, status: statusOf(after.stockLeft) } });
  } catch (e: any) {
    if (e.name === "CastError") return err(res, 404, "Product not found");
    console.error("restock failed:", e);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to add stock" } });
  }
});

router.post("/:id/set", async (req: Request, res: Response) => {
  try {
    const n = Math.floor(Number(req.body?.stockLeft));
    if (!Number.isFinite(n) || n < 0 || n > 100000) return err(res, 400, "Enter a count between 0 and 100000");
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 200) : "";
    const before: any = await Combo.findByIdAndUpdate(req.params.id, { stockLeft: n }, { new: false }).select("name stockLeft").lean();
    if (!before) return err(res, 404, "Product not found");
    const was = before.stockLeft ?? 0;
    await StockLog.create({ comboId: before._id, comboName: before.name, kind: "set", delta: n - was, before: was, after: n, note });
    res.json({ data: { id: String(before._id), stockLeft: n, status: statusOf(n) } });
  } catch (e: any) {
    if (e.name === "CastError") return err(res, 404, "Product not found");
    console.error("set stock failed:", e);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to set stock" } });
  }
});

export default router;
