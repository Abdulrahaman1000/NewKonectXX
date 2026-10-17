/**
 * Product cards for the AI chat.
 *
 * Cards are built in code from the shop's own data, never written by the AI,
 * so the name, price, stock and photo are always exact. Photos are looked up
 * separately from the knowledge text (and cached for 60s).
 */

import { Combo } from "../models/Combo";
import type { KDoc } from "./retrieve";

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

const IMG_TTL_MS = 60_000;
let imgCache: { at: number; map: Map<string, string> } | null = null;

/** slug -> thumbnail URL, for every active combo that has a usable photo. */
export async function getComboImages(): Promise<Map<string, string>> {
  if (imgCache && Date.now() - imgCache.at < IMG_TTL_MS) return imgCache.map;
  const map = new Map<string, string>();
  try {
    const rows: any[] = await Combo.aggregate([
      { $match: { isActive: true } },
      { $limit: 100 },
      {
        $project: {
          slug: 1,
          hero: "$heroImage",
          // first photo of the combo's first item
          first: { $arrayElemAt: [{ $arrayElemAt: ["$items.images", 0] }, 0] },
        },
      },
    ]);
    for (const r of rows) {
      const url = thumb(r.hero) ?? thumb(r.first?.url);
      if (r.slug && url) map.set(String(r.slug), url);
    }
  } catch (err) {
    console.error("[ai] could not load combo photos:", (err as Error)?.message);
  }
  imgCache = { at: Date.now(), map };
  return map;
}

/** A card for a combo document; null for anything else (FAQ, policy...). */
export function toCard(doc: KDoc, images: Map<string, string>): AICard | null {
  if (doc.type !== "combo" || typeof doc.price !== "number") return null;
  const slug = doc.id.replace(/^combo:/, "");
  return {
    id: doc.id,
    title: doc.title,
    price: doc.price,
    inStock: !!doc.inStock,
    image: images.get(slug) ?? null,
    link: doc.link ?? null,
  };
}
