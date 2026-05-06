/**
 * Combos API — public read endpoints.
 *
 * GET /api/combos             — list all active combos
 * GET /api/combos/featured    — featured combo (homepage hero combo)
 * GET /api/combos/:slug       — one combo by slug
 *
 * These are PUBLIC: no auth required. They return only active combos
 * to prevent leaking work-in-progress data.
 *
 * Admin endpoints (create/update/delete) will live in routes/admin/combos.ts later
 * and will be auth-protected.
 */

import { Router, Request, Response } from "express";
import { Combo } from "../models/Combo";

const router = Router();

// GET /api/combos
// Returns all active combos, sorted with featured first, then newest first.
router.get("/", async (_req: Request, res: Response) => {
  try {
    const combos = await Combo.find({ isActive: true })
      .sort({ isFeatured: -1, createdAt: -1 })
      .lean();
    res.json({ data: combos });
  } catch (err) {
    console.error("GET /api/combos failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch combos" },
    });
  }
});

// GET /api/combos/featured
// Returns the featured combo (the one shown on the homepage hero).
// Returns 404 if no combo is currently featured.
router.get("/featured", async (_req: Request, res: Response) => {
  try {
    const combo = await Combo.findOne({ isActive: true, isFeatured: true })
      .lean();
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

// GET /api/combos/:slug
// Returns one combo by its slug.
// Returns 404 if not found or not active.
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const combo = await Combo.findOne({ slug, isActive: true }).lean();
    if (!combo) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: `Combo not found: ${slug}` },
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
