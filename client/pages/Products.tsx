/**
 * Products page — uses ComboList which auto-switches between
 * rich showcase (1-2 combos) and grid (3+ combos).
 *
 * NEW: "Build Your Own Combo" picker mode. When the URL has
 * ?mode=combo-builder, this page switches to a selectable grid of
 * customComboEligible products instead of the normal browsing view.
 * Customers pick 2-3, see a live running total + discount preview in a
 * sticky bar, and add the group to their cart via useCart().addCustomCombo().
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Sparkles, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { ComboList } from '@/sections/ComboList';
import { fetchCombos, fetchCustomComboEligibleProducts } from '@/api/combos';
import { fetchCategories } from '@/api/categories';
import { useSettings } from '@/contexts/SettingsContext';
import { useCart } from '@/stores/cart';
import { formatNaira } from '@/lib/format';

const MAX_PICKS = 3;
const MIN_PICKS_FOR_DISCOUNT = 2;
const CUSTOM_COMBO_DISCOUNT = 5000;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isBuilderMode = searchParams.get('mode') === 'combo-builder';

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { settings } = useSettings();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos', { category: activeCategory }],
    queryFn: () => fetchCombos(activeCategory ?? undefined),
    enabled: !isBuilderMode,
  });

  const whatsappLink = settings?.contact?.whatsappLink ?? '#';

  const exitBuilderMode = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('mode');
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title={isBuilderMode ? 'Build Your Own Combo' : 'Products'} />
      <Header />
      <CartDrawer />

      <main className="flex-1">
        {isBuilderMode ? (
          <ComboBuilder onExit={exitBuilderMode} whatsappLink={whatsappLink} />
        ) : (
          <>
            <section className="section-padding pt-12 pb-6">
              <div className="container-premium">
                <div className="text-center mb-10">
                  <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">
                    All combos
                  </p>
                  <h1 className="text-3xl md:text-5xl font-black text-white mb-4">Our Products</h1>
                  <p className="text-white/50 max-w-xl mx-auto">
                    Premium combos crafted for the modern Nigerian.
                  </p>
                </div>

                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCategory(null)}
                      className={`text-xs font-bold px-4 py-2 rounded-full border transition-colors ${
                        activeCategory === null
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setActiveCategory(cat.slug)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border transition-colors ${
                          activeCategory === cat.slug
                            ? 'bg-primary/20 border-primary/40 text-primary'
                            : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
            ) : combos.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white/50 mb-4">
                  {activeCategory ? 'No combos in this category yet.' : 'No combos available right now.'}
                </p>
                {activeCategory && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    className="text-primary text-sm hover:underline"
                  >
                    Show all combos →
                  </button>
                )}
              </div>
            ) : (
              <ComboList combos={combos} whatsappLink={whatsappLink} />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ---- Build Your Own Combo picker ----

function ComboBuilder({ onExit, whatsappLink }: { onExit: () => void; whatsappLink: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const addCustomCombo = useCart((s) => s.addCustomCombo);
  const openCart = useCart((s) => s.openCart);

  const { data: eligibleProducts = [], isLoading } = useQuery({
    queryKey: ['customComboEligibleProducts'],
    queryFn: fetchCustomComboEligibleProducts,
  });

  const selectedProducts = useMemo(
    () => eligibleProducts.filter((p) => selectedIds.includes(p.id)),
    [eligibleProducts, selectedIds],
  );

  const rawSubtotal = selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0);
  const discountApplies = selectedIds.length >= MIN_PICKS_FOR_DISCOUNT;
  const discount = discountApplies ? CUSTOM_COMBO_DISCOUNT : 0;
  const finalTotal = rawSubtotal - discount;

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= MAX_PICKS) {
        toast.error(`You can pick up to ${MAX_PICKS} products for a custom combo.`);
        return prev;
      }
      return [...prev, productId];
    });
  };

  const handleAddToCart = () => {
    if (selectedProducts.length < MIN_PICKS_FOR_DISCOUNT) {
      toast.error(`Pick at least ${MIN_PICKS_FOR_DISCOUNT} products to build a combo.`);
      return;
    }
    addCustomCombo(selectedProducts, discount);
    toast.success(`Custom combo added — you saved ${formatNaira(discount)}!`);
    setSelectedIds([]);
    openCart();
  };

  return (
    <div className="pb-40">
      {/* Header */}
      <section className="section-padding pt-12 pb-6">
        <div className="container-premium">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Exit builder
            </button>
          </div>

          <div className="text-center mb-8">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase font-bold px-4 py-2 rounded-full border border-primary/30 text-primary mb-4"
              style={{ background: 'rgba(255,215,0,0.05)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Build Your Own Combo
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3">
              Pick 2 or 3, Save {formatNaira(CUSTOM_COMBO_DISCOUNT)}
            </h1>
            <p className="text-white/50 max-w-xl mx-auto text-sm md:text-base">
              Choose any {MIN_PICKS_FOR_DISCOUNT}-{MAX_PICKS} products below to build your own combo at a
              discount — mix and match however you like.
            </p>
          </div>
        </div>
      </section>

      {/* Product grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : eligibleProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/50">No products are available for the combo builder yet — check back soon.</p>
        </div>
      ) : (
        <section className="section-padding">
          <div className="container-premium">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {eligibleProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const image = product.items[0]?.images?.[0]?.url ?? '';
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleSelect(product.id)}
                    className={`text-left rounded-2xl overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/40'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="relative w-full aspect-square bg-black/40">
                      {image && (
                        <img src={image} alt={product.name} className="w-full h-full object-cover" />
                      )}
                      <div
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'bg-black/50 border-white/40'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1 min-h-[34px]">
                        {product.name}
                      </p>
                      <p className="text-base font-black text-primary">{formatNaira(product.totalPrice)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sticky selection summary bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-primary/25 backdrop-blur-xl"
          style={{ background: 'rgba(10,10,10,0.95)' }}
        >
          <div className="container-premium py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center sm:text-left">
                <p className="text-xs text-white/50">
                  {selectedIds.length} of {MAX_PICKS} selected
                  {!discountApplies && ` — pick ${MIN_PICKS_FOR_DISCOUNT - selectedIds.length} more to unlock the discount`}
                </p>
                <div className="flex items-center gap-2 justify-center sm:justify-start mt-1">
                  <span className="text-xl font-black text-primary">{formatNaira(finalTotal)}</span>
                  {discountApplies && (
                    <>
                      <span className="text-sm text-white/35 line-through">{formatNaira(rawSubtotal)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        − {formatNaira(discount)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!discountApplies}
                className="btn-primary flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <ShoppingBag className="w-4 h-4" />
                Add Combo to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}