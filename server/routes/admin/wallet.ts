/** SC-WALLET  Owner-only wallet tools (/api/admin/wallet). Staff are refused: the permission list does not name this path. */
import { Router } from "express";
import { WalletError, adminAdjust, adminHistory, adminSummary } from "../../services/walletService";

const router = Router();
const fail = (res: any, e: any) => {
  if (e instanceof WalletError) return res.status(e.status).json({ error: { message: e.message } });
  console.error("[wallet admin]", e);
  return res.status(500).json({ error: { message: "Something went wrong." } });
};

router.get("/", async (req, res) => { try { res.json(await adminSummary(String(req.query.q ?? ""))); } catch (e) { fail(res, e); } });
router.get("/:customerId", async (req, res) => { try { res.json(await adminHistory(req.params.customerId)); } catch (e) { fail(res, e); } });
router.post("/adjust", async (req, res) => {
  try {
    const b = req.body ?? {};
    res.json(await adminAdjust({ email: String(b.email ?? ""), amount: Number(b.amount), kind: String(b.kind ?? ""), note: String(b.note ?? ""), reference: b.reference ? String(b.reference) : undefined }));
  } catch (e) { fail(res, e); }
});

export default router;
