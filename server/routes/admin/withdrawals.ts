/**
 * Admin: partner withdrawals / weekly payouts.  Destination: server/routes/admin/withdrawals.ts
 * Mount behind requireAuth:  app.use("/api/admin/withdrawals", requireAuth, adminWithdrawalsRouter);
 *
 *   GET   /?status=requested|paid|rejected   list (default requested), oldest first for requested
 *   PATCH /:id/pay                           mark paid. Orders cancelled since the request are
 *                                            dropped and the paid amount is recalculated.
 *   PATCH /:id/reject  { note }              give the money back to the partner's balance
 */
import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Withdrawal } from "../../models/Withdrawal";
import { Commission } from "../../models/Commission";
import { Order } from "../../models/Order";
import { commissionStatus } from "../../services/referralService";

const router = Router();
const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const shape = (w: any) => ({
  id: String(w._id),
  resellerId: String(w.resellerId),
  partnerName: w.partnerName,
  resellerCode: w.resellerCode,
  amount: w.amount,
  orderCount: w.orderCount,
  bankName: w.bankName,
  accountNumber: w.accountNumber,
  accountName: w.accountName,
  status: w.status,
  paidAmount: w.paidAmount ?? null,
  paidAt: w.paidAt ?? null,
  adminNote: w.adminNote ?? "",
  createdAt: w.createdAt,
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const status = ["requested", "paid", "rejected"].includes(String(req.query.status)) ? String(req.query.status) : "requested";
    const list = await Withdrawal.find({ status }).sort({ createdAt: status === "requested" ? 1 : -1 }).limit(200).lean();
    const counts = {
      requested: await Withdrawal.countDocuments({ status: "requested" }),
    };
    res.json({ data: { items: list.map(shape), counts } });
  } catch (err) {
    console.error("GET /api/admin/withdrawals failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to load withdrawals");
  }
});

router.patch("/:id/pay", async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "NOT_FOUND", "Withdrawal not found");
    const w: any = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: "requested" },
      { $set: { status: "paid", paidAt: new Date() } }, // claimed first, so a double click cannot pay twice
      { new: true },
    );
    if (!w) return fail(res, 409, "NOT_PENDING", "This withdrawal is not waiting for payment.");

    const commissions: any[] = await Commission.find({ withdrawalId: w._id }).lean();
    const orders = await Order.find({ _id: { $in: commissions.map((c) => c.orderId) } }).select("status deliveredAt").lean();
    const orderById = new Map(orders.map((o: any) => [String(o._id), o]));

    const payable: any[] = [];
    const dropped: any[] = [];
    for (const c of commissions) {
      const st = commissionStatus((orderById.get(String(c.orderId)) as any) ?? {}, c);
      (st === "cancelled" ? dropped : payable).push(c);
    }
    const paidAmount = payable.reduce((n, c) => n + c.amount, 0);
    const paidAt = w.paidAt as Date;

    await Commission.updateMany({ _id: { $in: payable.map((c) => c._id) } }, { $set: { paidAt } });
    if (dropped.length) await Commission.updateMany({ _id: { $in: dropped.map((c) => c._id) } }, { $set: { withdrawalId: null } });
    w.paidAmount = paidAmount;
    if (dropped.length) w.adminNote = `${dropped.length} order(s) were cancelled after the request and were not paid.`;
    await w.save();

    res.json({ data: shape(w) });
  } catch (err) {
    console.error("PATCH /api/admin/withdrawals/:id/pay failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to mark as paid");
  }
});

router.patch("/:id/reject", async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "NOT_FOUND", "Withdrawal not found");
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";
    const w: any = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: "requested" },
      { $set: { status: "rejected", adminNote: note } },
      { new: true },
    );
    if (!w) return fail(res, 409, "NOT_PENDING", "This withdrawal is not waiting for payment.");
    await Commission.updateMany({ withdrawalId: w._id }, { $set: { withdrawalId: null } });
    res.json({ data: shape(w) });
  } catch (err) {
    console.error("PATCH /api/admin/withdrawals/:id/reject failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to reject");
  }
});

export default router;
