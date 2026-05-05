/**
 * Cart store — Zustand.
 *
 * Persisted to localStorage so cart survives refresh.
 *
 * Run `npm install zustand` after extracting the project.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/order';
import type { Combo } from '@/types/combo';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  addItem: (combo: Combo, quantity?: number) => void;
  removeItem: (comboId: string) => void;
  updateQuantity: (comboId: string, quantity: number) => void;
  clear: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Computed
  itemCount: () => number;
  subtotal: () => number;
  originalTotal: () => number;
  savings: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (combo, quantity = 1) => {
        const existing = get().items.find((i) => i.comboId === combo.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.comboId === combo.id ? { ...i, quantity: i.quantity + quantity } : i,
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
              },
            ],
          });
        }
      },

      removeItem: (comboId) => {
        set({ items: get().items.filter((i) => i.comboId !== comboId) });
      },

      updateQuantity: (comboId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(comboId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.comboId === comboId ? { ...i, quantity } : i,
          ),
        });
      },

      clear: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      originalTotal: () =>
        get().items.reduce((sum, i) => sum + i.originalPrice * i.quantity, 0),
      savings: () => get().originalTotal() - get().subtotal(),
    }),
    {
      name: 'smart-combo-cart',
      partialize: (state) => ({ items: state.items }), // don't persist isOpen
    },
  ),
);
