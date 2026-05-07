/**
 * Admin order routes.
 *
 * All endpoints require a valid admin JWT (mounted under requireAuth).
 *
 * GET    /api/admin/orders                  — list orders (filterable + paginated)
 * GET    /api/admin/orders/:id              — order detail (full, including adminNotes)
 * PATCH  /api/admin/orders/:id/status       — update status with side effects (sets paidAt, etc.)
 * PATCH  /api/admin/orders/:id              — update tracking URL, admin notes
 * GET    /api/admin/dashboard/stats         — aggregate stats for dashboard
 */

import { Router, Request, Response } from "express";
import { Order, OrderStatus } from "../../models/Order";

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
// Body: { status: OrderStatus }
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
        },
      });
    }

    const update: any = { status };
    // Side effect: when marking 'paid', set paidAt
    if (status === "paid") {
      update.paidAt = new Date();
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
    console.error(`PATCH /api/admin/orders/${req.params.id}/status failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update status" },
    });
  }
});

// PATCH /api/admin/orders/:id
// Body: { trackingUrl?: string, adminNotes?: string }
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (typeof req.body.trackingUrl === "string") {
      update.trackingUrl = req.body.trackingUrl.trim();
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
