/** SC-SUPPORT  Read-only purchase lookup for customer support (/api/admin/vtu-lookup). Sends only a short, safe list of fields: never cost, profit, provider details or pins. */
import { Router } from "express";
import { VtuOrder } from "../../models/VtuOrder";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim().slice(0, 60);
    if (q.length < 3) return res.json({ orders: [] });
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const digits = q.replace(/\D/g, "");
    const rx = new RegExp(esc, "i");
    const ors: any[] = ["reference", "email", "phoneNumber", "meter.number", "card.number", "providerReference", "paymentReference", "token"].map((k) => ({ [k]: rx }));
    if (digits.length >= 7) ors.push({ phoneNumber: new RegExp(digits.slice(-10) + "$") });
    const rows: any[] = await (VtuOrder as any).find({ $or: ors }).sort({ createdAt: -1 }).limit(30).lean();
    const orders = rows.map((o) => ({
      reference: o.reference,
      createdAt: o.createdAt,
      service: o.service,
      network: o.networkName || o.network,
      planName: o.planName || "",
      amount: o.amount,
      quantity: o.quantity || 1,
      email: o.email || "",
      phone: o.phoneNumber || "",
      meterNumber: o.meter?.number || "",
      cardNumber: o.card?.number || "",
      payMethod: o.payMethod || "paystack",
      paymentStatus: o.paymentStatus,
      fulfilmentStatus: o.fulfilmentStatus,
      refundStatus: o.refundStatus,
      token: o.token || "",
      units: o.units || "",
      pinsDelivered: Array.isArray(o.pins) ? o.pins.length : 0,
    }));
    res.json({ orders });
  } catch (e) {
    console.error("[vtu lookup]", e);
    res.status(500).json({ error: { message: "Something went wrong." } });
  }
});

export default router;
