/**
 * Split orders (phase 3): pieces that are in stock now, and pieces we still have to get.
 *
 * Plain functions only (no database), so the rules are easy to test.
 *
 * An order is "mixed" when it has pre-order pieces AND pieces that are ready.
 * A mixed order paid in Ilorin can be sent in parts ("Send what is ready now").
 * Everything else is sent together as one parcel.
 */

export type ShipmentStatus = "waiting" | "to_pack" | "packed" | "shipped" | "delivered";

export interface Shipment {
  n: number;
  itemIdx: number[];
  status: ShipmentStatus;
  trackingNumber?: string;
  trackingProviderUrl?: string;
  readyAt?: Date;
  packedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface Plan {
  ready: number;
  waiting: number;
}

/**
 * How many pieces come from stock and how many we must get.
 * Returns null when the product is short and is not a pre-order product.
 */
export function planQty(stock: number, qty: number, preorderOn: boolean): Plan | null {
  const s = Math.max(0, Math.floor(Number(stock) || 0));
  if (qty <= s) return { ready: qty, waiting: 0 };
  if (!preorderOn) return null;
  return { ready: s, waiting: qty - s };
}

/** Pre-order pieces AND at least one paid piece that is ready (free gifts do not count). */
export function isMixed(items: Array<{ preorder?: boolean; isFreeGift?: boolean }>): boolean {
  return items.some((i) => i.preorder) && items.some((i) => !i.preorder && !i.isFreeGift);
}

/** Part 1 = everything that is ready (gift included). Part 2 = the pre-order pieces. Empty when the order is not mixed. */
export function buildShipments(items: Array<{ preorder?: boolean; isFreeGift?: boolean }>): Shipment[] {
  if (!isMixed(items)) return [];
  const ready: number[] = [];
  const later: number[] = [];
  items.forEach((it, i) => (it.preorder ? later : ready).push(i));
  return [
    { n: 1, itemIdx: ready, status: "to_pack" },
    { n: 2, itemIdx: later, status: "waiting" },
  ];
}

export type Step = "pack" | "ship" | "deliver";

export interface StepResult {
  shipments: Shipment[];
  error?: string;
  /** every part has been delivered */
  allDelivered: boolean;
}

const plain = (list: Shipment[]): Shipment[] => list.map((s) => ({ ...s, itemIdx: [...s.itemIdx] }));

/** Moves one part forward. Never changes the list it is given. */
export function stepShipments(
  list: Shipment[],
  n: number,
  step: Step,
  opts: { trackingNumber?: string; trackingProviderUrl?: string; now?: Date } = {},
): StepResult {
  const now = opts.now ?? new Date();
  const next = plain(list);
  const s = next.find((x) => x.n === n);
  const fail = (error: string): StepResult => ({ shipments: list, error, allDelivered: false });
  if (!s) return fail("That part of the order was not found.");

  if (step === "pack") {
    if (s.status !== "to_pack") return fail(partWhy(s, "marked as packed"));
    s.status = "packed";
    s.packedAt = now;
  } else if (step === "ship") {
    if (s.status !== "to_pack" && s.status !== "packed") return fail(partWhy(s, "shipped"));
    s.status = "shipped";
    s.shippedAt = now;
    if (opts.trackingNumber) s.trackingNumber = opts.trackingNumber;
    if (opts.trackingProviderUrl) s.trackingProviderUrl = opts.trackingProviderUrl;
  } else {
    if (s.status !== "to_pack" && s.status !== "packed" && s.status !== "shipped") return fail(partWhy(s, "marked as delivered"));
    s.status = "delivered";
    s.deliveredAt = now;
  }
  return { shipments: next, allDelivered: next.every((x) => x.status === "delivered") };
}

function partWhy(s: Shipment, what: string): string {
  if (s.status === "waiting") return `Part ${s.n} is still waiting for goods. Press Got it on the To get page first.`;
  return `Part ${s.n} is ${s.status} and cannot be ${what}.`;
}

/** The goods arrived: parts that were waiting can now be packed. */
export function openGotIt(list: Shipment[], now: Date = new Date()): Shipment[] {
  return plain(list).map((s) => (s.status === "waiting" ? { ...s, status: "to_pack" as const, readyAt: now } : s));
}

/** Has any part already left (shipped or delivered)? Used so a refund does not put shipped goods back on the shelf. */
export function anyPartSent(list?: Shipment[]): boolean {
  return (list ?? []).some((s) => s.status === "shipped" || s.status === "delivered");
}
