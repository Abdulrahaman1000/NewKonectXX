/**
 * Admin FAQs CRUD routes.
 *
 * GET    /api/admin/faqs            — list all (incl. unpublished)
 * POST   /api/admin/faqs            — create
 * PATCH  /api/admin/faqs/:id        — update
 * DELETE /api/admin/faqs/:id        — hard delete
 * POST   /api/admin/faqs/reorder    — bulk reorder { ids: string[] }
 */

import { Router, Request, Response } from "express";
import { FAQ } from "../../models/FAQ";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const faqs = await FAQ.find({}).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ data: faqs });
  } catch (err) {
    console.error("GET /api/admin/faqs failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch FAQs" } });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.question?.trim()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Question is required" } });
    }
    if (!body.answer?.trim()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Answer is required" } });
    }

    const last = await FAQ.findOne({}).sort({ order: -1 }).lean();
    const defaultOrder = last ? (last.order ?? 0) + 1 : 0;

    const faq = await FAQ.create({
      question: String(body.question).trim(),
      answer: String(body.answer).trim(),
      order: typeof body.order === "number" ? body.order : defaultOrder,
      isPublished: body.isPublished !== false,
    });

    res.status(201).json({ data: faq });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    }
    console.error("POST /api/admin/faqs failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to create FAQ" } });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const update: any = {};
    if (body.question !== undefined) update.question = String(body.question).trim();
    if (body.answer !== undefined) update.answer = String(body.answer).trim();
    if (body.order !== undefined) update.order = Number(body.order);
    if (body.isPublished !== undefined) update.isPublished = Boolean(body.isPublished);

    const faq = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!faq) return res.status(404).json({ error: { code: "NOT_FOUND", message: "FAQ not found" } });
    res.json({ data: faq });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "FAQ not found" } });
    if (err.name === "ValidationError") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
    console.error(`PATCH /api/admin/faqs/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to update FAQ" } });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id).lean();
    if (!faq) return res.status(404).json({ error: { code: "NOT_FOUND", message: "FAQ not found" } });
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) {
    if (err.name === "CastError") return res.status(404).json({ error: { code: "NOT_FOUND", message: "FAQ not found" } });
    console.error(`DELETE /api/admin/faqs/${req.params.id} failed:`, err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to delete FAQ" } });
  }
});

router.post("/reorder", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "ids must be an array" } });
    }
    await Promise.all(ids.map((id, index) => FAQ.findByIdAndUpdate(id, { $set: { order: index } })));
    const faqs = await FAQ.find({}).sort({ order: 1 }).lean();
    res.json({ data: faqs });
  } catch (err) {
    console.error("POST /api/admin/faqs/reorder failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to reorder" } });
  }
});

export default router;
