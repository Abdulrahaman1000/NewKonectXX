/**
 * Cost + profit logic.
 *  - unitCostFor():    what one unit of an ordered item cost you
 *  - recordOrderCost(): saves that snapshot when an order is created
 *  - buildReport():    pure maths for the Profit page (easy to test)
 */
import { Combo } from "../models/Combo";
import { Gift } from "../models/Gift";
import { OrderCost, OrderCostLine } from "../models/OrderCost";

export const COST_SELECT = "+costPrice +items.costPrice +items.alternatives.costPrice";

/**
 * Cost of ONE unit of a product or combo.
 *  1. If a cost price was typed on the product itself, that is used.
 *  2. Otherwise the costs of its items are added up (a chosen variant with its own cost overrides the slot's cost).
 */
export function comboUnitCost(combo: any, selectedVariants?: Record<string, string>): number {
  const own = Number(combo?.costPrice) || 0;
  if (own > 0) return own;
  let total = 0;
  for (const item of combo?.items ?? []) {
    let cost = Number(item.costPrice) || 0;
    const altId = selectedVariants?.[item.id];
    if (altId) {
      const alt = (item.alternatives ?? []).find((a: any) => a.id === altId);
      if (alt && Number(alt.costPrice) > 0) cost = Number(alt.costPrice);
    }
    total += cost;
  }
  return total;
}

async function lineFor(item: any): Promise<OrderCostLine> {
  const base = {
    comboId: item.comboId,
    name: String(item.name),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    isFreeGift: Boolean(item.isFreeGift),
  };

  // Gift Bank gift: its cost is read from the gift record if one has been entered
  if (item.isFreeGift && String(item.slug ?? "").startsWith("gift-")) {
    const gift: any = await Gift.findById(item.comboId).lean().catch(() => null);
    return { ...base, unitCost: Number(gift?.costPrice) || 0, known: true };
  }

  const combo: any = await Combo.findById(item.comboId).select(COST_SELECT).lean().catch(() => null);
  const unitCost = combo ? comboUnitCost(combo, item.selectedVariants) : 0;
  return { ...base, unitCost, known: unitCost > 0 };
}

/** Saves the cost snapshot for a new order. Never throws: an order must not fail because of bookkeeping. */
export async function recordOrderCost(order: any): Promise<void> {
  try {
    const lines: OrderCostLine[] = [];
    for (const item of order.items ?? []) lines.push(await lineFor(item));
    const totalCost = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
    const complete = lines.length > 0 && lines.every((l) => l.known);
    await OrderCost.updateOne(
      { orderId: order._id },
      { $set: { orderNumber: order.orderNumber, lines, totalCost, complete } },
      { upsert: true },
    );
  } catch (err) {
    console.error(`[cost] could not record cost for ${order?.orderNumber}:`, err);
  }
}

// ---------------------------------------------------------------- report

export interface ReportOrder {
  _id: any;
  subtotal: number;
  shippingFee: number;
}
export interface ReportCost {
  orderId: any;
  lines: OrderCostLine[];
  totalCost: number;
  complete: boolean;
}

export function buildReport(
  orders: ReportOrder[],
  costs: ReportCost[],
  expenses: Array<{ amount: number; category: string }>,
) {
  const byId = new Map<string, ReportCost>(costs.map((c) => [String(c.orderId), c]));

  let sales = 0;
  let delivery = 0;
  let cogs = 0;
  let costed = 0;
  let uncosted = 0;
  const products = new Map<string, { name: string; units: number; revenue: number; cost: number }>();

  for (const o of orders) {
    const c = byId.get(String(o._id));
    if (!c || !c.complete) {
      uncosted++;
      continue;
    }
    costed++;
    sales += o.subtotal;
    delivery += o.shippingFee;
    cogs += c.totalCost;
    for (const l of c.lines) {
      const key = `${String(l.comboId)}:${l.isFreeGift ? "gift" : "sale"}`;
      const p = products.get(key) ?? { name: l.name, units: 0, revenue: 0, cost: 0 };
      p.units += l.quantity;
      p.revenue += l.unitPrice * l.quantity;
      p.cost += l.unitCost * l.quantity;
      products.set(key, p);
    }
  }

  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses) expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;

  const grossProfit = sales - cogs;
  const netProfit = grossProfit + delivery - expensesTotal;

  return {
    orders: { total: orders.length, costed, uncosted },
    sales,
    deliveryFees: delivery,
    costOfGoods: cogs,
    grossProfit,
    marginPercent: sales > 0 ? Math.round((grossProfit / sales) * 1000) / 10 : 0,
    expensesTotal,
    expensesByCategory,
    netProfit,
    products: [...products.values()]
      .map((p) => ({ ...p, profit: p.revenue - p.cost }))
      .sort((a, b) => b.profit - a.profit),
  };
}
