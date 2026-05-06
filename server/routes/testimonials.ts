/**
 * Testimonials — public read endpoint.
 * GET /api/testimonials — returns published testimonials.
 */

import { Router, Request, Response } from "express";
import { Testimonial } from "../models/Testimonial";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const testimonials = await Testimonial.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: testimonials });
  } catch (err) {
    console.error("GET /api/testimonials failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch testimonials" },
    });
  }
});

export default router;
