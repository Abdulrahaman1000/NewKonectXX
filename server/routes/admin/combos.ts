/**
 * Admin combos CRUD routes.
 *
 * GET    /api/admin/combos       — list ALL (including hidden)
 * GET    /api/admin/combos/:id   — get one combo (incl. hidden)
 * POST   /api/admin/combos       — create
 * PATCH  /api/admin/combos/:id   — update
 * DELETE /api/admin/combos/:id   — soft delete (sets isActive: false)
 *
 * All routes require admin JWT (mounted under requireAuth in index.ts).
 *
 * Notes:
 *  - Slugs auto-generate from name if not provided
 *  - Slug uniqueness enforced
 *  - Items get auto-generated id if missing
 *  - Setting isFeatured:true automatically un-features any other combo
 *    (only one featured combo at a time, since the homepage hero shows one)
 */

import { Router, Request, Response } from "express";
import { Combo } from "../../models/Combo";

const router = Router();

function slugify(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "combo";
}

function ensureItemIds(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, i) => ({
    ...item,
    id: item.id || slugify(item.name || `item-${i + 1}`),
    images: Array.isArray(item.images) ? item.images : [],
    individualPrice: Number(item.individualPrice) || 0,
  }));
}

// GET /api/admin/combos — list all (including isActive:false)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const combos = await Combo.find({}).sort({ createdAt: -1 }).lean();
    res.json({ data: combos });
  } catch (err) {
    console.error("GET /api/admin/combos failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch combos" },
    });
  }
});

// GET /api/admin/combos/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const combo = await Combo.findById(req.params.id).lean();
    if (!combo) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }
    res.json({ data: combo });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }
    console.error(`GET /api/admin/combos/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch combo" },
    });
  }
});

// POST /api/admin/combos — create
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    if (!body.name) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Name is required" },
      });
    }

    const slug = body.slug ? slugify(body.slug) : slugify(body.name);

    // Check slug uniqueness
    const existing = await Combo.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE",
          message: `A combo with slug "${slug}" already exists. Use a different name or set a custom slug.`,
        },
      });
    }

    // If marking featured, un-feature all others first
    if (body.isFeatured) {
      await Combo.updateMany({ isFeatured: true }, { $set: { isFeatured: false } });
    }

    const combo = await Combo.create({
      slug,
      name: String(body.name).trim(),
      tagline: body.tagline ?? "",
      totalPrice: Number(body.totalPrice) || 0,
      originalPrice: Number(body.originalPrice) || 0,
      badge: body.badge ?? "",
      stockLeft: Number(body.stockLeft) || 0,
      isFeatured: Boolean(body.isFeatured),
      isActive: body.isActive !== false, // default true
      items: ensureItemIds(body.items),
      heroImage: body.heroImage ?? "",
      categorySlugs: Array.isArray(body.categorySlugs) ? body.categorySlugs : [],
    });

    res.status(201).json({ data: combo });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
    }
    console.error("POST /api/admin/combos failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to create combo" },
    });
  }
});

// PATCH /api/admin/combos/:id — update
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const update: any = {};

    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.tagline !== undefined) update.tagline = body.tagline;
    if (body.totalPrice !== undefined) update.totalPrice = Number(body.totalPrice) || 0;
    if (body.originalPrice !== undefined) update.originalPrice = Number(body.originalPrice) || 0;
    if (body.badge !== undefined) update.badge = body.badge;
    if (body.stockLeft !== undefined) update.stockLeft = Number(body.stockLeft) || 0;
    if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
    if (body.heroImage !== undefined) update.heroImage = body.heroImage;
    if (Array.isArray(body.categorySlugs)) update.categorySlugs = body.categorySlugs;
    if (Array.isArray(body.items)) update.items = ensureItemIds(body.items);

    // Slug change requires uniqueness check
    if (body.slug !== undefined) {
      const newSlug = slugify(body.slug);
      const existing = await Combo.findOne({ slug: newSlug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({
          error: {
            code: "DUPLICATE",
            message: `A different combo already uses slug "${newSlug}".`,
          },
        });
      }
      update.slug = newSlug;
    }

    // If marking this one featured, un-feature others first
    if (body.isFeatured === true) {
      await Combo.updateMany(
        { _id: { $ne: req.params.id }, isFeatured: true },
        { $set: { isFeatured: false } },
      );
      update.isFeatured = true;
    } else if (body.isFeatured === false) {
      update.isFeatured = false;
    }

    const combo = await Combo.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!combo) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }

    res.json({ data: combo });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
    }
    console.error(`PATCH /api/admin/combos/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update combo" },
    });
  }
});

// DELETE /api/admin/combos/:id — soft delete (mark inactive)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const combo = await Combo.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, isFeatured: false } },
      { new: true },
    ).lean();

    if (!combo) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }

    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Combo not found" },
      });
    }
    console.error(`DELETE /api/admin/combos/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to delete combo" },
    });
  }
});

export default router;
