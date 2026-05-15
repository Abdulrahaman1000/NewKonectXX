/**
 * useVariantSelection — tracks both alternative AND color selection per item.
 *
 * Returns:
 *  - selections: { itemId -> { alt: 'casio-watch', color: 'red' } }
 *  - pickVariant(itemId, variantId)
 *  - pickColor(itemId, colorId)
 *  - getDisplayed(item): which name/badge/images to actually render
 *  - getSelectedColor(item): the selected color object (or null)
 *  - variantSummary: "Smart Watch (Red) · Glasses · Bracelet (Green)"
 *  - cartSelections: payload-ready object to send to backend
 */

import { useMemo, useState } from 'react';
import type { Combo, ComboItem, ComboItemColor } from '@/types/combo';

export const DEFAULT_VARIANT_ID = 'default';

export interface DisplayedItem {
  id: string;
  name: string;
  badge: string;
  images: Array<{ url: string; alt?: string }>;
  description?: string;
}

interface ItemSelection {
  alt?: string;
  color?: string;
}

export function useVariantSelection(combo: Combo | null | undefined) {
  // itemId -> { alt: alternativeId, color: colorId }
  const [selections, setSelections] = useState<Record<string, ItemSelection>>({});

  const pickVariant = (itemId: string, variantId: string) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], alt: variantId },
    }));
  };

  const pickColor = (itemId: string, colorId: string) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], color: colorId },
    }));
  };

  const getDisplayed = (item: ComboItem): DisplayedItem => {
    const choice = selections[item.id]?.alt;
    if (!choice || choice === DEFAULT_VARIANT_ID) {
      return {
        id: DEFAULT_VARIANT_ID,
        name: item.name,
        badge: item.badge,
        images: item.images ?? [],
        description: item.description,
      };
    }
    const alt = (item.alternatives ?? []).find((a) => a.id === choice);
    if (!alt) {
      return {
        id: DEFAULT_VARIANT_ID,
        name: item.name,
        badge: item.badge,
        images: item.images ?? [],
        description: item.description,
      };
    }
    return {
      id: alt.id,
      name: alt.name,
      badge: alt.badge ?? '',
      images: alt.images.length > 0 ? alt.images : (item.images ?? []),
      description: alt.description,
    };
  };

  const getSelectedColor = (item: ComboItem): ComboItemColor | null => {
    const choice = selections[item.id]?.color;
    if (!choice) return null;
    return (item.colors ?? []).find((c) => c.id === choice) ?? null;
  };

  const variantSummary = useMemo(() => {
    if (!combo) return '';
    return combo.items
      .map((item) => {
        const displayed = getDisplayed(item);
        const color = getSelectedColor(item);
        return color ? `${displayed.name} (${color.name})` : displayed.name;
      })
      .join(' · ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, selections]);

  // Returns payload for cart: only non-default values
  const cartSelections = useMemo(() => {
    const out: Record<string, { alt?: string; color?: string }> = {};
    Object.entries(selections).forEach(([itemId, sel]) => {
      const entry: { alt?: string; color?: string } = {};
      if (sel.alt && sel.alt !== DEFAULT_VARIANT_ID) entry.alt = sel.alt;
      if (sel.color) entry.color = sel.color;
      if (entry.alt || entry.color) out[itemId] = entry;
    });
    return out;
  }, [selections]);

  return {
    selections,
    pickVariant,
    pickColor,
    getDisplayed,
    getSelectedColor,
    variantSummary,
    cartSelections,
  };
}
