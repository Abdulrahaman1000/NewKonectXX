/**
 * Payments routes.
 *
 * POST /api/payments/initialize           — start Paystack checkout (JSON body)
 * GET  /api/payments/verify/:reference    — confirm payment (no body)
 * POST /api/payments/webhook/paystack     — receives Paystack events (RAW body for HMAC)
 *
 * The webhook route uses express.raw inline because we need the original
 * bytes to compute HMAC. JSON parsing for /initialize uses Express's normal
 * JSON parser (mounted globally in index.ts).
 */

import express, { Router, Request, Response } from "express";
import { config } from "../config";
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  PaystackError,
} from "../services/paystackService";
import {
  findByOrderNumber,
  markOrderPaid,
} from "../services/orderService";

const router = Router();

/**
 * POST /api/payments/initialize
 * Body: { orderNumber: string }
 */
router.post("/initialize", async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.body || {};
    if (!orderNumber || typeof orderNumber !== "string") {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "orderNumber is required" },
      });
    }

    const order = await findByOrderNumber(orderNumber);
    if (!order) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    if (
      order.status === "paid" ||
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      return res.status(409).json({
        error: { code: "ALREADY_PAID", message: "This order is already paid" },
      });
    }

    if (order.paymentMethod !== "paystack") {
      return res.status(400).json({
        error: {
          code: "WRONG_METHOD",
          message: `Order payment method is "${order.paymentMethod}", not paystack`,
        },
      });
    }

    const reference = `${order.orderNumber}-${Date.now()}`;
    const callbackUrl = `${config.siteUrl}/order-confirmation/${order.orderNumber}?ref=${reference}`;

    const init = await initializeTransaction({
      email: order.shipping.email,
      amountKobo: order.total * 100,
      reference,
      callbackUrl,
      metadata: {
        orderNumber: order.orderNumber,
        customerName: order.shipping.fullName,
      },
    });

    return res.status(200).json({
      data: {
        authorizationUrl: init.authorization_url,
        reference,
      },
    });
  } catch (err: any) {
    if (err instanceof PaystackError) {
      return res.status(err.status).json({
        error: { code: "PAYSTACK_ERROR", message: err.message },
      });
    }
    console.error("POST /api/payments/initialize failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to initialize payment" },
    });
  }
});

/**
 * GET /api/payments/verify/:reference
 */
router.get("/verify/:reference", async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "reference required" },
      });
    }

    const verification = await verifyTransaction(reference);

    if (verification.status !== "success") {
      return res.status(200).json({
        data: { paid: false, status: verification.status },
      });
    }

    const orderNumber =
      String(verification.metadata?.orderNumber ?? "") ||
      reference.split("-").slice(0, 3).join("-");

    const order = await markOrderPaid(orderNumber, reference);
    if (!order) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Payment succeeded but order not found",
        },
      });
    }

    return res.json({
      data: {
        paid: true,
        orderNumber: order.orderNumber,
        amountPaid: verification.amount / 100,
      },
    });
  } catch (err: any) {
    if (err instanceof PaystackError) {
      return res.status(err.status).json({
        error: { code: "PAYSTACK_ERROR", message: err.message },
      });
    }
    console.error("GET /api/payments/verify failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Verification failed" },
    });
  }
});

/**
 * POST /api/payments/webhook/paystack
 *
 * Uses express.raw inline so this endpoint receives unparsed body bytes
 * for HMAC SHA512 verification.
 */
router.post(
  "/webhook/paystack",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers["x-paystack-signature"] as string | undefined;
      const rawBody = (req.body as Buffer).toString("utf-8");

      if (!verifyWebhookSignature(rawBody, signature)) {
        console.warn("⚠️  Paystack webhook with invalid signature");
        return res.status(401).send("Invalid signature");
      }

      const payload = JSON.parse(rawBody);
      const eventType = payload.event;
      const reference = payload?.data?.reference;

      console.log(`📥 Paystack webhook: ${eventType} (ref: ${reference})`);

      if (eventType === "charge.success" && reference) {
        const verification = await verifyTransaction(reference);
        if (verification.status === "success") {
          const orderNumber = String(verification.metadata?.orderNumber ?? "");
          if (orderNumber) {
            const order = await markOrderPaid(orderNumber, reference);
            console.log(
              `✅ Marked order paid via webhook: ${orderNumber} (${order ? "found" : "not found"})`,
            );
          }
        }
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("Paystack webhook error:", err);
      return res.status(200).send("OK");
    }
  },
);

export default router;
