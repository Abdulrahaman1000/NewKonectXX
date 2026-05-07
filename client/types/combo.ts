/**
 * Combo + Product types.
 *
 * Now includes categorySlugs[] — combos can belong to multiple categories.
 */

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ComboItem {
  id: string;
  name: string;
  badge: string;
  individualPrice: number;
  images: ProductImage[];
  description?: string;
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
  categorySlugs?: string[];
  createdAt?: string;
  updatedAt?: string;
}
