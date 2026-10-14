/**
 * Admin: partner ads.  Destination: server/routes/admin/ads.ts
 * Mount behind requireAuth:  app.use("/api/admin/ads", requireAuth, adminAdsRouter);
 *
 *   GET    /          all ads (newest first)
 *   POST   /          create. Body: { title, product, url?, captions..., active }
 *                     The browser uploads the file to Cloudinary first and sends the https link.
 *   PUT    /:id       edit text fields / active / url
 *   DELETE /:id
 */
import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Ad } from "../../models/Ad";

const router = Router();
const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function kindFromUrl(url: string): "image" | "video" {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) || /\/video\/upload\//.test(url) ? "video" : "image";
}

const shape = (a: any) => ({
  id: String(a._id),
  title: a.title,
  product: a.product ?? "",
  kind: a.kind,
  url: a.url ?? "",
  whatsappCaption: a.whatsappCaption ?? "",
  instagramCaption: a.instagramCaption ?? "",
  tiktokCaption: a.tiktokCaption ?? "",
  active: !!a.active,
  createdAt: a.createdAt,
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 }).lean();
    res.json({ data: ads.map(shape) });
  } catch (err) {
    console.error("GET /api/admin/ads failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to load ads");
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const title = str(b.title, 120);
    if (title.length < 2) return fail(res, 400, "VALIDATION", "Please give the ad a title.");

    let url = str(b.url, 1000);
    let kind: "image" | "video" | "text" = "text";
    if (url) {
      if (!/^https:\/\//i.test(url)) return fail(res, 400, "VALIDATION", "The link must start with https://");
      kind = kindFromUrl(url);
    }

    const ad = await Ad.create({
      title,
      product: str(b.product, 120),
      kind,
      url,
      whatsappCaption: str(b.whatsappCaption, 2000),
      instagramCaption: str(b.instagramCaption, 2200),
      tiktokCaption: str(b.tiktokCaption, 2200),
      active: b.active !== false,
    });
    res.status(201).json({ data: shape(ad) });
  } catch (err) {
    console.error("POST /api/admin/ads failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to save ad");
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "NOT_FOUND", "Ad not found");
    const b = req.body ?? {};
    const set: Record<string, unknown> = {};
    if (b.title !== undefined) {
      const t = str(b.title, 120);
      if (t.length < 2) return fail(res, 400, "VALIDATION", "Please give the ad a title.");
      set.title = t;
    }
    if (b.product !== undefined) set.product = str(b.product, 120);
    if (b.whatsappCaption !== undefined) set.whatsappCaption = str(b.whatsappCaption, 2000);
    if (b.instagramCaption !== undefined) set.instagramCaption = str(b.instagramCaption, 2200);
    if (b.tiktokCaption !== undefined) set.tiktokCaption = str(b.tiktokCaption, 2200);
    if (typeof b.active === "boolean") set.active = b.active;
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $set: set }, { new: true }).lean();
    if (!ad) return fail(res, 404, "NOT_FOUND", "Ad not found");
    res.json({ data: shape(ad) });
  } catch (err) {
    console.error("PUT /api/admin/ads/:id failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to update ad");
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "NOT_FOUND", "Ad not found");
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ data: { ok: true } });
  } catch (err) {
    console.error("DELETE /api/admin/ads/:id failed:", err);
    fail(res, 500, "SERVER_ERROR", "Failed to delete ad");
  }
});

export default router;
