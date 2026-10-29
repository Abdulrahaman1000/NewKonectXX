/**
 * SC-ACCT  Customer account routes (/api/account). Separate from the admin login.
 *  POST /request-code  { email }
 *  POST /verify-code   { email, code }  -> { token, customer }
 *  GET  /me            -> { customer }
 *  PUT  /me            { name, phone }
 *  GET  /orders        -> the customer's orders (matched by verified email, plus orders they added)
 *  POST /orders/add    { orderNumber, phone }   (phone must match the order, same rule as Track Order)
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { Order } from "../models/Order";
import { findByNumberAndPhone } from "../services/orderService";
import { AuthError, customerFromToken, publicCustomer, requestCode, saveProfile, verifyCode } from "../services/customerAuth";

const router = Router();

const bucket = new Map<string, { n: number; t: number }>();
function limit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const k = `${req.path}:${req.ip}`;
    const now = Date.now();
    const b = bucket.get(k);
    if (!b || now - b.t > windowMs) bucket.set(k, { n: 1, t: now });
    else if (++b.n > max) return res.status(429).json({ error: { message: "Too many tries. Please wait a little and try again." } });
    next();
  };
}

const fail = (res: Response, e: any) => {
  if (e instanceof AuthError) return res.status(e.status).json({ error: { message: e.message } });
  console.error("[account]", e);
  return res.status(500).json({ error: { message: "Something went wrong. Please try again." } });
};

async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = (req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  const c = await customerFromToken(token);
  if (!c) return res.status(401).json({ error: { message: "Please sign in." } });
  (req as any).customer = c;
  next();
}

router.post("/request-code", limit(12, 3_600_000), async (req, res) => {
  try {
    res.json(await requestCode(req.body?.email));
  } catch (e) {
    fail(res, e);
  }
});

router.post("/verify-code", limit(30, 3_600_000), async (req, res) => {
  try {
    res.json(await verifyCode(req.body?.email, req.body?.code));
  } catch (e) {
    fail(res, e);
  }
});

router.get("/me", requireCustomer, (req, res) => {
  res.json({ customer: publicCustomer((req as any).customer) });
});

router.put("/me", requireCustomer, async (req, res) => {
  try {
    res.json({ customer: await saveProfile((req as any).customer, req.body?.name, req.body?.phone) });
  } catch (e) {
    fail(res, e);
  }
});

const view = (o: any) => ({
  orderNumber: o.orderNumber,
  createdAt: o.createdAt,
  status: o.status,
  total: o.total,
  itemCount: (o.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0),
  firstItem: o.items?.[0]?.name || "",
  plan: o.plan?.kind
    ? { status: o.plan.status, paidTotal: o.plan.paidTotal || 0, deadline: o.plan.deadline || null }
    : null,
});

router.get("/orders", requireCustomer, async (req, res) => {
  try {
    const c: any = (req as any).customer;
    const or: any[] = [{ "shipping.email": new RegExp(`^${c.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }];
    if (c.orderNumbers?.length) or.push({ orderNumber: { $in: c.orderNumbers } });
    const rows = await (Order as any).find({ $or: or }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ orders: rows.map(view) });
  } catch (e) {
    fail(res, e);
  }
});

router.post("/orders/add", requireCustomer, limit(20, 3_600_000), async (req, res) => {
  try {
    const c: any = (req as any).customer;
    const num = String(req.body?.orderNumber ?? "").trim().toUpperCase();
    const order: any = num && (await findByNumberAndPhone(num, String(req.body?.phone ?? "")));
    if (!order) return res.status(404).json({ error: { message: "We could not find that order. Check the order number and the phone number used." } });
    if (!c.orderNumbers.includes(order.orderNumber)) {
      c.orderNumbers.push(order.orderNumber);
      await c.save();
    }
    res.json({ order: view(order) });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
