/**
 * Pre-order helpers for the browser. A product is a pre-order item while its switch is on AND it has no stock.
 * The server decides for real when an order is placed.
 */
export interface PreorderInfo {
  active: boolean;
  min: number;
  max: number;
}

export function preorderInfo(x: any): PreorderInfo {
  const active = Boolean(x?.preorder) && (Number(x?.stockLeft) || 0) === 0;
  return {
    active,
    min: Math.max(1, Math.floor(Number(x?.leadDaysMin)) || 5),
    max: Math.max(1, Math.floor(Number(x?.leadDaysMax)) || 10),
  };
}

/** Flags saved on a cart line when it is added. */
export function preorderFlags(combo: any): { preorder: boolean; leadDaysMin: number; leadDaysMax: number } {
  const p = preorderInfo(combo);
  return { preorder: p.active, leadDaysMin: p.min, leadDaysMax: p.max };
}

export function lineIsPreorder(line: any): boolean {
  return !line?.isFreeGift && Boolean(line?.preorder);
}

/** "5 to 10" across all pre-order lines of a cart. */
export function cartPreorderWindow(lines: any[]): { min: number; max: number } {
  const pre = lines.filter(lineIsPreorder);
  if (pre.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...pre.map((l) => Number(l.leadDaysMin) || 5)),
    max: Math.max(...pre.map((l) => Number(l.leadDaysMax) || 10)),
  };
}
