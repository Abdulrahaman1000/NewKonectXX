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
  OrderError,
} from "../services/orderService";
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

    const order = await createOrder({ items, shipping, paymentMethod, notes });
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

router.get("/track", async (req: Request, res: Response) => {
  try {
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

    const order = await findByNumberAndPhone(orderNumber, phone);
    if (!order) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "No order matches those details",
        },
      });
    }

    // Strip sensitive internal fields before returning to public
    const { adminNotes: _drop, ...publicOrder } = order;
    return res.json({ data: publicOrder });
  } catch (err) {
    console.error("GET /api/orders/track failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to track order" },
    });
  }
});

export default router;
