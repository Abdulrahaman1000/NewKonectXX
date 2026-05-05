/**
 * Combo + Product types
 *
 * These shapes mirror what the MongoDB API will return.
 * When the backend is ready, the only thing that changes is the source
 * (api/combos.ts will fetch from /api/combos instead of importing data/combos.ts).
 */

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ComboItem {
  id: string;
  name: string;
  badge: string;          // e.g. "SMART WATCH"
  individualPrice: number;
  images: ProductImage[]; // first image is the primary
  description?: string;
}

export interface Combo {
  id: string;
  slug: string;           // for URL: /combos/:slug
  name: string;
  tagline: string;
  totalPrice: number;
  originalPrice: number;
  badge: string;          // e.g. "🔥 BEST SELLER"
  stockLeft: number;
  isFeatured: boolean;    // shown on homepage
  isActive: boolean;      // hide without deleting
  items: ComboItem[];
  heroImage?: string;     // optional combo-specific hero
  createdAt?: string;
  updatedAt?: string;
}
