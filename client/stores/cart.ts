/**
 * Cart store — Zustand.
 *
 * Existing behavior unchanged: addItem accepts an optional `selectedVariants`
 * map and stores it with the cart item. Items with different variant
 * selections are treated as the SAME combo (quantity adds up).
 *
 * Free Gift Bank support:
 *  - Unlocks at ₦40,000 subtotal threshold.
 *  - Gift comes from the Gift Bank (admin-managed, /api/gifts) — NOT from
 *    Combo. selectFreeGift takes a generic FreeGiftSource so it isn't tied
 *    to the Combo shape.
 *  - Automatically drops selected free gift if subtotal falls below ₦40,000.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/order';
import type { Combo } from '@/types/combo';

export interface CustomComboGroup {
  id: string;
  /** Flat ₦ amount off, applied once for this whole group — not per item. */
  discount: number;
  /** When the group was created, for display ordering / debugging. */
  createdAt: number;
}

/** Minimal shape needed to add ANY free gift as a cart line item — decoupled
 *  from Combo, so it works for Gift Bank items (from /api/gifts). */
export interface FreeGiftSource {
  id: string;
  name: string;
  slug?: string;
  image: string;
  /** Estimated/original value, shown struck-through — not charged. */
  price?: number;
}

export const GIFT_THRESHOLD = 40000;

interface CartStore {
  items: CartItem[];
  customComboGroups: CustomComboGroup[];
  isOpen: boolean;

  addItem: (
    combo: Combo,
    quantity?: number,
    selectedVariants?: Record<string, string>,
  ) => void;

  /** Adds 2-3 products as a linked "Build Your Own Combo" group. */
  addCustomCombo: (products: Combo[], discount: number) => void;

  /** Free Gift Actions */
  selectFreeGift: (gift: FreeGiftSource) => void;
  removeFreeGift: () => void;
  selectedFreeGift: () => CartItem | undefined;
  qualifiesForFreeGift: () => boolean;

  removeItem: (comboId: string, comboGroupId?: string) => void;
  updateQuantity: (comboId: string, quantity: number, comboGroupId?: string) => void;
  clear: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  itemCount: () => number;
  /** Sum of unitPrice * quantity across all items, before any custom-combo discount. */
  itemsSubtotal: () => number;
  /** Total of all active custom-combo group discounts. */
  customComboDiscountTotal: () => number;
  /** itemsSubtotal() minus customComboDiscountTotal() — what the customer actually pays for items. */
  subtotal: () => number;
  originalTotal: () => number;
  savings: () => number;
}

function makeGroupId(): string {
  return `combo-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      customComboGroups: [],
      isOpen: false,

      addItem: (combo, quantity = 1, selectedVariants) => {
        const existing = get().items.find(
          (i) => i.comboId === combo.id && !i.comboGroupId && !i.isFreeGift,
        );
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.comboId === combo.id && !i.comboGroupId && !i.isFreeGift
                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    selectedVariants: selectedVariants ?? i.selectedVariants,
                  }
                : i,
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                comboId: combo.id,
                comboName: combo.name,
                comboSlug: combo.slug,
                unitPrice: combo.totalPrice,
                originalPrice: combo.originalPrice,
                quantity,
                image: combo.items[0]?.images[0]?.url ?? '',
                selectedVariants,
              },
            ],
          });
        }
      },

      addCustomCombo: (products, discount) => {
        if (products.length < 2) return;
        const groupId = makeGroupId();

        const newItems: CartItem[] = products.map((combo) => ({
          comboId: combo.id,
          comboName: combo.name,
          comboSlug: combo.slug,
          unitPrice: combo.totalPrice,
          originalPrice: combo.originalPrice,
          quantity: 1,
          image: combo.items[0]?.images[0]?.url ?? '',
          comboGroupId: groupId,
        }));

        set({
          items: [...get().items, ...newItems],
          customComboGroups: [
            ...get().customComboGroups,
            { id: groupId, discount, createdAt: Date.now() },
          ],
        });
      },

      selectFreeGift: (gift) => {
        if (!get().qualifiesForFreeGift()) return;

        const giftItem: CartItem = {
          comboId: gift.id,
          comboName: gift.name,
          comboSlug: gift.slug ?? '',
          unitPrice: 0,
          originalPrice: gift.price ?? 0,
          quantity: 1,
          image: gift.image,
          isFreeGift: true,
        };

        // Remove any existing free gift line item before adding the new selection
        const cleanedItems = get().items.filter((i) => !i.isFreeGift);
        set({ items: [...cleanedItems, giftItem] });
      },

      removeFreeGift: () => {
        set({ items: get().items.filter((i) => !i.isFreeGift) });
      },

      selectedFreeGift: () => {
        return get().items.find((i) => i.isFreeGift);
      },

      qualifiesForFreeGift: () => {
        return get().subtotal() >= GIFT_THRESHOLD;
      },

      removeItem: (comboId, comboGroupId) => {
        const remaining = get().items.filter((i) =>
          comboGroupId ? !(i.comboId === comboId && i.comboGroupId === comboGroupId) : i.comboId !== comboId,
        );

        let groups = get().customComboGroups;
        if (comboGroupId) {
          const groupStillHasItems = remaining.some((i) => i.comboGroupId === comboGroupId);
          if (!groupStillHasItems) {
            groups = groups.filter((g) => g.id !== comboGroupId);
          }
        }

        // Enforce guardrail: if removal causes subtotal to drop below 40k, remove free gift automatically
        const nonGiftSubtotal = remaining.reduce((sum, i) => {
          if (i.isFreeGift) return sum;
          return sum + i.unitPrice * i.quantity;
        }, 0) - groups.reduce((sum, g) => sum + g.discount, 0);

        const finalItems = nonGiftSubtotal < GIFT_THRESHOLD ? remaining.filter((i) => !i.isFreeGift) : remaining;

        set({ items: finalItems, customComboGroups: groups });
      },

      updateQuantity: (comboId, quantity, comboGroupId) => {
        if (quantity <= 0) {
          get().removeItem(comboId, comboGroupId);
          return;
        }

        const updatedItems = get().items.map((i) =>
          i.comboId === comboId && (comboGroupId ? i.comboGroupId === comboGroupId : !i.comboGroupId) && !i.isFreeGift
            ? { ...i, quantity }
            : i,
        );

        const nonGiftSubtotal = updatedItems.reduce((sum, i) => {
          if (i.isFreeGift) return sum;
          return sum + i.unitPrice * i.quantity;
        }, 0) - get().customComboDiscountTotal();

        const finalItems = nonGiftSubtotal < GIFT_THRESHOLD ? updatedItems.filter((i) => !i.isFreeGift) : updatedItems;

        set({ items: finalItems });
      },

      clear: () => set({ items: [], customComboGroups: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      itemsSubtotal: () =>
        get().items.reduce((sum, i) => (i.isFreeGift ? sum : sum + i.unitPrice * i.quantity), 0),

      customComboDiscountTotal: () =>
        get().customComboGroups.reduce((sum, g) => sum + g.discount, 0),

      subtotal: () => get().itemsSubtotal() - get().customComboDiscountTotal(),

      originalTotal: () =>
        get().items.reduce((sum, i) => sum + (i.originalPrice || i.unitPrice) * i.quantity, 0),

      savings: () => get().originalTotal() - get().subtotal(),
    }),
    {
      name: 'smart-combo-cart',
      partialize: (state) => ({ items: state.items, customComboGroups: state.customComboGroups }),
    },
  ),
);