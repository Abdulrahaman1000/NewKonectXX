/**
 * Site settings — public read endpoint.
 * GET /api/settings — returns the singleton settings document
 *
 * If no settings doc exists yet, creates one with defaults.
 * Admin write endpoints will live in routes/admin/settings.ts later.
 */

import { Router, Request, Response } from "express";
import { SiteSettings } from "../models/SiteSettings";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    let settings = await SiteSettings.findOne().lean();

    // Auto-create on first request
    if (!settings) {
      const created = await SiteSettings.create({});
      settings = created.toObject();
    }

    // Computed field: the WhatsApp link from the number
    const whatsappDigits = (settings.contact?.whatsappNumber || "").replace(
      /\D/g,
      "",
    );
    const enriched = {
      ...settings,
      contact: {
        ...settings.contact,
        whatsappLink: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "",
      },
    };

    res.json({ data: enriched });
  } catch (err) {
    console.error("GET /api/settings failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch settings" },
    });
  }
});

export default router;
