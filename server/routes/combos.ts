/**
 * Combos — public routes.
 *
 * GET /api/combos                      — list active combos
 * GET /api/combos?category=tech        — filter by category slug
 * GET /api/combos/featured             — get the single featured combo (homepage hero)
 * GET /api/combos/search?q=watch       — live search by name/tagline
 * GET /api/combos/:slug                — get one combo by slug
 *
 * NOTE: /search and /featured must come BEFORE /:slug or Express will treat
 * them as slugs.
 *
 * Public routes always filter out isActive:false records.
 */

import { Router, Request, Response } from "express";
import { Combo } from "../models/Combo";

const router = Router();

// Escape user input so regex characters don't break the query
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

/**
 * Live search — used by the header search bar.
 * Case-insensitive regex match on name + tagline.
 * Returns up to `limit` (default 8) active combos.
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const limit = Math.min(
      20,
      Math.max(1, parseInt((req.query.limit as string) || "8", 10)),
    );

    if (!q) {
      return res.json({ data: [] });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const combos = await Combo.find({
      isActive: true,
      $or: [{ name: regex }, { tagline: regex }],
    })
      // Sort so featured + best sellers naturally surface higher
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ data: combos });
  } catch (err) {
    console.error("GET /api/combos/search failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to search combos" },
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
