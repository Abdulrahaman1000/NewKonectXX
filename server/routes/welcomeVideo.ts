/** SC-TOUR  Public: the welcome tour video chosen in Admin > Site Settings. Returns { data: null } when it is off or empty. */
import { Router } from "express";
import { SiteSettings } from "../models/SiteSettings";

const router = Router();
router.get("/", async (_req, res) => {
  try {
    const s: any = await SiteSettings.findOne({}).lean();
    const w = s?.welcomeVideo;
    res.set("Cache-Control", "public, max-age=60");
    if (!w || !w.enabled || !String(w.url ?? "").trim()) return res.json({ data: null });
    res.json({ data: { url: w.url, poster: w.poster ?? "", title: w.title ?? "", caption: w.caption ?? "", version: Number(w.version) || 1 } });
  } catch (e) {
    console.error("[welcome video]", e);
    res.json({ data: null }); // never block the site because of this
  }
});
export default router;
