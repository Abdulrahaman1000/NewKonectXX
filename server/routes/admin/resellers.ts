/**
 * Admin partner (reseller) management routes. Mount behind requireAuth, like the other admin routes.
 *
 * GET    /api/admin/resellers?status=pending|approved|suspended&q=   — list (newest first)
 * GET    /api/admin/resellers/counts                                  — { pending, approved, suspended }
 * PATCH  /api/admin/resellers/:id/status   { status }                 — "approved" or "suspended"
 * PATCH  /api/admin/resellers/:id/notes    { adminNotes }             — private admin notes
 * DELETE /api/admin/resellers/:id                                     — reject a PENDING application
 *
 * passwordHash is select:false on the model, so it is never returned from any of these.
 */

import { sendPartnerApproved } from "../../services/emailService";
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
    { _id: "reseller-code" },
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
        { resellerCode: rx },
      ];
    }

    const resellers = await Reseller.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ data: resellers });
  } catch (err) {
    console.error("GET /api/admin/resellers failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to fetch partners");
  }
});

router.get("/counts", async (_req: Request, res: Response) => {
  try {
    const rows = await Reseller.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    const counts: Record<Status, number> = { pending: 0, approved: 0, suspended: 0 };
    for (const row of rows) if (isStatus(row._id)) counts[row._id] = row.n;
    res.json({ data: counts });
  } catch (err) {
    console.error("GET /api/admin/resellers/counts failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to fetch counts");
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body || {};
    if (status !== "approved" && status !== "suspended") {
      return fail(res, 400, "BAD_REQUEST", "Status must be approved or suspended");
    }

    const reseller = await Reseller.findById(req.params.id).select("status resellerCode");
    if (!reseller) return fail(res, 404, "NOT_FOUND", "Partner not found");

    if (status === "suspended" && reseller.status !== "approved") {
      return fail(res, 409, "CONFLICT", "Only approved partners can be suspended");
    }

    const update: Record<string, unknown> = { status };
    if (status === "approved" && !reseller.resellerCode) {
      // First approval: assign the code. Reinstating a suspended reseller keeps theirs.
      update.resellerCode = await nextResellerCode();
      update.approvedAt = new Date();
    }
    if (status === "suspended") update.suspendedAt = new Date();

    const updated = await Reseller.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    // Tell the partner (non-blocking; email problems never fail the approval)
    if (status === "approved" && reseller.status !== "approved" && updated?.email && updated?.resellerCode) {
      void sendPartnerApproved({ fullName: updated.fullName, email: updated.email, code: updated.resellerCode });
    }

    res.json({ data: updated });
  } catch (err: any) {
    if (err.name === "CastError") return fail(res, 404, "NOT_FOUND", "Partner not found");
    console.error(`PATCH /api/admin/resellers/${req.params.id}/status failed:`, err);
    fail(res, 500, "SERVER_ERROR", "Failed to update partner");
  }
});

router.patch("/:id/notes", async (req: Request, res: Response) => {
  try {
    const raw = req.body?.adminNotes;
    const adminNotes = typeof raw === "string" ? raw.trim().slice(0, 1000) : "";
    const updated = await Reseller.findByIdAndUpdate(
      req.params.id,
      { adminNotes },
      { new: true },
    ).lean();
    if (!updated) return fail(res, 404, "NOT_FOUND", "Partner not found");
    res.json({ data: updated });
  } catch (err: any) {
    if (err.name === "CastError") return fail(res, 404, "NOT_FOUND", "Partner not found");
    console.error(`PATCH /api/admin/resellers/${req.params.id}/notes failed:`, err);
    fail(res, 500, "SERVER_ERROR", "Failed to save notes");
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const reseller = await Reseller.findById(req.params.id).select("status");
    if (!reseller) return fail(res, 404, "NOT_FOUND", "Partner not found");

    // Once someone has been approved they may have referrals and commission on record,
    // so they are suspended, never deleted.
    if (reseller.status !== "pending") {
      return fail(
        res,
        409,
        "CONFLICT",
        "Only pending applications can be rejected. Suspend approved partners instead.",
      );
    }

    await reseller.deleteOne();
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") return fail(res, 404, "NOT_FOUND", "Partner not found");
    console.error(`DELETE /api/admin/resellers/${req.params.id} failed:`, err);
    fail(res, 500, "SERVER_ERROR", "Failed to reject application");
  }
});

export default router;
