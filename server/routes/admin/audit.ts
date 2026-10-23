/** SC-STAFF  Audit log viewer. Owner only. */
import { Router, Request, Response } from "express";
import { AuditLog } from "../../models/AuditLog";

const router = Router();
router.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const filter: any = {};
  if (typeof req.query.userId === "string" && req.query.userId) filter.userId = req.query.userId;
  const rows = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data: rows });
});
export default router;
