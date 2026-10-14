/**
 * Free-gift progress for a phone number.
 * GET /api/orders/gift-progress?phone=...  →  { data: { spent, threshold, remaining, windowDays } }
 * Returns only totals, never order details.
 */

export interface GiftProgress {
  spent: number;
  threshold: number;
  remaining: number;
  windowDays: number;
}

export async function fetchGiftProgress(phone: string): Promise<GiftProgress | null> {
  try {
    const res = await fetch(`/api/orders/gift-progress?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as GiftProgress) ?? null;
  } catch {
    return null;
  }
}

export interface BankGift {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  price?: number;
  stock?: number;
}

/** In-stock gifts from the Gift Bank (public list). */
export async function fetchAvailableGifts(): Promise<BankGift[]> {
  try {
    const res = await fetch('/api/gifts');
    if (!res.ok) return [];
    const json = await res.json();
    const list: BankGift[] = Array.isArray(json) ? json : Array.isArray(json?.gifts) ? json.gifts : [];
    return list.filter((g) => (g.stock ?? 0) > 0);
  } catch {
    return [];
  }
}
