/**
 * SC-WALLET  Customer wallet routes (/api/wallet). Every route needs a signed-in customer.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { customerFromToken } from "../services/customerAuth";
import { WalletError, confirmFunding, getWallet, startFunding } from "../services/walletService";

const router = Router();
const buckets = new Map<string, { n: number; t: number }>();
const limit = (name: string, max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const k = `${name}:${req.ip}`; const now = Date.now(); const b = buckets.get(k);
  if (!b || now - b.t > windowMs) buckets.set(k, { n: 1, t: now });
  else if (++b.n > max) return res.status(429).json({ error: { message: "Too many tries. Please wait a little and try again." } });
  next();
};
const fail = (res: Response, e: any) => {
  if (e instanceof WalletError) return res.status(e.status).json({ error: { message: e.message } });
  console.error("[wallet]", e);
  return res.status(500).json({ error: { message: "Something went wrong. Please try again." } });
};
const bearer = (req: Request) => (req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
const who = async (req: Request, res: Response) => {
  const c: any = await customerFromToken(bearer(req));
  if (!c) { res.status(401).json({ error: { message: "Please sign in to use your wallet." } }); return null; }
  return c;
};

router.get("/", limit("wallet", 300, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json(await getWallet(String(c._id))); } catch (e) { fail(res, e); }
});
router.post("/fund", limit("fund", 20, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json(await startFunding(c, req.body?.amount)); } catch (e) { fail(res, e); }
});
router.get("/fund/:reference", limit("fundstatus", 300, 3_600_000), async (req, res) => {
  try { const c = await who(req, res); if (!c) return; res.json(await confirmFunding(String(req.params.reference), String(c._id))); } catch (e) { fail(res, e); }
});

export default router;
