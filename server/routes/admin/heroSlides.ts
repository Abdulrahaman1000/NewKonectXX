/**
 * Admin hero slides CRUD routes.
 * Uses the existing schema field names (desktopImage, tag, accent, displayOrder)
 * to stay compatible with existing data and the HeroCarousel component.
 */

import { Router, Request, Response } from "express";
import { HeroSlide } from "../../models/HeroSlide";

const router = Router();

// GET /api/admin/hero-slides
router.get("/", async (_req: Request, res: Response) => {
  try {
    const slides = await HeroSlide.find({}).sort({ displayOrder: 1, createdAt: -1 }).lean();
    res.json({ data: slides });
  } catch (err) {
    console.error("GET /api/admin/hero-slides failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch hero slides" },
    });
  }
});

// POST /api/admin/hero-slides
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    if (!body.tag && !body.headline && !body.title) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Tag or headline is required" },
      });
    }
    if (!body.desktopImage && !body.imageUrl) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Image is required" },
      });
    }

    // Default order: end of list
    const lastSlide = await HeroSlide.findOne({}).sort({ displayOrder: -1 }).lean();
    const defaultOrder = lastSlide ? (lastSlide.displayOrder ?? 0) + 1 : 0;

    const slide = await HeroSlide.create({
      desktopImage: body.desktopImage ?? body.imageUrl,
      mobileImage: body.mobileImage,
      tag: body.tag ?? body.title ?? "",
      headline: body.headline ?? "",
      subtitle: body.subtitle ?? body.description ?? "",
      buttonText: body.buttonText ?? body.ctaText ?? "",
      buttonLink: body.buttonLink ?? body.ctaLink ?? "",
      accent: body.accent ?? body.accentGradient ?? "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
      displayOrder: typeof body.displayOrder === "number"
        ? body.displayOrder
        : typeof body.order === "number"
        ? body.order
        : defaultOrder,
      isActive: body.isActive !== false,
    });

    res.status(201).json({ data: slide });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
    }
    console.error("POST /api/admin/hero-slides failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to create slide" },
    });
  }
});

// PATCH /api/admin/hero-slides/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const update: any = {};

    if (body.desktopImage !== undefined) update.desktopImage = body.desktopImage;
    if (body.imageUrl !== undefined) update.desktopImage = body.imageUrl;
    if (body.mobileImage !== undefined) update.mobileImage = body.mobileImage;
    if (body.tag !== undefined) update.tag = body.tag;
    if (body.title !== undefined) update.tag = body.title;
    if (body.headline !== undefined) update.headline = body.headline;
    if (body.subtitle !== undefined) update.subtitle = body.subtitle;
    if (body.description !== undefined) update.subtitle = body.description;
    if (body.buttonText !== undefined) update.buttonText = body.buttonText;
    if (body.ctaText !== undefined) update.buttonText = body.ctaText;
    if (body.buttonLink !== undefined) update.buttonLink = body.buttonLink;
    if (body.ctaLink !== undefined) update.buttonLink = body.ctaLink;
    if (body.accent !== undefined) update.accent = body.accent;
    if (body.accentGradient !== undefined) update.accent = body.accentGradient;
    if (body.displayOrder !== undefined) update.displayOrder = Number(body.displayOrder);
    if (body.order !== undefined) update.displayOrder = Number(body.order);
    if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

    const slide = await HeroSlide.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!slide) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Slide not found" },
      });
    }

    res.json({ data: slide });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Slide not found" },
      });
    }
    console.error(`PATCH /api/admin/hero-slides/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update slide" },
    });
  }
});

// DELETE /api/admin/hero-slides/:id — hard delete
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id).lean();
    if (!slide) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Slide not found" },
      });
    }
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Slide not found" },
      });
    }
    console.error(`DELETE /api/admin/hero-slides/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to delete slide" },
    });
  }
});

/**
 * POST /api/admin/hero-slides/reorder
 * Body: { ids: string[] }
 */
router.post("/reorder", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "ids must be an array" },
      });
    }

    await Promise.all(
      ids.map((id, index) =>
        HeroSlide.findByIdAndUpdate(id, { $set: { displayOrder: index } }),
      ),
    );

    const slides = await HeroSlide.find({}).sort({ displayOrder: 1 }).lean();
    res.json({ data: slides });
  } catch (err) {
    console.error("POST /api/admin/hero-slides/reorder failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to reorder" },
    });
  }
});

export default router;
