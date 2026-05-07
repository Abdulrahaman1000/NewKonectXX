/**
 * Admin dashboard stats — aggregates for the homepage of /admin.
 *
 * GET /api/admin/dashboard/stats
 *
 * Returns:
 *   - ordersToday: count of orders created today
 *   - revenueToday: sum of totals from PAID orders today (excludes pending)
 *   - pendingOrders: count of orders with status "pending"
 *   - customers: distinct unique customers (by phone) ever
 *   - recentOrders: last 5 orders for quick preview
 */

import { Router, Request, Response } from "express";
import { Order } from "../../models/Order";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [ordersToday, revenueAggResult, pendingOrders, customerAgg, recentOrders] =
      await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startOfToday } }),

        // Revenue today = sum of totals for orders that are 'paid' OR beyond
        // (paid, processing, shipped, delivered) created today.
        // We exclude 'pending' so revenue reflects actual confirmed money.
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfToday },
              status: { $in: ["paid", "processing", "shipped", "delivered"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),

        Order.countDocuments({ status: "pending" }),

        // Unique customers ever (by phone)
        Order.aggregate([
          { $group: { _id: "$shipping.phone" } },
          { $count: "uniqueCustomers" },
        ]),

        // Recent 5 orders, lightweight
        Order.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .select("orderNumber status total shipping.fullName createdAt")
          .lean(),
      ]);

    const revenueToday = revenueAggResult[0]?.total ?? 0;
    const customers = customerAgg[0]?.uniqueCustomers ?? 0;

    res.json({
      data: {
        ordersToday,
        revenueToday,
        pendingOrders,
        customers,
        recentOrders,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/dashboard/stats failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch stats" },
    });
  }
});

export default router;
