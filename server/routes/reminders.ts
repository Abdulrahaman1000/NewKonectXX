/**
 * SC-REM  Renewal reminders and the low-wallet alert (/api/reminders). Every route needs a signed-in customer.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { customerFromToken } from "../services/customerAuth";
import { ReminderError, createFromOrder, list, remove, setLowBalance, update } from "../services/reminderService";

const router = Router();
const buckets = new Map<string, { n: number; t: number }>();
const limit = (name: string, max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const k = `${name}:${req.ip}`; const now = Date.now(); const b = buckets.get(k);
  if (!b || now - b.t > windowMs) buckets.set(k, { n: 1, t: now });
  else if (++b.n > max) return res.status(429).json({ error: { message: "Too many tries. Please wait a little and try again." } });
  next();
};
const fail = (res: Response, e: any) => {
  if (e instanceof ReminderError) return res.status(e.status).json({ error: { message: e.message } });
  console.error("[reminders]", e);
  return res.status(500).json({ error: { message: "Something went wrong. Please try again." } });
};
const bearer = (req: Request) => (req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
const who = async (req: Request, res: Response) => {
  const c: any = await customerFromToken(bearer(req));
  if (!c) { res.status(401).json({ error: { message: "Please sign in to use reminders." } }); return null; }
  return c;
};

router.get("/", limit("rem-list", 300, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json(await list(c)); } catch (e) { fail(res, e); }
});
router.post("/", limit("rem-add", 60, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json({ reminder: await createFromOrder(c, String(req.body?.reference ?? ""), req.body?.everyDays) }); } catch (e) { fail(res, e); }
});
router.put("/low", limit("rem-low", 60, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json(await setLowBalance(c, req.body?.amount)); } catch (e) { fail(res, e); }
});
router.patch("/:id", limit("rem-edit", 120, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json({ reminder: await update(c, String(req.params.id), { everyDays: req.body?.everyDays, paused: req.body?.paused }) }); } catch (e) { fail(res, e); }
});
router.delete("/:id", limit("rem-del", 120, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json(await remove(c, String(req.params.id))); } catch (e) { fail(res, e); }
});

export default router;
