/** SC-VTU  Admin VTU routes (/api/admin/vtu). Owner only: the permission list does not name this path, so staff are refused. */
import { Router } from "express";
import { VtuOrder } from "../../models/VtuOrder";
import { VtuError, markDelivered, adminPlans, resetPlan, setPlan, checkStatus, getSettings, markFailed, markRefunded, refund, updateSettings, adminProviders, setActiveProvider, dismissProviderAlert } from "../../services/vtuService";

const router = Router();
const fail = (res: any, e: any) => {
  if (e instanceof VtuError) return res.status(e.status).json({ error: { message: e.message } });
  console.error("[vtu admin]", e);
  return res.status(500).json({ error: { message: "Something went wrong." } });
};

const FILTERS: Record<string, any> = {
  all: {},
  attention: { $or: [{ refundStatus: { $in: ["required", "failed"] } }, { paymentStatus: "mismatch" }, { fulfilmentStatus: "processing" }] },
  processing: { paymentStatus: "paid", fulfilmentStatus: "processing" },
  refunds: { refundStatus: { $in: ["required", "refund_requested", "refunded", "failed"] } },
  successful: { fulfilmentStatus: "successful" },
  unpaid: { paymentStatus: "pending" },
};

router.get("/", async (req, res) => {
  try {
    const f = FILTERS[String(req.query.filter ?? "all")] ?? {};
    const rows: any[] = await (VtuOrder as any).find(f).sort({ createdAt: -1 }).limit(200).lean();
    const all: any[] = await (VtuOrder as any).find({}).lean();
    const sold = all.filter((o) => o.fulfilmentStatus === "successful");
    const summary = {
      sales: sold.reduce((s, o) => s + o.amount, 0),
      profit: Math.round(sold.reduce((s, o) => s + (o.amount - o.cost), 0) * 100) / 100,
      count: sold.length,
      processing: all.filter((o) => o.paymentStatus === "paid" && o.fulfilmentStatus === "processing").length,
      refundsNeeded: all.filter((o) => ["required", "failed"].includes(o.refundStatus)).length,
      mismatches: all.filter((o) => o.paymentStatus === "mismatch").length,
    };
    res.json({ summary, orders: rows });
  } catch (e) { fail(res, e); }
});
router.get("/plans/:network", async (req, res) => { try { res.json(await adminPlans(req.params.network)); } catch (e) { fail(res, e); } });
router.put("/plan/:code", async (req, res) => { try { res.json({ plan: await setPlan(req.params.code, req.body ?? {}, String(req.body?.network ?? "")) }); } catch (e) { fail(res, e); } });
router.delete("/plan/:code", async (req, res) => { try { await resetPlan(req.params.code); res.json({ ok: true }); } catch (e) { fail(res, e); } });
// SC-PROV  Which provider is used for new purchases.
router.get("/providers", async (_req, res) => { try { res.json(await adminProviders()); } catch (e) { fail(res, e); } });
router.put("/provider", async (req, res) => { try { res.json(await setActiveProvider(String(req.body?.name ?? ""))); } catch (e) { fail(res, e); } });
router.delete("/provider-alert", async (_req, res) => { try { res.json(await dismissProviderAlert()); } catch (e) { fail(res, e); } });
router.get("/settings", async (_req, res) => { try { res.json({ settings: await getSettings() }); } catch (e) { fail(res, e); } });
router.put("/settings", async (req, res) => { try { res.json({ settings: await updateSettings(req.body ?? {}) }); } catch (e) { fail(res, e); } });
router.post("/:reference/check", async (req, res) => { try { res.json({ order: await checkStatus(req.params.reference) }); } catch (e) { fail(res, e); } });
router.post("/:reference/refund", async (req, res) => { try { res.json({ order: await refund(req.params.reference) }); } catch (e) { fail(res, e); } });
router.post("/:reference/mark-refunded", async (req, res) => { try { res.json({ order: await markRefunded(req.params.reference, String(req.body?.note ?? "")) }); } catch (e) { fail(res, e); } });
router.post("/:reference/mark-delivered", async (req, res) => { try { res.json({ order: await markDelivered(req.params.reference, String(req.body?.note ?? "")) }); } catch (e) { fail(res, e); } });
router.post("/:reference/mark-failed", async (req, res) => { try { res.json({ order: await markFailed(req.params.reference) }); } catch (e) { fail(res, e); } });

export default router;
