/**
 * Public, read-only gift list for the shop.  Destination: server/routes/gifts.ts
 * Create / edit / delete live in routes/admin/giftRoutes.ts, behind the admin login.
 */
import { Router } from "express";
import { Gift } from "../models/Gift";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const gifts = await Gift.find({ isActive: { $ne: false } }).sort({ createdAt: -1 });
    res.json(gifts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching gifts" });
  }
});

export default router;
