/**
 * Cart store — Zustand.
 *
 * Existing behavior unchanged: addItem accepts an optional `selectedVariants`
 * map and stores it with the cart item. Items with different variant
 * selections are treated as the SAME combo (quantity adds up).
 *
 * NEW — "Build Your Own Combo" support:
 *  - addCustomCombo(products, discount) adds 2-3 products as SEPARATE cart
 *    line items (per your requirement: "separate line items with a
 *    discount note"), all tagged with a shared `comboGroupId`.
 *  - A matching entry is added to `customComboGroups`, recording that
 *    group's flat discount amount.
 *  - subtotal() now subtracts the total of all active group discounts,
 *    so the discount is actually applied at checkout.
 *  - If every item belonging to a group gets removed individually, the
 *    group record is cleaned up automatically so no orphaned discount
 *    lingers.
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

interface CartStore {
  items: CartItem[];
  customComboGroups: CustomComboGroup[];
  isOpen: boolean;

  addItem: (
    combo: Combo,
    quantity?: number,
    selectedVariants?: Record<string, string>,
  ) => void;

  /**
   * Adds 2-3 products as a linked "Build Your Own Combo" group.
   * Each product becomes its own cart line item (tagged with the same
   * comboGroupId), and one flat discount is recorded for the group.
   */
  addCustomCombo: (products: Combo[], discount: number) => void;

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

/** Generates a short, unique-enough id for grouping cart items from one custom combo build. */
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
        // Only merge with an existing line if it's a plain (non-grouped) item
        // with the same comboId — a grouped item should stay tied to its group.
        const existing = get().items.find(
          (i) => i.comboId === combo.id && !i.comboGroupId,
        );
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.comboId === combo.id && !i.comboGroupId
                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    // If new variants were chosen, prefer them; else keep previous selection
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
        if (products.length < 2) return; // guard: a "combo" needs at least 2 items
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

      removeItem: (comboId, comboGroupId) => {
        const remaining = get().items.filter((i) =>
          comboGroupId ? !(i.comboId === comboId && i.comboGroupId === comboGroupId) : i.comboId !== comboId,
        );

        // If a group's items are now all gone, drop the orphaned group/discount too.
        let groups = get().customComboGroups;
        if (comboGroupId) {
          const groupStillHasItems = remaining.some((i) => i.comboGroupId === comboGroupId);
          if (!groupStillHasItems) {
            groups = groups.filter((g) => g.id !== comboGroupId);
          }
        }

        set({ items: remaining, customComboGroups: groups });
      },

      updateQuantity: (comboId, quantity, comboGroupId) => {
        if (quantity <= 0) {
          get().removeItem(comboId, comboGroupId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.comboId === comboId && (comboGroupId ? i.comboGroupId === comboGroupId : !i.comboGroupId)
              ? { ...i, quantity }
              : i,
          ),
        });
      },

      clear: () => set({ items: [], customComboGroups: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      itemsSubtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

      customComboDiscountTotal: () =>
        get().customComboGroups.reduce((sum, g) => sum + g.discount, 0),

      subtotal: () => get().itemsSubtotal() - get().customComboDiscountTotal(),

      originalTotal: () =>
        get().items.reduce((sum, i) => sum + i.originalPrice * i.quantity, 0),

      savings: () => get().originalTotal() - get().subtotal(),
    }),
    {
      name: 'smart-combo-cart',
      partialize: (state) => ({ items: state.items, customComboGroups: state.customComboGroups }),
    },
  ),
);