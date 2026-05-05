/**
 * Combo data — TEMPORARY HARDCODED VERSION
 *
 * When the backend is ready, this file is no longer imported.
 * Instead, api/combos.ts will fetch from MongoDB.
 *
 * The shape of the data here MUST match `Combo` from types/combo.ts
 * so the swap is seamless.
 */

import type { Combo } from '@/types/combo';

export const COMBOS: Combo[] = [
  {
    id: 'smart-combo-1',
    slug: 'smart-combo-pack',
    name: 'Smart Combo Pack',
    tagline: 'Style · Tech · Luxury — All In One',
    totalPrice: 55000,
    originalPrice: 105000,
    badge: '🔥 BEST SELLER',
    stockLeft: 15,
    isFeatured: true,
    isActive: true,
    items: [
      {
        id: 'item-watch-pro',
        name: 'Smart Watch Pro',
        badge: 'SMART WATCH',
        individualPrice: 25000,
        images: [
          { url: '/images/watch1.avif', alt: 'Smart Watch Pro front view' },
          { url: '/images/watch2.avif', alt: 'Smart Watch Pro side view' },
          { url: '/images/watch3.avif', alt: 'Smart Watch Pro features' },
          { url: '/images/watch4.avif', alt: 'Smart Watch Pro lifestyle' },
        ],
      },
      {
        id: 'item-audio-glasses',
        name: 'Bluetooth Audio Glasses',
        badge: 'AUDIO GLASSES',
        individualPrice: 18000,
        images: [
          { url: '/images/glasses1.avif', alt: 'Audio Glasses front' },
          { url: '/images/glasses2.avif', alt: 'Audio Glasses lifestyle' },
          { url: '/images/glasses3.avif', alt: 'Audio Glasses dimensions' },
          { url: '/images/glasses4.avif', alt: 'Audio Glasses dimming feature' },
        ],
      },
      {
        id: 'item-bracelet',
        name: 'Premium Bracelet',
        badge: 'BRACELET',
        individualPrice: 12000,
        images: [
          { url: '/images/bracelet1.avif', alt: 'Premium Bracelet detail' },
          { url: '/images/bracelet2.avif', alt: 'Premium Bracelet stack' },
          { url: '/images/bracelet3.avif', alt: 'Premium Bracelet wrist' },
        ],
      },
    ],
  },
  // Add more combos here when ready — homepage will pick the featured one,
  // /products page will list all active ones.
];

export const getFeaturedCombo = (): Combo | undefined =>
  COMBOS.find((c) => c.isFeatured && c.isActive);

export const getActiveCombos = (): Combo[] =>
  COMBOS.filter((c) => c.isActive);

export const getComboBySlug = (slug: string): Combo | undefined =>
  COMBOS.find((c) => c.slug === slug && c.isActive);
