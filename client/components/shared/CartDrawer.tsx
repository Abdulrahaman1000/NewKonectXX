import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import { useCart } from '@/stores/cart';
import { formatNaira } from '@/lib/format';
import type { CartItem } from '@/types/order';

export function CartDrawer() {
  const {
    items,
    customComboGroups,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    savings,
  } = useCart();

  if (!isOpen) return null;

  // Split items into standalone (no group) and grouped-by-comboGroupId
  const standaloneItems = items.filter((i) => !i.comboGroupId);
  const groupsMap = new Map<string, CartItem[]>();
  items.forEach((i) => {
    if (!i.comboGroupId) return;
    const list = groupsMap.get(i.comboGroupId) ?? [];
    list.push(i);
    groupsMap.set(i.comboGroupId, list);
  });

  const removeWholeGroup = (groupId: string, groupItems: CartItem[]) => {
    groupItems.forEach((i) => removeItem(i.comboId, groupId));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className="relative w-full max-w-md bg-background border-l border-white/10 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Your Cart</h2>
            <span className="text-xs text-white/40">({items.length} item{items.length !== 1 ? 's' : ''})</span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/50">
              <div className="text-5xl">🛒</div>
              <p className="text-sm">Your cart is empty</p>
              <button
                type="button"
                onClick={closeCart}
                className="text-primary text-sm hover:underline mt-2"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custom combo groups — shown together, with one discount note per group */}
              {Array.from(groupsMap.entries()).map(([groupId, groupItems]) => {
                const group = customComboGroups.find((g) => g.id === groupId);
                return (
                  <div
                    key={groupId}
                    className="rounded-xl border border-primary/25 overflow-hidden"
                    style={{ background: 'rgba(255,215,0,0.03)' }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-primary/15">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        Your Custom Combo
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWholeGroup(groupId, groupItems)}
                        className="ml-auto text-[10px] text-white/40 hover:text-red-400 transition-colors"
                      >
                        Remove combo
                      </button>
                    </div>

                    <ul className="divide-y divide-white/5">
                      {groupItems.map((item) => (
                        <li key={item.comboId} className="flex gap-3 p-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.comboName}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{item.comboName}</p>
                            <p className="text-sm font-bold text-primary">{formatNaira(item.unitPrice)}</p>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2 border border-white/10 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.comboId, item.quantity - 1, groupId)}
                                  aria-label="Decrease quantity"
                                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-l-lg transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-white w-5 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.comboId, item.quantity + 1, groupId)}
                                  aria-label="Increase quantity"
                                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-r-lg transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(item.comboId, groupId)}
                                aria-label={`Remove ${item.comboName} from cart`}
                                className="text-white/40 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {group && group.discount > 0 && (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-primary/10 border-t border-primary/15">
                        <span className="text-xs font-bold text-primary">Combo discount</span>
                        <span className="text-xs font-bold text-primary">− {formatNaira(group.discount)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone items — unchanged from before */}
              {standaloneItems.length > 0 && (
                <ul className="space-y-4">
                  {standaloneItems.map((item) => (
                    <li
                      key={item.comboId}
                      className="flex gap-3 p-3 rounded-xl border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.comboName}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.comboName}</p>
                        <p className="text-xs text-white/40 line-through">
                          {formatNaira(item.originalPrice)}
                        </p>
                        <p className="text-sm font-bold text-primary">{formatNaira(item.unitPrice)}</p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 border border-white/10 rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.comboId, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-l-lg transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-bold text-white w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.comboId, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-r-lg transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.comboId)}
                            aria-label={`Remove ${item.comboName} from cart`}
                            className="text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-white/10 p-5 space-y-4">
            {savings() > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">You save</span>
                <span className="text-emerald-400 font-bold">− {formatNaira(savings())}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-white/60">Subtotal</span>
              <span className="text-2xl font-black text-primary">{formatNaira(subtotal())}</span>
            </div>
            <p className="text-[11px] text-white/35 text-center">Shipping calculated at checkout</p>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-bold"
            >
              <ShoppingBag className="w-4 h-4" />
              Proceed to Checkout
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}