/**
 * Admin Reseller management routes. Mount behind requireAuth, like the other admin routes.
 *
 * GET    /api/admin/Resellers?status=pending|approved|suspended&q=   — list (newest first)
 * GET    /api/admin/Resellers/counts                                  — { pending, approved, suspended }
 * PATCH  /api/admin/Resellers/:id/status   { status }                 — "approved" or "suspended"
 * DELETE /api/admin/Resellers/:id                                     — reject a PENDING application
 *
 * passwordHash is select:false on the model, so it is never returned from any of these.
 */

import { Router, Request, Response } from "express";
import { Reseller, ResellerCounter } from "../../models/Reseller";

const router = Router();

const STATUSES = ["pending", "approved", "suspended"] as const;
type Status = (typeof STATUSES)[number];
const isStatus = (v: unknown): v is Status =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

/** SC1001, SC1002, ... Atomic, so two approvals at once never share a code. */
async function nextResellerCode(): Promise<string> {
  const counter = await ResellerCounter.findOneAndUpdate(
    { _id: "Reseller-code" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `SC${1000 + counter.seq}`;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (isStatus(req.query.status)) filter.status = req.query.status;

    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { fullName: rx },
        { email: rx },
        { phone: rx },
        { whatsapp: rx },
        { ResellerCode: rx },
      ];
    }

    const Resellers = await Reseller.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ data: Resellers });
  } catch (err) {
    console.error("GET /api/admin/Resellers failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to fetch Resellers");
  }
});

router.get("/counts", async (_req: Request, res: Response) => {
  try {
    const rows = await Reseller.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    const counts: Record<Status, number> = { pending: 0, approved: 0, suspended: 0 };
    for (const row of rows) if (isStatus(row._id)) counts[row._id] = row.n;
    res.json({ data: counts });
  } catch (err) {
    console.error("GET /api/admin/Resellers/counts failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to fetch counts");
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body || {};
    if (status !== "approved" && status !== "suspended") {
      return fail(res, 400, "BAD_REQUEST", "Status must be approved or suspended");
    }

    const Reseller = await Reseller.findById(req.params.id).select("status ResellerCode");
    if (!Reseller) return fail(res, 404, "NOT_FOUND", "Reseller not found");

    if (status === "suspended" && Reseller.status !== "approved") {
      return fail(res, 409, "CONFLICT", "Only approved Resellers can be suspended");
    }

    const update: Record<string, unknown> = { status };
    if (status === "approved" && !Reseller.ResellerCode) {
      // First approval: assign the code. Reinstating a suspended Reseller keeps theirs.
      update.ResellerCode = await nextResellerCode();
      update.approvedAt = new Date();
    }
    if (status === "suspended") update.suspendedAt = new Date();

    const updated = await Reseller.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    res.json({ data: updated });
  } catch (err: any) {
    if (err.name === "CastError") return fail(res, 404, "NOT_FOUND", "Reseller not found");
    console.error(`PATCH /api/admin/Resellers/${req.params.id}/status failed:`, err);
    fail(res, 500, "SERVER_ERROR", "Failed to update Reseller");
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const Reseller = await Reseller.findById(req.params.id).select("status");
    if (!Reseller) return fail(res, 404, "NOT_FOUND", "Reseller not found");

    // Once someone has been approved they may have referrals and commission on record,
    // so they are suspended, never deleted.
    if (Reseller.status !== "pending") {
      return fail(
        res,
        409,
        "CONFLICT",
        "Only pending applications can be rejected. Suspend approved Resellers instead.",
      );
    }

    await Reseller.deleteOne();
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") return fail(res, 404, "NOT_FOUND", "Reseller not found");
    console.error(`DELETE /api/admin/Resellers/${req.params.id} failed:`, err);
    fail(res, 500, "SERVER_ERROR", "Failed to reject application");
  }
});

export default router;
