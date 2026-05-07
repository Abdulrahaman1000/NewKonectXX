/**
 * Admin categories CRUD.
 *
 * GET    /api/admin/categories       — list ALL (including inactive)
 * POST   /api/admin/categories       — create
 * PATCH  /api/admin/categories/:id   — update
 * DELETE /api/admin/categories/:id   — soft delete (isActive: false)
 *
 * All routes require admin JWT.
 */

import { Router, Request, Response } from "express";
import { Category } from "../../models/Category";
import { Combo } from "../../models/Combo";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({})
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    res.json({ data: categories });
  } catch (err) {
    console.error("GET /api/admin/categories failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch categories" },
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { slug, name, icon, description, displayOrder, isActive } = req.body;

    if (!slug || !name) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "slug and name are required" },
      });
    }

    // Check duplicate
    const existing = await Category.findOne({ slug: slug.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        error: { code: "DUPLICATE", message: "Category with this slug already exists" },
      });
    }

    const category = await Category.create({
      slug: slug.toLowerCase().trim(),
      name: name.trim(),
      icon: icon ?? "",
      description: description ?? "",
      displayOrder: displayOrder ?? 0,
      isActive: isActive ?? true,
    });

    res.status(201).json({ data: category });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
    }
    console.error("POST /api/admin/categories failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to create category" },
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const update: any = {};
    const fields = ["slug", "name", "icon", "description", "displayOrder", "isActive"];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    if (update.slug) {
      update.slug = update.slug.toLowerCase().trim();
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).lean();

    if (!category) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Category not found" },
      });
    }

    res.json({ data: category });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Category not found" },
      });
    }
    console.error(`PATCH /api/admin/categories/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update category" },
    });
  }
});

// Soft delete — mark inactive AND remove the slug from all combos
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Category not found" },
      });
    }

    category.isActive = false;
    await category.save();

    // Remove this slug from all combos that reference it
    await Combo.updateMany(
      { categorySlugs: category.slug },
      { $pull: { categorySlugs: category.slug } },
    );

    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Category not found" },
      });
    }
    console.error(`DELETE /api/admin/categories/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to delete category" },
    });
  }
});

export default router;
