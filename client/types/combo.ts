/**
 * Combo type — frontend.
 *
 * Items can have:
 *  - alternatives[]  — different products for the slot
 *  - colors[]        — color variants
 */

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ComboItemAlternative {
  id: string;
  name: string;
  badge?: string;
  images: ProductImage[];
  description?: string;
}

export interface ComboItemColor {
  id: string;
  name: string;
  hexCode?: string;
  imageUrl?: string;
}

export interface ComboItem {
  id: string;
  name: string;
  badge: string;
  individualPrice: number;
  images: ProductImage[];
  description?: string;
  alternatives?: ComboItemAlternative[];
  colors?: ComboItemColor[];
}

export interface Combo {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  totalPrice: number;
  originalPrice: number;
  badge: string;
  stockLeft: number;
  isFeatured: boolean;
  isActive: boolean;
  items: ComboItem[];
  heroImage?: string;
  categorySlugs: string[];
}
