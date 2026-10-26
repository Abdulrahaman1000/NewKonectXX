/**
 * Fulfilment queue: what to pack, what is on its way.
 *
 * GET  /api/admin/fulfilment              orders to pack + orders in transit
 * POST /api/admin/fulfilment/:id/packed   paid/COD order -> "processing" (packed, waiting for pickup/Jumia)
 * POST /api/admin/fulfilment/:id/ship     { trackingNumber?, trackingProviderUrl? } -> shipped (+ customer email if they have one)
 * POST /api/admin/fulfilment/:id/delivered -> delivered
 */
import { Router, Request, Response } from "express";
import { Order } from "../../models/Order";
import { markOrderShipped, markOrderDelivered, stepPart } from "../../services/orderService";

const router = Router();

type Route = "pickup" | "local" | "jumia";
function routeOf(o: any): Route {
  const street = String(o.shipping?.street ?? "");
  if (street.startsWith("Pickup")) return "pickup";
  return String(o.shipping?.city ?? "").trim().toLowerCase() === "ilorin" ? "local" : "jumia";
}

// COD orders sit in "pending" until delivery, but still have to be packed.
const TO_PACK_FILTER = {
  // pre-order orders wait on the To get page until you press Got it
  awaitingGoods: { $ne: true },
  // orders sent in parts are listed part by part (see GET below)
  partialChoice: { $ne: "now" },
  $or: [
    { status: { $in: ["paid", "processing"] } },
    { status: "pending", paymentMethod: "cod" },
  ],
};

function shape(o: any) {
  return {
    _id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod,
    source: o.source ?? "website",
    total: o.total,
    shippingFee: o.shippingFee,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    shippedAt: o.shippedAt,
    trackingNumber: o.trackingNumber ?? "",
    trackingProviderUrl: o.trackingProviderUrl ?? "",
    notes: o.notes ?? "",
    adminNotes: o.adminNotes ?? "",
    route: routeOf(o),
    shipping: o.shipping,
    items: (o.items ?? []).map((it: any) => ({
      name: it.name,
      variantSummary: it.variantSummary ?? "",
      quantity: it.quantity,
      isFreeGift: !!it.isFreeGift,
    })),
  };
}

/** One part of an order that is sent in parts. The row id is "<order id>~<part number>". */
function shapePart(o: any, s: any) {
  const base = shape(o);
  const idx = new Set<number>(s.itemIdx ?? []);
  return {
    ...base,
    _id: `${o._id}~${s.n}`,
    orderId: String(o._id),
    part: `Part ${s.n} of ${(o.shipments ?? []).length}`,
    status: s.status === "packed" ? "processing" : "paid",
    shippedAt: s.shippedAt,
    trackingNumber: s.trackingNumber ?? "",
    trackingProviderUrl: s.trackingProviderUrl ?? "",
    items: base.items.filter((_: any, i: number) => idx.has(i)),
  };
}

/** "abc123~2" -> { id: "abc123", n: 2 }. Plain order ids give null. */
function splitId(raw: unknown): { id: string; n: number } | null {
  const m = /^([^~]+)~(\d+)$/.exec(String(raw));
  return m ? { id: m[1], n: Number(m[2]) } : null;
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const [toPack, inTransit, inParts] = await Promise.all([
      Order.find(TO_PACK_FILTER).sort({ createdAt: 1 }).limit(200).lean(),
      Order.find({ status: "shipped" }).sort({ shippedAt: 1 }).limit(200).lean(),
      Order.find({
        partialChoice: "now",
        status: { $in: ["paid", "processing"] },
        "shipments.status": { $in: ["to_pack", "packed", "shipped"] },
      }).sort({ createdAt: 1 }).limit(200).lean(),
    ]);
    const partRows = (statuses: string[]) =>
      inParts.flatMap((o: any) => (o.shipments ?? []).filter((s: any) => statuses.includes(s.status)).map((s: any) => shapePart(o, s)));
    const packRows = [...toPack.map(shape), ...partRows(["to_pack", "packed"])].sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const transitRows = [...inTransit.map(shape), ...partRows(["shipped"])].sort(
      (a: any, b: any) => new Date(a.shippedAt || 0).getTime() - new Date(b.shippedAt || 0).getTime(),
    );
    res.json({ data: { toPack: packRows, inTransit: transitRows } });
  } catch (err) {
    console.error("GET /api/admin/fulfilment failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load the queue" } });
  }
});

function bad(res: Response, status: number, message: string) {
  return res.status(status).json({ error: { code: status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message } });
}

router.post("/:id/packed", async (req: Request, res: Response) => {
  try {
    const sp = splitId(req.params.id);
    if (sp) {
      const o: any = await Order.findById(sp.id).select("orderNumber").lean();
      if (!o) return bad(res, 404, "Order not found");
      const r = await stepPart(o.orderNumber, sp.n, "pack");
      if (r.error) return bad(res, 409, r.error);
      return res.json({ data: shape(r.order.toObject ? r.order.toObject() : r.order) });
    }
    const o = await Order.findOneAndUpdate(
      { _id: req.params.id, ...TO_PACK_FILTER, status: { $in: ["paid", "pending"] } },
      { status: "processing" },
      { new: true },
    ).lean();
    if (!o) return bad(res, 409, "This order cannot be marked as packed (already packed, unpaid, or closed).");
    res.json({ data: shape(o) });
  } catch (err: any) {
    if (err.name === "CastError") return bad(res, 404, "Order not found");
    console.error("fulfilment packed failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to update order" } });
  }
});

router.post("/:id/ship", async (req: Request, res: Response) => {
  try {
    const sp = splitId(req.params.id);
    if (sp) {
      const o: any = await Order.findById(sp.id).select("orderNumber").lean();
      if (!o) return bad(res, 404, "Order not found");
      const tn = typeof req.body?.trackingNumber === "string" ? req.body.trackingNumber.trim().slice(0, 80) : "";
      const tu = typeof req.body?.trackingProviderUrl === "string" ? req.body.trackingProviderUrl.trim().slice(0, 300) : "";
      if (tu && !/^https?:\/\//i.test(tu)) return bad(res, 400, "The tracking link must start with http:// or https://");
      const r = await stepPart(o.orderNumber, sp.n, "ship", { trackingNumber: tn || undefined, trackingProviderUrl: tu || undefined });
      if (r.error) return bad(res, 409, r.error);
      return res.json({ data: shape(r.order.toObject ? r.order.toObject() : r.order) });
    }
    const existing = await Order.findById(req.params.id).select("orderNumber status paymentMethod awaitingGoods").lean();
    if (!existing) return bad(res, 404, "Order not found");
    if ((existing as any).awaitingGoods) return bad(res, 409, "This order is waiting for goods. Press Got it on the To get page first.");
    const ok =
      existing.status === "paid" ||
      existing.status === "processing" ||
      (existing.status === "pending" && existing.paymentMethod === "cod");
    if (!ok) return bad(res, 409, `An order that is ${existing.status} cannot be shipped.`);
    const tn = typeof req.body?.trackingNumber === "string" ? req.body.trackingNumber.trim().slice(0, 80) : "";
    const tu = typeof req.body?.trackingProviderUrl === "string" ? req.body.trackingProviderUrl.trim().slice(0, 300) : "";
    if (tu && !/^https?:\/\//i.test(tu)) return bad(res, 400, "The tracking link must start with http:// or https://");
    const updated = await markOrderShipped(existing.orderNumber, tn || undefined, tu || undefined);
    if (!updated) return bad(res, 404, "Order not found");
    res.json({ data: shape(updated.toObject ? updated.toObject() : updated) });
  } catch (err: any) {
    if (err.name === "CastError") return bad(res, 404, "Order not found");
    console.error("fulfilment ship failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to mark as shipped" } });
  }
});

router.post("/:id/delivered", async (req: Request, res: Response) => {
  try {
    const sp = splitId(req.params.id);
    if (sp) {
      const o: any = await Order.findById(sp.id).select("orderNumber").lean();
      if (!o) return bad(res, 404, "Order not found");
      const r = await stepPart(o.orderNumber, sp.n, "deliver");
      if (r.error) return bad(res, 409, r.error);
      return res.json({ data: shape(r.order.toObject ? r.order.toObject() : r.order) });
    }
    const existing = await Order.findById(req.params.id).select("orderNumber status paymentMethod awaitingGoods").lean();
    if (!existing) return bad(res, 404, "Order not found");
    if ((existing as any).awaitingGoods) return bad(res, 409, "This order is waiting for goods. Press Got it on the To get page first.");
    const ok =
      ["shipped", "paid", "processing"].includes(existing.status) ||
      (existing.status === "pending" && existing.paymentMethod === "cod");
    if (!ok) return bad(res, 409, `An order that is ${existing.status} cannot be marked delivered.`);
    const updated = await markOrderDelivered(existing.orderNumber);
    if (!updated) return bad(res, 404, "Order not found");
    res.json({ data: shape(updated.toObject ? updated.toObject() : updated) });
  } catch (err: any) {
    if (err.name === "CastError") return bad(res, 404, "Order not found");
    console.error("fulfilment delivered failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to mark as delivered" } });
  }
});

export default router;
