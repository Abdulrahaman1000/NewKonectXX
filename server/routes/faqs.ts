/**
 * FAQs — public read endpoint.
 * GET /api/faqs — returns published FAQs sorted by `order`.
 */

import { Router, Request, Response } from "express";
import { FAQ } from "../models/FAQ";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const faqs = await FAQ.find({ isPublished: true }).sort({ order: 1 }).lean();
    res.json({ data: faqs });
  } catch (err) {
    console.error("GET /api/faqs failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch FAQs" },
    });
  }
});

export default router;
