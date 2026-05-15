/**
 * Admin combos CRUD routes.
 * Handles `alternatives` and `colors` arrays on each item.
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
    .slice(0, 80) || "item";
}

function ensureAlternatives(alts: any[]): any[] {
  if (!Array.isArray(alts)) return [];
  return alts.map((alt, i) => ({
    id: alt.id || slugify(alt.name || `alt-${i + 1}`),
    name: String(alt.name || `Alternative ${i + 1}`).trim(),
    badge: alt.badge || "",
    images: Array.isArray(alt.images) ? alt.images : [],
    description: alt.description || "",
  }));
}

function ensureColors(colors: any[]): any[] {
  if (!Array.isArray(colors)) return [];
  return colors.map((c, i) => ({
    id: c.id || slugify(c.name || `color-${i + 1}`),
    name: String(c.name || `Color ${i + 1}`).trim(),
    hexCode: typeof c.hexCode === "string" ? c.hexCode.trim() : "",
    imageUrl: typeof c.imageUrl === "string" ? c.imageUrl.trim() : "",
  }));
}

function ensureItemIds(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, i) => ({
    ...item,
    id: item.id || slugify(item.name || `item-${i + 1}`),
    images: Array.isArray(item.images) ? item.images : [],
    individualPrice: Number(item.individualPrice) || 0,
    alternatives: ensureAlternatives(item.alternatives),
    colors: ensureColors(item.colors),
  }));
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const combos = await Combo.find({}).sort({ createdAt: -1 }).lean();
    res.json({ data: combos });
  } catch (err) {
    console.error("GET /api/admin/combos failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch combos" } });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const combo = await Combo.findById(req.params.id).lean();
    if (!combo) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Combo not found" } });
    }
    res.json({ data: combo });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Combo not found" } });
    }
    console.error(`GET /api/admin/combos/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch combo" } });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.name) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Name is required" } });
    }
    const slug = body.slug ? slugify(body.slug) : slugify(body.name);
    const existing = await Combo.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        error: { code: "DUPLICATE", message: `A combo with slug "${slug}" already exists.` },
      });
    }
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
      isActive: body.isActive !== false,
      items: ensureItemIds(body.items),
      heroImage: body.heroImage ?? "",
      categorySlugs: Array.isArray(body.categorySlugs) ? body.categorySlugs : [],
    });
    res.status(201).json({ data: combo });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    }
    console.error("POST /api/admin/combos failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to create combo" } });
  }
});

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

    if (body.slug !== undefined) {
      const newSlug = slugify(body.slug);
      const existing = await Combo.findOne({ slug: newSlug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({
          error: { code: "DUPLICATE", message: `A different combo already uses slug "${newSlug}".` },
        });
      }
      update.slug = newSlug;
    }

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
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Combo not found" } });
    }
    res.json({ data: combo });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Combo not found" } });
    if (err.name === "ValidationError") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    console.error(`PATCH /api/admin/combos/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to update combo" } });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const combo = await Combo.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, isFeatured: false } },
      { new: true },
    ).lean();
    if (!combo) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Combo not found" } });
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Combo not found" } });
    console.error(`DELETE /api/admin/combos/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to delete combo" } });
  }
});

export default router;
