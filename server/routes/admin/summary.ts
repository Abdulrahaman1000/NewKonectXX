/**
 * GET  /api/admin/summary?day=today|yesterday   the numbers
 * POST /api/admin/summary/send                  { day } email the summary to ADMIN_NOTIFY_EMAIL right now
 */
import { Router, Request, Response } from "express";
import { buildSummary, sendSummaryEmail, SUMMARY_HOUR } from "../../services/summaryService";

const router = Router();
const dayOf = (v: unknown) => (v === "today" ? "today" : "yesterday") as "today" | "yesterday";

router.get("/", async (req: Request, res: Response) => {
  try {
    res.json({ data: { ...(await buildSummary(dayOf(req.query.day))), sendHour: SUMMARY_HOUR } });
  } catch (e) {
    console.error("GET /api/admin/summary failed:", e);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to build the summary" } });
  }
});

router.post("/send", async (req: Request, res: Response) => {
  try {
    const r = await sendSummaryEmail(dayOf(req.body?.day));
    res.status(r.sent ? 200 : 400).json(r.sent ? { data: r } : { error: { code: "NOT_SENT", message: r.message } });
  } catch (e) {
    console.error("POST /api/admin/summary/send failed:", e);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to send the summary" } });
  }
});

export default router;
