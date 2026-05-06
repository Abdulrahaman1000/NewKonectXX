/**
 * Hero slides — public read endpoint.
 * GET /api/hero-slides — returns active slides, sorted by displayOrder
 *
 * Filters out slides whose schedule (startsAt/endsAt) excludes "now".
 */

import { Router, Request, Response } from "express";
import { HeroSlide } from "../models/HeroSlide";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const slides = await HeroSlide.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({ data: slides });
  } catch (err) {
    console.error("GET /api/hero-slides failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch hero slides" },
    });
  }
});

export default router;
