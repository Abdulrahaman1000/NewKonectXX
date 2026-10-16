/**
 * Product cards for the AI chat (pure functions, no database here).
 *
 * Cards are built in code from the shop's own data, never written by the AI,
 * so the name, price, stock and photo are always exact.
 */

import type { KDoc } from "./retrieve";

/** A knowledge document that may carry a photo. */
export type ImgDoc = KDoc & { image?: string };

export interface AICard {
  id: string;
  title: string;
  price: number;
  inStock: boolean;
  image: string | null;
  link: string | null;
}

/**
 * Returns a safe, small photo URL or null.
 * - Rejects base64 "data:" images (far too big to send in a chat reply).
 * - Shrinks Cloudinary photos to a 240x240 thumbnail so the chat loads fast.
 */
export function thumb(url?: string | null): string | null {
  if (!url) return null;
  const u = String(url).trim();
  if (!u || u.length > 2000 || u.startsWith("data:")) return null;
  if (!/^https?:\/\//i.test(u) && !u.startsWith("/")) return null;
  const m = u.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/i);
  if (m) return `${m[1]}f_auto,q_auto,c_fill,w_240,h_240/${m[2]}`;
  return u;
}

export function toCard(doc: KDoc): AICard | null {
  if (doc.type !== "combo" || typeof doc.price !== "number") return null;
  return {
    id: doc.id,
    title: doc.title,
    price: doc.price,
    inStock: !!doc.inStock,
    image: (doc as ImgDoc).image ?? null,
    link: doc.link ?? null,
  };
}

/** In-stock combos that cost no more than the budget, closest to the budget first. */
export function budgetCards(all: KDoc[], budget: number, limit = 6): { cards: AICard[]; total: number } {
  const fits = all
    .filter((d) => d.type === "combo" && d.inStock && typeof d.price === "number" && (d.price as number) <= budget)
    .sort((a, b) => (b.price as number) - (a.price as number));
  const cards = fits
    .slice(0, limit)
    .map(toCard)
    .filter((c): c is AICard => c !== null);
  return { cards, total: fits.length };
}

// Questions that mention a budget but are really about something else
const OTHER_TOPIC = /\b(deliver\w*|shipping|ship|fee|gift|pay\w*|refund|return\w*|warranty|contact|track\w*)\b/i;

/** True when a budget question should simply be answered with a list of products. */
export function isBudgetListQuestion(question: string): boolean {
  return !OTHER_TOPIC.test(question);
}
