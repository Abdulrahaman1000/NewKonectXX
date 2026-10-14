/**
 * Partner portal routes. Destination: server/routes/partner.ts
 * Mount in server/index.ts:  app.use("/api/partner", partnerRouter);
 *
 *   POST /click      (public)  records a visit that came through ?ref=SC####
 *   POST /login      (public)  approved partners only
 *   GET  /dashboard  (partner token) numbers, link, recent orders, payout history
 */
import { Router } from "express";
import { Reseller } from "../models/Reseller";
import { Commission, getProgramSettings } from "../models/Commission";
import { ReferralClick } from "../models/ReferralClick";
import { Order } from "../models/Order";
import { Ad } from "../models/Ad";
import { Withdrawal } from "../models/Withdrawal";
import { commissionStatus, resolveCommissionStatuses } from "../services/referralService";
import { requirePartner, signPartnerToken, verifyPassword } from "../services/partnerAuth";

const router = Router();
const CODE_RE = /^SC\d{4,8}$/;
const DAY = 24 * 60 * 60 * 1000;

/** Payout day: Friday. Change here if you pay on another weekday (0 = Sunday). */
const PAYOUT_WEEKDAY = 5;
function nextPayoutDate(from = new Date()): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const add = (PAYOUT_WEEKDAY - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d;
}

// ---- click tracking: the code must belong to an approved partner, so junk is ignored
router.post("/click", async (req, res) => {
  try {
    const code = String(req.body?.ref ?? "").trim().toUpperCase();
    if (CODE_RE.test(code) && (await Reseller.exists({ resellerCode: code, status: "approved" }))) {
      await ReferralClick.create({ resellerCode: code });
    }
  } catch {
    /* tracking must never break the shop */
  }
  res.json({ ok: true });
});

// ---- login (small in-memory limiter: 8 tries per 15 minutes per IP + email)
const tries = new Map<string, { n: number; reset: number }>();
router.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const key = `${req.ip}|${email}`;
  const t = tries.get(key);
  if (t && Date.now() < t.reset && t.n >= 8) {
    return res.status(429).json({ error: "Too many attempts. Please try again in a few minutes." });
  }
  const bad = () => {
    const cur = t && Date.now() < t.reset ? t : { n: 0, reset: Date.now() + 15 * 60 * 1000 };
    cur.n += 1;
    tries.set(key, cur);
    return res.status(401).json({ error: "Email or password is not correct." });
  };
  try {
    if (!email || !password) return bad();
    const partner = await Reseller.findOne({ email }).select("+passwordHash status");
    if (!partner || !(await verifyPassword(password, partner.passwordHash))) return bad();
    if (partner.status === "pending") {
      return res.status(403).json({ error: "Your application is still waiting for approval. We will contact you once it is approved." });
    }
    if (partner.status !== "approved") {
      return res.status(403).json({ error: "Your partner account is not active. Please contact support." });
    }
    tries.delete(key);
    res.json({ data: { token: signPartnerToken(String(partner._id)) } });
  } catch (err) {
    console.error("[partner] login failed:", err);
    res.status(500).json({ error: "Could not log in. Please try again." });
  }
});

// ---- dashboard
router.get("/dashboard", requirePartner, async (req, res) => {
  try {
    const partner: any = (req as any).partner;
    const code: string = partner.resellerCode;
    const [settings, commissions, clicksTotal, clicks30, withdrawals] = await Promise.all([
      getProgramSettings(),
      Commission.find({ resellerId: partner._id }).sort({ createdAt: -1 }).lean(),
      ReferralClick.countDocuments({ resellerCode: code }),
      ReferralClick.countDocuments({ resellerCode: code, at: { $gte: new Date(Date.now() - 30 * DAY) } }),
      Withdrawal.find({ resellerId: partner._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    const orders = await Order.find({ _id: { $in: commissions.map((c: any) => c.orderId) } })
      .select("status deliveredAt")
      .lean();
    const orderById = new Map(orders.map((o: any) => [String(o._id), o]));

    const { statusById, cycleByReseller } = await resolveCommissionStatuses([partner._id]);
    const cycle = cycleByReseller.get(String(partner._id)) ?? null;

    const totals = { pending: 0, approved: 0, paid: 0, cancelled: 0 };
    let requested = 0; // approved money already inside an open withdrawal request
    const rows: any[] = [];

    for (const c of commissions as any[]) {
      const order: any = orderById.get(String(c.orderId)) ?? {};
      const status = statusById.get(String(c._id)) ?? "pending";
      totals[status] += c.amount;
      if (status === "approved" && c.withdrawalId) requested += c.amount;
      rows.push({
        orderNumber: c.orderNumber,
        date: c.createdAt,
        amount: c.amount,
        base: c.base,
        status,
        // delivered orders in an open week are released together on the cycle's release date
        availableOn: status === "pending" && order.status === "delivered" && cycle ? cycle.releaseAt : null,
      });
    }

    const withdrawable = totals.approved - requested;
    const origin = String(process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");

    res.json({
      data: {
        partner: { fullName: partner.fullName, code, bankName: partner.bankName, accountNumber: partner.accountNumber },
        linkPath: `/?ref=${code}`,
        siteUrl: origin || null,
        stats: {
          clicks: clicksTotal,
          clicks30,
          orders: commissions.length,
          conversion: clicksTotal > 0 ? Math.round((commissions.length / clicksTotal) * 1000) / 10 : 0,
        },
        totals,
        requested,
        cycle,
        withdrawable,
        minWithdrawal: settings.minWithdrawal,
        nextPayout: nextPayoutDate(),
        recent: rows.slice(0, 30),
        withdrawals: (withdrawals as any[]).map((w) => ({
          id: String(w._id),
          date: w.createdAt,
          amount: w.status === "paid" ? w.paidAmount ?? w.amount : w.amount,
          orders: w.orderCount,
          status: w.status,
          paidAt: w.paidAt ?? null,
          note: w.status === "rejected" ? w.adminNote : "",
        })),
      },
    });
  } catch (err) {
    console.error("[partner] dashboard failed:", err);
    res.status(500).json({ error: "Could not load your dashboard." });
  }
});

// ---- request a withdrawal: locks every approved, not-yet-requested commission into one request
router.post("/withdraw", requirePartner, async (req, res) => {
  try {
    const partner: any = (req as any).partner;
    const settings = await getProgramSettings();

    if (!/^\d{10}$/.test(String(partner.accountNumber ?? "")) || !partner.bankName || !partner.accountName) {
      return res.status(400).json({ error: "Your bank details are incomplete. Please contact support to update them." });
    }
    if (await Withdrawal.exists({ resellerId: partner._id, status: "requested" })) {
      return res.status(409).json({ error: "You already have a withdrawal waiting to be paid." });
    }

    const { statusById } = await resolveCommissionStatuses([partner._id]);
    const open = await Commission.find({ resellerId: partner._id, paidAt: null, withdrawalId: null }).lean();
    const eligible = (open as any[]).filter((c) => statusById.get(String(c._id)) === "approved");
    const amount = eligible.reduce((n, c) => n + c.amount, 0);

    if (amount < settings.minWithdrawal) {
      return res.status(400).json({ error: `The minimum withdrawal is ₦${settings.minWithdrawal.toLocaleString("en-NG")}.` });
    }

    const w: any = await Withdrawal.create({
      resellerId: partner._id,
      resellerCode: partner.resellerCode,
      partnerName: partner.fullName,
      amount,
      orderCount: eligible.length,
      bankName: partner.bankName,
      accountNumber: partner.accountNumber,
      accountName: partner.accountName,
    });

    // Atomic lock: only rows nobody else has claimed. If we did not get them all, undo.
    const ids = eligible.map((c) => c._id);
    const r = await Commission.updateMany({ _id: { $in: ids }, withdrawalId: null }, { $set: { withdrawalId: w._id } });
    if (r.modifiedCount !== ids.length) {
      await Commission.updateMany({ withdrawalId: w._id }, { $set: { withdrawalId: null } });
      await Withdrawal.findByIdAndDelete(w._id);
      return res.status(409).json({ error: "Your balance just changed. Please try again." });
    }

    res.status(201).json({ data: { id: String(w._id), amount } });
  } catch (err) {
    console.error("[partner] withdraw failed:", err);
    res.status(500).json({ error: "Could not submit your withdrawal. Please try again." });
  }
});

// ---- ads: only approved partners (requirePartner). {{LINK}} is filled in by the page.
router.get("/ads", requirePartner, async (_req, res) => {
  try {
    const ads = await Ad.find({ active: true }).sort({ createdAt: -1 }).lean();
    res.json({
      data: ads.map((a: any) => ({
        id: String(a._id),
        title: a.title,
        product: a.product ?? "",
        kind: a.kind,
        url: a.url ?? "",
        whatsappCaption: a.whatsappCaption ?? "",
        instagramCaption: a.instagramCaption ?? "",
        tiktokCaption: a.tiktokCaption ?? "",
      })),
    });
  } catch (err) {
    console.error("[partner] ads failed:", err);
    res.status(500).json({ error: "Could not load ads." });
  }
});

export default router;
