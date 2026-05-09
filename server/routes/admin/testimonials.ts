/**
 * Admin testimonials CRUD routes.
 *
 * GET    /api/admin/testimonials       — list all (incl. unpublished)
 * POST   /api/admin/testimonials       — create
 * PATCH  /api/admin/testimonials/:id   — update
 * DELETE /api/admin/testimonials/:id   — hard delete
 */

import { Router, Request, Response } from "express";
import { Testimonial } from "../../models/Testimonial";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await Testimonial.find({}).sort({ createdAt: -1 }).lean();
    res.json({ data: items });
  } catch (err) {
    console.error("GET /api/admin/testimonials failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch testimonials" } });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.name?.trim()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Name is required" } });
    }
    if (!body.location?.trim()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Location is required" } });
    }
    if (!body.text?.trim()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Review text is required" } });
    }

    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));

    const item = await Testimonial.create({
      name: String(body.name).trim(),
      location: String(body.location).trim(),
      rating,
      text: String(body.text).trim(),
      isVerified: Boolean(body.isVerified),
      isPublished: body.isPublished !== false,
    });

    res.status(201).json({ data: item });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    }
    console.error("POST /api/admin/testimonials failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to create testimonial" } });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.location !== undefined) update.location = String(body.location).trim();
    if (body.text !== undefined) update.text = String(body.text).trim();
    if (body.rating !== undefined) update.rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    if (body.isVerified !== undefined) update.isVerified = Boolean(body.isVerified);
    if (body.isPublished !== undefined) update.isPublished = Boolean(body.isPublished);

    const item = await Testimonial.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!item) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimonial not found" } });
    res.json({ data: item });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimonial not found" } });
    if (err.name === "ValidationError") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    console.error(`PATCH /api/admin/testimonials/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to update testimonial" } });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const item = await Testimonial.findByIdAndDelete(req.params.id).lean();
    if (!item) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimonial not found" } });
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimonial not found" } });
    console.error(`DELETE /api/admin/testimonials/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to delete testimonial" } });
  }
});

export default router;
