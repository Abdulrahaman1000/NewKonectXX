/**
 * SC-VTU  Public VTU routes (/api/vtu). Guests can buy; a signed-in customer's purchases are also saved to their account.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { VtuOrder } from "../models/VtuOrder";
import { customerFromToken } from "../services/customerAuth";
import { VtuError, catalog, checkStatus, confirmPayment, createOrder, dataPlans, publicView, status, verifyMeter } from "../services/vtuService";

const router = Router();
const buckets = new Map<string, { n: number; t: number }>();
const limit = (name: string, max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const k = `${name}:${req.ip}`; const now = Date.now(); const b = buckets.get(k);
  if (!b || now - b.t > windowMs) buckets.set(k, { n: 1, t: now });
  else if (++b.n > max) return res.status(429).json({ error: { message: "Too many tries. Please wait a little and try again." } });
  next();
};
const fail = (res: Response, e: any) => {
  if (e instanceof VtuError) return res.status(e.status).json({ error: { message: e.message } });
  console.error("[vtu]", e);
  return res.status(500).json({ error: { message: "Something went wrong. Please try again." } });
};
const bearer = (req: Request) => (req.header("Authorization") || "").replace(/^Bearer\s+/i, "");

router.get("/status", async (_req, res) => { try { res.json(await status()); } catch (e) { fail(res, e); } });
router.get("/catalog", async (_req, res) => { try { res.json(await catalog()); } catch (e) { fail(res, e); } });
router.get("/plans/:network", limit("plans", 200, 3_600_000), async (req, res) => {
  try { res.json({ plans: await dataPlans(req.params.network) }); } catch (e) { fail(res, e); }
});
router.post("/verify-meter", limit("meter", 40, 3_600_000), async (req, res) => {
  try { res.json(await verifyMeter(String(req.body?.disco ?? ""), String(req.body?.meterType ?? ""), String(req.body?.meter ?? ""))); } catch (e) { fail(res, e); }
});

router.post("/orders", limit("create", 25, 3_600_000), async (req, res) => {
  try {
    const c: any = await customerFromToken(bearer(req));
    const b = req.body ?? {};
    res.json(await createOrder({
      service: String(b.service ?? ""), network: b.network, phone: b.phone, planCode: b.planCode, amount: b.amount,
      disco: b.disco, meterType: b.meterType, meter: b.meter, email: b.email || c?.email, userId: c ? String(c._id) : "",
    }));
  } catch (e) { fail(res, e); }
});

// The customer's own history (needs sign-in).
router.get("/mine", async (req, res) => {
  const c: any = await customerFromToken(bearer(req));
  if (!c) return res.status(401).json({ error: { message: "Please sign in." } });
  const rows = await (VtuOrder as any).find({ $or: [{ userId: String(c._id) }, { email: c.email }] }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ orders: rows.map(publicView) });
});

// Status page. Each call also asks Paystack (if unpaid) or the provider (if still processing). Safe to repeat.
router.get("/orders/:reference", limit("status", 300, 3_600_000), async (req, res) => {
  try {
    const ref = String(req.params.reference);
    const o: any = await (VtuOrder as any).findOne({ reference: ref });
    if (!o) return res.status(404).json({ error: { message: "We could not find that purchase." } });
    const fresh = o.paymentStatus === "pending" ? await confirmPayment(ref) : o.fulfilmentStatus === "processing" ? await checkStatus(ref) : o;
    res.json({ order: publicView(fresh) });
  } catch (e) { fail(res, e); }
});

export default router;
