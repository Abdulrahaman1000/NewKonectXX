/**
 * Orders — public routes.
 *
 * POST /api/orders        — create a new order (customer checkout)
 * GET  /api/orders/track  — look up an order by orderNumber + phone
 *
 * Admin order management lives in routes/admin/orders.ts (Phase 5D).
 */

import { Router, Request, Response } from "express";
import {
  createOrder,
  findByNumberAndPhone,
  OrderError,
} from "../services/orderService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { items, shipping, paymentMethod, notes } = req.body;

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

    if (!paymentMethod) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Payment method required" },
      });
    }

    const order = await createOrder({ items, shipping, paymentMethod, notes });

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
