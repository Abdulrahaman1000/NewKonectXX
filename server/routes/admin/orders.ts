/**
 * Admin order routes.
 *
 * All endpoints require a valid admin JWT (mounted under requireAuth).
 *
 * GET    /api/admin/orders                  — list orders (filterable + paginated)
 * GET    /api/admin/orders/:id              — order detail (full, including adminNotes)
 * PATCH  /api/admin/orders/:id/status       — update status. For paid/shipped/delivered
 *                                              this goes through the service so the
 *                                              right lifecycle email gets sent.
 * PATCH  /api/admin/orders/:id              — update tracking URL, admin notes
 */

import { Router, Request, Response } from "express";
import { Order, OrderStatus } from "../../models/Order";
import {
  markOrderPaid,
  markOrderShipped,
  markOrderDelivered,
  cancelOrRefundOrder,
  createOrder,
  OrderError,
} from "../../services/orderService";
import { attachReferral } from "../../services/referralService";

const router = Router();

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

// GET /api/admin/orders
// Query params: status, search (orderNumber/phone/email), page, limit
router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt((req.query.limit as string) || "25", 10)),
    );

    const filter: any = {};
    if (status && VALID_STATUSES.includes(status as OrderStatus)) {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "shipping.phone": searchRegex },
        { "shipping.email": searchRegex },
        { "shipping.fullName": searchRegex },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      data: orders,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/orders failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch orders" },
    });
  }
});

// POST /api/admin/orders/manual
// Records a sale made outside the website (WhatsApp, walk-in...). Goes through the same createOrder
// as the checkout, so stock, cost, profit, gift progress and commission all work the same.
const MANUAL_METHODS = ["bank_transfer", "cash", "pos"];
const MANUAL_SOURCES = ["whatsapp", "walkin", "social", "other"];

router.post("/manual", async (req: Request, res: Response) => {
  const bad = (message: string) =>
    res.status(400).json({ error: { code: "BAD_REQUEST", message } });
  try {
    const b = req.body ?? {};
    const c = b.customer ?? {};
    const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

    const fullName = str(c.fullName, 100);
    const phone = str(c.phone, 30);
    const email = str(c.email, 200);
    if (!fullName) return bad("Enter the customer's name");
    if (phone.replace(/\D/g, "").length < 10) return bad("Enter a valid phone number");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("That email address is not valid");
    if (!MANUAL_METHODS.includes(b.paymentMethod)) return bad("Choose how the customer is paying");
    if (!MANUAL_SOURCES.includes(b.source)) return bad("Choose where the order came from");

    const pickup = b.pickup === true;
    const state = pickup ? "Kwara" : str(c.state, 80);
    const city = pickup ? "Ilorin" : str(c.city, 80);
    const street = pickup ? "Pickup / walk-in" : str(c.street, 200);
    if (!pickup && (!state || !city || !street)) return bad("Enter the delivery state, city and address");

    if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 20) {
      return bad("Add between 1 and 20 products");
    }
    const items = b.items.map((it: any) => {
      const selected: Record<string, string> = {};
      if (it?.selectedVariants && typeof it.selectedVariants === "object") {
        for (const [k, v] of Object.entries(it.selectedVariants).slice(0, 30)) {
          if (typeof v === "string") selected[String(k).slice(0, 80)] = v.slice(0, 80);
        }
      }
      // free gifts are not part of manual sales
      return { comboId: String(it?.comboId ?? ""), quantity: Number(it?.quantity), selectedVariants: selected, isFreeGift: false };
    });

    const order = await createOrder(
      {
        items,
        shipping: { fullName, phone, email, state, city, street, landmark: str(c.landmark, 200) },
        paymentMethod: b.paymentMethod,
        notes: str(b.notes, 500),
      },
      { source: b.source, paid: b.paid === true, pickup },
    );
    await attachReferral(order, b.ref);

    res.status(201).json({ data: order });
  } catch (err: any) {
    if (err instanceof OrderError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    console.error("POST /api/admin/orders/manual failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to record the sale" } });
  }
});

// GET /api/admin/orders/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }
    res.json({ data: order });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }
    console.error(`GET /api/admin/orders/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch order" },
    });
  }
});

// PATCH /api/admin/orders/:id/status
// Body: { status: OrderStatus, trackingNumber?: string, trackingProviderUrl?: string }
//
// For paid/shipped/delivered we route through orderService so the matching
// lifecycle email is sent. Other statuses (processing/cancelled/refunded) just
// update directly — there's no customer-facing email for those (you can change
// that later if needed).
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status, trackingNumber, trackingProviderUrl } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
        },
      });
    }

    // Need the order number to call service helpers
    const existing = await Order.findById(req.params.id).select("orderNumber status").lean();
    if (!existing) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    let updated: any = null;

    // A cancelled or refunded order is finished. Only cancelled -> refunded is allowed
    // (money returned later); reopening it would hand out stock that is already back on the shelf.
    if (
      (existing.status === "cancelled" || existing.status === "refunded") &&
      !(existing.status === "cancelled" && status === "refunded") &&
      status !== existing.status
    ) {
      return res.status(409).json({
        error: {
          code: "ORDER_CLOSED",
          message: `This order is ${existing.status}. Create a new order instead of reopening it.`,
        },
      });
    }

    if (status === "paid") {
      updated = await markOrderPaid(
        existing.orderNumber,
        // Admin-driven manual mark — use a synthetic ref so we know it wasn't gateway
        `admin-mark-paid-${Date.now()}`,
      );
    } else if (status === "shipped") {
      updated = await markOrderShipped(
        existing.orderNumber,
        typeof trackingNumber === "string" ? trackingNumber.trim() || undefined : undefined,
        typeof trackingProviderUrl === "string" ? trackingProviderUrl.trim() || undefined : undefined,
      );
    } else if (status === "delivered") {
      updated = await markOrderDelivered(existing.orderNumber);
    } else if (status === "cancelled" || status === "refunded") {
      // Puts the stock back exactly once
      updated = await cancelOrRefundOrder(existing.orderNumber, status);
    } else {
      // processing / pending: no email, no stock change
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true },
      ).lean();
      updated = order;
    }

    if (!updated) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    res.json({ data: updated });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }
    console.error(`PATCH /api/admin/orders/${req.params.id}/status failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update status" },
    });
  }
});

// PATCH /api/admin/orders/:id
// Body: { trackingUrl?: string, adminNotes?: string, trackingNumber?: string }
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (typeof req.body.trackingUrl === "string") {
      update.trackingProviderUrl = req.body.trackingUrl.trim();
    }
    if (typeof req.body.trackingProviderUrl === "string") {
      update.trackingProviderUrl = req.body.trackingProviderUrl.trim();
    }
    if (typeof req.body.trackingNumber === "string") {
      update.trackingNumber = req.body.trackingNumber.trim();
    }
    if (typeof req.body.adminNotes === "string") {
      update.adminNotes = req.body.adminNotes.trim();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Nothing to update" },
      });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).lean();

    if (!order) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    res.json({ data: order });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }
    console.error(`PATCH /api/admin/orders/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update order" },
    });
  }
});

export default router;
