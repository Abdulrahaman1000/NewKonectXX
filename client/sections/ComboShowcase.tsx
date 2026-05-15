/**
 * ComboShowcase — homepage / listing display with inline variant pickers.
 *
 * Each combo card lets customers swap items at no price change before
 * adding to cart. The "Your selection" summary updates live.
 */

import { Link } from 'react-router-dom';
import { Check, ShoppingBag } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { ProductImageSlider } from '@/components/shared/ProductImageSlider';
import { VariantSelector } from '@/components/shared/VariantSelector';
import { calculateSavings, formatNaira } from '@/lib/format';
import { useCart } from '@/stores/cart';
import { useVariantSelection } from '@/hooks/useVariantSelection';
import { toast } from 'sonner';

interface Props {
  combos: Combo[];
  whatsappLink: string;
}

export function ComboShowcase({ combos, whatsappLink }: Props) {
  if (combos.length === 0) {
    return (
      <section className="section-padding py-24">
        <div className="container-premium text-center">
          <p className="text-white/50">No combos available right now. Check back soon.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding py-24">
      <div className="container-premium">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">What you get</p>
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">
            {combos.length === 1 ? 'Our Premium Combo' : 'Our Premium Combos'}
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-[15px] leading-relaxed">
            Everything you need in one powerful bundle — crafted for the modern Nigerian.
          </p>
        </div>

        <div className="space-y-14">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} whatsappLink={whatsappLink} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Each combo gets its own variant selection state, so customers can
// customize multiple combos on the same page independently.
function ComboCard({ combo, whatsappLink }: { combo: Combo; whatsappLink: string }) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);
  const { selections, pickVariant, getDisplayed, variantSummary, nonDefaultSelections } =
    useVariantSelection(combo);

  const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);

  const handleAddToCart = () => {
    addItem(
      combo,
      1,
      Object.keys(nonDefaultSelections).length > 0 ? nonDefaultSelections : undefined,
    );
    toast.success(`${combo.name} added to cart`);
    openCart();
  };

  const hasAnyAlternatives = combo.items.some((i) => (i.alternatives?.length ?? 0) > 0);

  return (
    <div
      className="rounded-3xl overflow-hidden border border-primary/20"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Header */}
      <div
        className="px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-primary/15"
        style={{
          background:
            'linear-gradient(to right, rgba(255,215,0,0.06), transparent, rgba(255,140,0,0.03))',
        }}
      >
        <div>
          {combo.badge && (
            <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 mb-2">
              {combo.badge}
            </span>
          )}
          <h3 className="text-2xl font-black text-white">
            <Link to={`/combos/${combo.slug}`} className="hover:text-primary transition-colors">
              {combo.name}
            </Link>
          </h3>
          <p className="text-sm text-white/45 mt-0.5">{combo.tagline}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-primary">{formatNaira(combo.totalPrice)}</span>
            <span className="text-sm text-white/30 line-through">{formatNaira(combo.originalPrice)}</span>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            YOU SAVE {formatNaira(saving)} ({percent}% OFF)
          </span>
        </div>
      </div>

      {/* Items with variant pickers */}
      <div className="p-6 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8">
          {combo.items.map((item) => {
            const displayed = getDisplayed(item);
            return (
              <div key={item.id} className="flex flex-col items-center text-center">
                {displayed.badge && (
                  <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 mb-4">
                    {displayed.badge}
                  </span>
                )}
                <div className="w-full mb-4">
                  {/* key={displayed.id} forces the slider to remount with the
                      new image array — so it resets to index 0 and doesn't
                      crash if the new variant has fewer images. */}
                  <ProductImageSlider
                    key={displayed.id}
                    images={displayed.images}
                    productName={displayed.name}
                  />
                </div>
                <h4 className="text-base font-bold text-white mb-1">{displayed.name}</h4>
                <p className="text-xs text-white/40 mb-3">
                  Individual value:{' '}
                  <span className="text-white/60 font-semibold">
                    {formatNaira(item.individualPrice)}
                  </span>
                </p>

                {/* Variant thumbnails */}
                {(item.alternatives?.length ?? 0) > 0 && (
                  <VariantSelector
                    item={item}
                    selectedId={selections[item.id] ?? 'default'}
                    onPick={(variantId) => pickVariant(item.id, variantId)}
                    compact
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Selection summary (only show if there are alternatives somewhere) */}
        {hasAnyAlternatives && (
          <div
            className="rounded-xl border border-primary/15 p-4 mb-6"
            style={{ background: 'rgba(255,215,0,0.02)' }}
          >
            <p className="text-[10px] uppercase tracking-widest text-primary/70 font-bold mb-1.5">
              Your selection
            </p>
            <p className="text-sm text-white/70">{variantSummary}</p>
          </div>
        )}

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={combo.stockLeft === 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            {combo.stockLeft === 0 ? 'Out of stock' : `Add to cart — ${formatNaira(combo.totalPrice)}`}
          </button>
          <Link
            to={`/combos/${combo.slug}`}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold"
          >
            View details
          </Link>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold"
          >
            Order on WhatsApp
          </a>
        </div>

        <p className="text-[11px] text-white/30 text-center mt-4 flex items-center justify-center gap-2">
          <Check className="w-3 h-3 text-primary/60" />
          Free nationwide delivery · 14-day returns · 1-year warranty
        </p>
      </div>
    </div>
  );
}
