/**
 * Bulk pricing rules (phase 1 of the Bulk orders plan).
 *
 * A product can have price levels: "from N pieces, each costs X".
 * The SERVER always works out the price. The browser only shows it.
 */
import { Combo } from "../models/Combo";

/** One flat delivery fee for a whole bulk order inside Ilorin (normal orders stay 1,000). */
export const BULK_DELIVERY_FEE = 2000;
/** Most pieces of one product in one order when the product has bulk prices. */
export const BULK_MAX_QTY = 1000;
/** Most pieces of one product in one order when it has no bulk prices. */
export const NORMAL_MAX_QTY = 20;

export interface BulkTier {
  minQty: number;
  unitPrice: number;
}

/** The product's price levels, cleaned and sorted from smallest quantity to largest. */
export function tiersOf(combo: any): BulkTier[] {
  const raw: any[] = Array.isArray(combo?.bulkTiers) ? combo.bulkTiers : [];
  return raw
    .map((t) => ({ minQty: Math.floor(Number(t?.minQty)), unitPrice: Math.floor(Number(t?.unitPrice)) }))
    .filter((t) => Number.isFinite(t.minQty) && t.minQty >= 2 && Number.isFinite(t.unitPrice) && t.unitPrice > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

/** Price of ONE piece when buying `qty` pieces. */
export function unitPriceFor(combo: any, qty: number): number {
  let price = Number(combo?.totalPrice) || 0;
  for (const t of tiersOf(combo)) {
    if (qty >= t.minQty) price = t.unitPrice;
  }
  return price;
}

/** True when this quantity is large enough to count as a bulk purchase (it reaches the first price level). */
export function isBulkQty(combo: any, qty: number): boolean {
  const tiers = tiersOf(combo);
  return tiers.length > 0 && qty >= tiers[0].minQty;
}

/** Most pieces allowed per order for this product. */
export function maxQtyFor(combo: any): number {
  return tiersOf(combo).length > 0 ? BULK_MAX_QTY : NORMAL_MAX_QTY;
}

/** Does any paid line in this cart reach a bulk price level? Looks the products up fresh. */
export async function orderHasBulk(items: Array<{ comboId: string; quantity: number; isFreeGift?: boolean }>): Promise<boolean> {
  for (const it of items) {
    if (it.isFreeGift || !it.comboId) continue;
    const combo: any = await Combo.findById(it.comboId).select("bulkTiers").lean().catch(() => null);
    if (combo && isBulkQty(combo, it.quantity)) return true;
  }
  return false;
}
