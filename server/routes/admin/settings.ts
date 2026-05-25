/**
 * Admin site settings routes.
 * NEW: handles hero { headline, subtext }.
 */

import { Router, Request, Response } from "express";
import { SiteSettings } from "../../models/SiteSettings";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    let settings = await SiteSettings.findOne({}).lean();
    if (!settings) {
      const created = await SiteSettings.create({});
      settings = created.toObject();
    }
    res.json({ data: settings });
  } catch (err) {
    console.error("GET /api/admin/settings failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch settings" },
    });
  }
});

router.patch("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const update: any = {};

    if (typeof body.storeName === "string") update.storeName = body.storeName.trim();
    if (typeof body.tagline === "string") update.tagline = body.tagline;
    if (typeof body.defaultHeroImage === "string") update.defaultHeroImage = body.defaultHeroImage;

    // Hero (nested)
    if (body.hero && typeof body.hero === "object") {
      if (typeof body.hero.headline === "string") update["hero.headline"] = body.hero.headline;
      if (typeof body.hero.subtext === "string") update["hero.subtext"] = body.hero.subtext;
    }

    if (body.promo && typeof body.promo === "object") {
      if (body.promo.endsAt !== undefined) {
        const date = new Date(body.promo.endsAt);
        if (!isNaN(date.getTime())) update["promo.endsAt"] = date;
      }
      if (body.promo.enabled !== undefined) update["promo.enabled"] = Boolean(body.promo.enabled);
      if (typeof body.promo.headline === "string") update["promo.headline"] = body.promo.headline;
      if (typeof body.promo.subline === "string") update["promo.subline"] = body.promo.subline;
    }

    if (body.contact && typeof body.contact === "object") {
      if (typeof body.contact.whatsappNumber === "string") update["contact.whatsappNumber"] = body.contact.whatsappNumber.trim();
      if (typeof body.contact.email === "string") update["contact.email"] = body.contact.email.trim();
      if (typeof body.contact.phone === "string") update["contact.phone"] = body.contact.phone.trim();
      if (typeof body.contact.address === "string") update["contact.address"] = body.contact.address;
    }

    if (body.video && typeof body.video === "object") {
      if (typeof body.video.url === "string") update["video.url"] = body.video.url.trim();
      if (typeof body.video.thumbnail === "string") update["video.thumbnail"] = body.video.thumbnail;
      if (typeof body.video.title === "string") update["video.title"] = body.video.title;
      if (typeof body.video.duration === "string") update["video.duration"] = body.video.duration;
    }

    if (body.trustStats && typeof body.trustStats === "object") {
      if (body.trustStats.rating !== undefined) {
        const r = Math.max(0, Math.min(5, Number(body.trustStats.rating) || 0));
        update["trustStats.rating"] = r;
      }
      if (body.trustStats.reviewCount !== undefined) {
        update["trustStats.reviewCount"] = Math.max(0, Math.floor(Number(body.trustStats.reviewCount) || 0));
      }
    }

    if (body.bankAccount && typeof body.bankAccount === "object") {
      if (typeof body.bankAccount.bankName === "string") update["bankAccount.bankName"] = body.bankAccount.bankName.trim();
      if (typeof body.bankAccount.accountName === "string") update["bankAccount.accountName"] = body.bankAccount.accountName.trim();
      if (typeof body.bankAccount.accountNumber === "string") update["bankAccount.accountNumber"] = body.bankAccount.accountNumber.trim();
    }

    if (body.shipping && typeof body.shipping === "object") {
      if (body.shipping.standardFee !== undefined) {
        update["shipping.standardFee"] = Math.max(0, Number(body.shipping.standardFee) || 0);
      }
      if (Array.isArray(body.shipping.codCities)) {
        update["shipping.codCities"] = body.shipping.codCities
          .map((c: any) => String(c).trim().toLowerCase())
          .filter(Boolean);
      }
      if (body.shipping.freeShippingThreshold !== undefined) {
        update["shipping.freeShippingThreshold"] = Math.max(0, Number(body.shipping.freeShippingThreshold) || 0);
      }
    }

    const settings = await SiteSettings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    res.json({ data: settings });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
    }
    console.error("PATCH /api/admin/settings failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to update settings" },
    });
  }
});

export default router;
