/**
 * Admin commission routes. Mount behind requireAuth, like the other admin routes.
 * Destination: server/routes/admin/commissions.ts
 *
 * GET /api/admin/commissions/by-orders?ids=<orderId>,<orderId>...
 *     -> { data: { [orderId]: { partnerName, resellerCode, amount, base, rate, ..., status } } }
 *     Only orders that came through a partner's link appear in the result.
 * GET /api/admin/commissions/partner/:resellerId
 *     -> everything about one partner's sales, for checking before a payout
 * GET /api/admin/commissions/settings          -> program settings (rates, hold days, minimum withdrawal)
 * PUT /api/admin/commissions/settings          -> save them. Applies to FUTURE orders only;
 *                                                  each commission keeps the rates it was created with.
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Commission, ResellerProgram, getProgramSettings } from "../../models/Commission";
import { Order } from "../../models/Order";
import { Reseller } from "../../models/Reseller";
import { ReferralClick } from "../../models/ReferralClick";
import { Withdrawal } from "../../models/Withdrawal";
import { resolveCommissionStatuses } from "../../services/referralService";

const router = Router();

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

router.get("/by-orders", async (req: Request, res: Response) => {
  try {
    const raw = typeof req.query.ids === "string" ? req.query.ids : "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => mongoose.isValidObjectId(s))
      .slice(0, 100);
    if (ids.length === 0) return res.json({ data: {} });

    const commissions = await Commission.find({ orderId: { $in: ids } }).lean();
    if (commissions.length === 0) return res.json({ data: {} });

    const [{ statusById }, partners] = await Promise.all([
      resolveCommissionStatuses(commissions.map((c) => c.resellerId)),
      Reseller.find({ _id: { $in: commissions.map((c) => c.resellerId) } })
        .select("fullName")
        .lean(),
    ]);
    const partnerById = new Map(partners.map((p: any) => [String(p._id), p]));

    const out: Record<string, unknown> = {};
    for (const c of commissions) {
      out[String(c.orderId)] = {
        partnerName: (partnerById.get(String(c.resellerId)) as any)?.fullName ?? "Unknown partner",
        resellerCode: c.resellerCode,
        base: c.base,
        rate: c.rate,
        comboBase: c.comboBase,
        comboRate: c.comboRate,
        singleBase: c.singleBase,
        singleRate: c.singleRate,
        holdDays: c.holdDays,
        amount: c.amount,
        paidAt: c.paidAt ?? null,
        status: statusById.get(String(c._id)) ?? "pending",
      };
    }
    res.json({ data: out });
  } catch (err) {
    console.error("GET /api/admin/commissions/by-orders failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to load commissions");
  }
});

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    res.json({ data: await getProgramSettings() });
  } catch (err) {
    console.error("GET /api/admin/commissions/settings failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to load settings");
  }
});

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

    const comboPercent = num(b.comboPercent);
    const singlePercent = num(b.singlePercent);
    const holdDays = num(b.holdDays);
    const minWithdrawal = num(b.minWithdrawal);

    if (!(comboPercent >= 0 && comboPercent <= 50)) {
      return fail(res, 400, "BAD_REQUEST", "Combo commission must be between 0 and 50 percent");
    }
    if (!(singlePercent >= 0 && singlePercent <= 50)) {
      return fail(res, 400, "BAD_REQUEST", "Single product commission must be between 0 and 50 percent");
    }
    if (!(Number.isInteger(holdDays) && holdDays >= 0 && holdDays <= 90)) {
      return fail(res, 400, "BAD_REQUEST", "Hold days must be a whole number from 0 to 90");
    }
    if (!(Number.isInteger(minWithdrawal) && minWithdrawal >= 0 && minWithdrawal <= 1_000_000)) {
      return fail(res, 400, "BAD_REQUEST", "Minimum withdrawal must be a whole number of naira");
    }

    const saved = await ResellerProgram.findOneAndUpdate(
      { _id: "program" },
      { $set: { comboPercent, singlePercent, holdDays, minWithdrawal } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    res.json({ data: saved });
  } catch (err) {
    console.error("PUT /api/admin/commissions/settings failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to save settings");
  }
});

/** One partner's sales: totals, every referred order with its status, and withdrawal history. */
router.get("/partner/:resellerId", async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resellerId)) return fail(res, 404, "NOT_FOUND", "Partner not found");
    const partner: any = await Reseller.findById(req.params.resellerId).lean();
    if (!partner) return fail(res, 404, "NOT_FOUND", "Partner not found");

    const [commissions, withdrawals, clicks, statuses] = await Promise.all([
      Commission.find({ resellerId: partner._id }).sort({ createdAt: -1 }).lean(),
      Withdrawal.find({ resellerId: partner._id }).sort({ createdAt: -1 }).limit(100).lean(),
      partner.resellerCode ? ReferralClick.countDocuments({ resellerCode: partner.resellerCode }) : Promise.resolve(0),
      resolveCommissionStatuses([partner._id]),
    ]);
    const { statusById, cycleByReseller } = statuses;
    const orders: any[] = await Order.find({ _id: { $in: commissions.map((c: any) => c.orderId) } }).lean();
    const orderById = new Map(orders.map((o) => [String(o._id), o]));

    const totals = { pending: 0, approved: 0, paid: 0, cancelled: 0 };
    let requested = 0;
    const rows = (commissions as any[]).map((c) => {
      const o: any = orderById.get(String(c.orderId)) ?? {};
      const status = statusById.get(String(c._id)) ?? "pending";
      totals[status as keyof typeof totals] += c.amount;
      if (status === "approved" && c.withdrawalId) requested += c.amount;
      const ship = o.shipping ?? {};
      return {
        orderId: String(c.orderId),
        orderNumber: c.orderNumber,
        date: c.createdAt,
        customer: ship.fullName ?? ship.name ?? o.customerName ?? "",
        orderStatus: o.status ?? "unknown",
        deliveredAt: o.deliveredAt ?? null,
        orderTotal: o.total ?? o.totalAmount ?? null,
        base: c.base,
        rate: c.rate,
        amount: c.amount,
        status,
        withdrawalId: c.withdrawalId ? String(c.withdrawalId) : null,
        paidAt: c.paidAt ?? null,
      };
    });

    res.json({
      data: {
        partner: {
          id: String(partner._id),
          fullName: partner.fullName,
          resellerCode: partner.resellerCode ?? "",
          status: partner.status,
          phone: partner.phone,
          whatsapp: partner.whatsapp,
          email: partner.email,
          bankName: partner.bankName ?? "",
          accountNumber: partner.accountNumber ?? "",
          accountName: partner.accountName ?? "",
        },
        stats: { clicks, orders: commissions.length },
        totals,
        requested,
        cycle: cycleByReseller.get(String(partner._id)) ?? null,
        rows,
        withdrawals: (withdrawals as any[]).map((w) => ({
          id: String(w._id),
          date: w.createdAt,
          amount: w.status === "paid" ? w.paidAmount ?? w.amount : w.amount,
          orderCount: w.orderCount,
          status: w.status,
          paidAt: w.paidAt ?? null,
          note: w.adminNote ?? "",
        })),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/commissions/partner/:id failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to load partner sales");
  }
});

export default router;
