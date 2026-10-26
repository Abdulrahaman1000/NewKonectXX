/**
 * Bulk price helpers for the browser. The server does the real maths when an order is placed;
 * these only make the price on screen match it.
 */
export interface BulkTier {
  minQty: number;
  unitPrice: number;
}

/** Ilorin delivery for a whole bulk order (normal Ilorin orders are 1,000). */
export const BULK_DELIVERY_FEE = 2000;

export function tiersOf(x: any): BulkTier[] {
  const raw: any[] = Array.isArray(x?.bulkTiers) ? x.bulkTiers : [];
  return raw
    .map((t) => ({ minQty: Math.floor(Number(t?.minQty)), unitPrice: Math.floor(Number(t?.unitPrice)) }))
    .filter((t) => Number.isFinite(t.minQty) && t.minQty >= 2 && Number.isFinite(t.unitPrice) && t.unitPrice > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

/** Price of one piece when buying `qty` pieces. */
export function priceForQty(basePrice: number, tiers: BulkTier[], qty: number): number {
  let price = basePrice;
  for (const t of tiers) {
    if (qty >= t.minQty) price = t.unitPrice;
  }
  return price;
}

/** Re-prices a cart line after its quantity changed. Lines without bulk prices keep their price. */
export function repriceLine(line: any, qty: number): number {
  const tiers = tiersOf(line);
  if (tiers.length === 0) return line.unitPrice;
  return priceForQty(Number(line.basePrice ?? line.unitPrice), tiers, qty);
}

/** True when this cart line reaches its first bulk price level. */
export function lineIsBulk(line: any): boolean {
  if (line?.isFreeGift) return false;
  const tiers = tiersOf(line);
  return tiers.length > 0 && Number(line.quantity) >= tiers[0].minQty;
}
