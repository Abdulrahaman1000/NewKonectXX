/**
 * Combos — public routes.
 *
 * GET /api/combos                      — list active combos
 * GET /api/combos?category=tech        — filter by category slug
 * GET /api/combos/featured             — get the single featured combo (homepage hero)
 * GET /api/combos/:slug                — get one combo by slug
 *
 * Public routes always filter out isActive:false records.
 */

import { Router, Request, Response } from "express";
import { Combo } from "../models/Combo";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const filter: any = { isActive: true };

    const category = (req.query.category as string | undefined)?.trim().toLowerCase();
    if (category) {
      filter.categorySlugs = category;
    }

    const combos = await Combo.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data: combos });
  } catch (err) {
    console.error("GET /api/combos failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch combos" },
    });
  }
});

router.get("/featured", async (_req: Request, res: Response) => {
  try {
    const combo = await Combo.findOne({
      isFeatured: true,
      isActive: true,
    }).lean();

    if (!combo) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "No featured combo" },
      });
    }

    res.json({ data: combo });
  } catch (err) {
    console.error("GET /api/combos/featured failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch featured combo" },
    });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const combo = await Combo.findOne({
      slug: req.params.slug.toLowerCase().trim(),
      isActive: true,
    }).lean();

    if (!combo) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }

    res.json({ data: combo });
  } catch (err) {
    console.error(`GET /api/combos/${req.params.slug} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch combo" },
    });
  }
});

export default router;
