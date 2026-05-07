/**
 * Categories — public routes.
 *
 * GET /api/categories          — list active categories sorted by displayOrder
 * GET /api/categories/:slug    — get one category by slug
 */

import { Router, Request, Response } from "express";
import { Category } from "../models/Category";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    res.json({ data: categories });
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch categories" },
    });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug.toLowerCase().trim(),
      isActive: true,
    }).lean();
    if (!category) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Category not found" },
      });
    }
    res.json({ data: category });
  } catch (err) {
    console.error(`GET /api/categories/${req.params.slug} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch category" },
    });
  }
});

export default router;
