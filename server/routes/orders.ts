/**
 * Orders — public routes.
 *
 * POST /api/orders                — create a new order (customer checkout)
 * GET  /api/orders/track          — look up an order by orderNumber + phone
 * GET  /api/orders/gift-progress  — how much this phone number has spent toward the free gift
 *
 * Admin order management lives in routes/admin/orders.ts (Phase 5D).
 */

import { Router, Request, Response } from "express";
import {
  createOrder,
  findByNumberAndPhone,
  previewOrder,
  LOCAL_DELIVERY_FEE,
  OrderError,
} from "../services/orderService";
import { quoteInstallment, viewPlan } from "../services/installmentRules";
import { requestExtension, recheckPlanPayments } from "../services/installments";
import { orderHasBulk } from "../services/bulkPricing";
import { attachReferral } from "../services/referralService";
import {
  GIFT_THRESHOLD,
  GIFT_WINDOW_DAYS,
  getPriorSpend,
  normalizePhone,
} from "../services/giftProgress";

const router = Router();

const ALLOWED_METHODS = ["paystack", "flutterwave", "bank_transfer", "cod", "whatsapp"];

// Order creation limiter: 10 orders per minute per visitor, so nobody can drain stock by spamming.
const orderHits = new Map<string, { count: number; resetAt: number }>();
function orderLimited(ip: string): boolean {
  const now = Date.now();
  const hit = orderHits.get(ip);
  if (!hit || hit.resetAt < now) {
    orderHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  hit.count += 1;
  return hit.count > 10;
}

// Small in-memory limiter for gift-progress: 30 lookups per minute per IP.
const progressHits = new Map<string, { count: number; resetAt: number }>();
function progressLimited(ip: string): boolean {
  const now = Date.now();
  const hit = progressHits.get(ip);
  if (!hit || hit.resetAt < now) {
    progressHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  hit.count += 1;
  return hit.count > 30;
}

router.get("/gift-progress", async (req: Request, res: Response) => {
  try {
    if (progressLimited(req.ip ?? "unknown")) {
      return res.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." },
      });
    }
    const phoneKey = normalizePhone(req.query.phone);
    const spent = await getPriorSpend(phoneKey);
    // Only the total is returned, never order details.
    return res.json({
      data: {
        spent,
        threshold: GIFT_THRESHOLD,
        remaining: Math.max(0, GIFT_THRESHOLD - spent),
        windowDays: GIFT_WINDOW_DAYS,
      },
    });
  } catch (err) {
    console.error("GET /api/orders/gift-progress failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Could not check gift progress" },
    });
  }
});

// Checkout asks what is ready and what is not, before the customer pays. Changes nothing.
const previewHits = new Map<string, { count: number; resetAt: number }>();
function previewLimited(ip: string): boolean {
  const now = Date.now();
  const hit = previewHits.get(ip);
  if (!hit || hit.resetAt < now) {
    previewHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  hit.count += 1;
  return hit.count > 120;
}

router.post("/preview", async (req: Request, res: Response) => {
  try {
    if (previewLimited(req.ip ?? "unknown")) {
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } });
    }
    const raw = req.body?.items;
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Your cart is empty or has too many items" } });
    }
    const items = raw.map((it: any) => ({
      comboId: String(it?.comboId ?? ""),
      quantity: Number(it?.quantity),
      isFreeGift: Boolean(it?.isFreeGift),
    }));
    const data = await previewOrder(items, String(req.body?.city ?? "").slice(0, 80));
    return res.json({ data });
  } catch (err) {
    console.error("POST /api/orders/preview failed:", err);
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Could not check the order" } });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    if (orderLimited(req.ip ?? "unknown")) {
      return res.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many orders. Please wait a minute and try again." },
      });
    }

    const { items, shipping, paymentMethod, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Your cart is empty or has too many items" },
      });
    }

    // Basic input shape validation
    if (!shipping || typeof shipping !== "object") {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Missing shipping details" },
      });
    }
    const required: (keyof typeof shipping)[] = [
      "fullName",
      "email",
      "phone",
      "state",
      "city",
      "street",
    ];
    for (const field of required) {
      if (!shipping[field] || typeof shipping[field] !== "string") {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: `Missing field: ${field}` },
        });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email.trim()) || shipping.email.length > 200) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Please enter a valid email address" },
      });
    }

    if (!paymentMethod || typeof paymentMethod !== "string" || !ALLOWED_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Choose a valid payment method" },
      });
    }

    const order = await createOrder({ items, shipping, paymentMethod, notes, ackPreorder: req.body.ackPreorder === true, partialChoice: req.body.partialChoice === "now" ? "now" : "together", installment: req.body.installment && req.body.installment.pay === true ? { payments: Number(req.body.installment.payments), ack: req.body.installment.ack === true, ip: req.ip } : undefined });
    await attachReferral(order, req.body.ref);

    return res.status(201).json({ data: order });
  } catch (err: any) {
    if (err instanceof OrderError) {
      return res.status(err.status).json({
        error: { code: err.code, message: err.message },
      });
    }
    console.error("POST /api/orders failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to create order" },
    });
  }
});

// SC-INST: what instalment options this cart has (if any). Changes nothing.
router.post("/installment-quote", async (req: Request, res: Response) => {
  try {
    if (previewLimited(req.ip ?? "unknown")) {
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } });
    }
    const raw = req.body?.items;
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) {
      return res.json({ data: { eligible: false, reason: "empty" } });
    }
    const items = raw.map((it: any) => ({ comboId: String(it?.comboId ?? ""), quantity: Number(it?.quantity), isFreeGift: Boolean(it?.isFreeGift) }));
    const lines = items.filter((i: any) => !i.isFreeGift);
    if (lines.length !== 1 || items.length !== lines.length) {
      return res.json({ data: { eligible: false, reason: "one_item_only" } });
    }
    const p = await previewOrder(items, String(req.body?.city ?? "").slice(0, 80));
    if (p.lines.length !== 1 || p.hasPre || p.lines[0].short || (await orderHasBulk(items))) {
      return res.json({ data: { eligible: false, reason: "not_available" } });
    }
    const shippingFee = p.local ? LOCAL_DELIVERY_FEE : 0;
    const total = p.subtotal + shippingFee;
    const quote = quoteInstallment(p.subtotal, total);
    return res.json({ data: { eligible: Boolean(quote), reason: quote ? "" : "price_range", goodsPrice: p.subtotal, shippingFee, total, quote } });
  } catch (err) {
    console.error("POST /api/orders/installment-quote failed:", err);
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Could not check instalments" } });
  }
});

// SC-INST: the customer asks for 3 to 7 extra days (once)
const extHits = new Map<string, { count: number; resetAt: number }>();
router.post("/extension", async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const hit = extHits.get(ip);
    if (!hit || hit.resetAt < now) extHits.set(ip, { count: 1, resetAt: now + 60_000 });
    else if (++hit.count > 10) {
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } });
    }
    const updated: any = await requestExtension(String(req.body?.orderNumber ?? ""), String(req.body?.phone ?? ""), Number(req.body?.days));
    return res.json({ data: { deadline: updated.plan.deadline, extensionDays: updated.plan.extensionDays, planView: viewPlan(updated) } });
  } catch (err: any) {
    if (err instanceof OrderError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    console.error("POST /api/orders/extension failed:", err);
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Could not add the days" } });
  }
});

// Track Order: 30 lookups a minute per visitor, so nobody can guess order numbers and phone numbers
const trackHits = new Map<string, { count: number; resetAt: number }>();
function trackLimited(ip: string): boolean {
  const now = Date.now();
  const hit = trackHits.get(ip);
  if (!hit || hit.resetAt < now) {
    trackHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  hit.count += 1;
  return hit.count > 30;
}

router.get("/track", async (req: Request, res: Response) => {
  try {
    if (trackLimited(req.ip ?? "unknown")) {
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many tries. Please wait a minute and try again." } });
    }
    const orderNumber = String(req.query.orderNumber ?? "").trim();
    const phone = String(req.query.phone ?? "").trim();

    if (!orderNumber || !phone) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "orderNumber and phone are required",
        },
      });
    }

    let order = await findByNumberAndPhone(orderNumber, phone);
    // SC-INST recheck on track: a part payment the customer made but we did not count yet (webhook missed) is counted now.
    if (order && (order as any).plan && (order as any).status === "pending") {
      try {
        const r = await recheckPlanPayments(order.orderNumber, { sinceHours: 72, maxRefs: 3 });
        if (r.recorded > 0) order = await findByNumberAndPhone(orderNumber, phone);
      } catch (e) {
        console.error("track: payment recheck failed:", e);
      }
    }
    if (!order) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "No order matches those details",
        },
      });
    }

    // Strip sensitive internal fields before returning to public
    const { adminNotes: _drop, ...rest } = order as any;
    const publicOrder: any = rest;
    if (publicOrder.plan) {
      publicOrder.planView = viewPlan(publicOrder);
      publicOrder.plan = {
        ...publicOrder.plan,
        initiated: undefined,
        payments: (publicOrder.plan.payments ?? []).map((p: any) => ({ n: p.n, amount: p.amount, paidAt: p.paidAt })),
      };
    }
    return res.json({ data: publicOrder });
  } catch (err) {
    console.error("GET /api/orders/track failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to track order" },
    });
  }
});

export default router;
