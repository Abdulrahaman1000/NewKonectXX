/**
 * Combo detail page — /combos/:slug
 *
 * Polished design:
 *  - Gold callout banner alerts customers that this combo is customizable
 *  - Bigger variant thumbnails with names below
 *  - Color picker row (dots if hex set, pills if not)
 *  - "Your selection" live summary in a prominent yellow box
 *  - Pulse animation on first load to draw attention to alternatives
 *  - Mobile-friendly layouts
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2, ShoppingBag, Sparkles, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { ProductImageSlider } from '@/components/shared/ProductImageSlider';
import { fetchComboBySlug } from '@/api/combos';
import { useSettings } from '@/contexts/SettingsContext';
import { useCart } from '@/stores/cart';
import { useVariantSelection } from '@/hooks/useVariantSelection';
import { calculateSavings, formatNaira } from '@/lib/format';
import type { ComboItem, ComboItemColor } from '@/types/combo';
import { toast } from 'sonner';

const DEFAULT_ID = 'default';

export default function ComboDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSettings();
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const { data: combo, isLoading } = useQuery({
    queryKey: ['combo', slug],
    queryFn: () => fetchComboBySlug(slug!),
    enabled: !!slug,
  });

  const {
    selections, pickVariant, pickColor,
    getDisplayed, getSelectedColor,
    variantSummary, cartSelections,
  } = useVariantSelection(combo);

  // Pulse animation runs for first 4 seconds to draw attention
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Dismissible callout banner (per-session)
  const [showBanner, setShowBanner] = useState(true);

  const whatsappLink = settings?.contact?.whatsappLink ?? '#';

  const handleAddToCart = () => {
    if (!combo) return;
    // Flatten cartSelections so backend stays simple
    const flatVariants: Record<string, string> = {};
    Object.entries(cartSelections).forEach(([itemId, sel]) => {
      if (sel.alt) flatVariants[itemId] = sel.alt;
      // Color is also captured — joined into the id with a separator
      if (sel.color) flatVariants[`${itemId}__color`] = sel.color;
    });
    addItem(
      combo,
      1,
      Object.keys(flatVariants).length > 0 ? flatVariants : undefined,
    );
    toast.success(`${combo.name} added to cart`);
    openCart();
  };

  if (!isLoading && !combo) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <CartDrawer />
        <main className="flex-1 section-padding py-20">
          <div className="container-premium text-center">
            <h1 className="text-2xl font-black text-white mb-4">Combo not found</h1>
            <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold">
              Browse all combos
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const savings = combo ? calculateSavings(combo.originalPrice, combo.totalPrice) : null;
  const hasAnyCustomization = combo?.items.some(
    (i) => (i.alternatives?.length ?? 0) > 0 || (i.colors?.length ?? 0) > 0,
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title={combo?.name ?? 'Combo'} description={combo?.tagline} />
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-10">
        <div className="container-premium max-w-6xl">
          <Link to="/products" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-6">
            <ArrowLeft className="w-3 h-3" />
            Back to all combos
          </Link>

          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : combo ? (
            <>
              <div className="text-center mb-6">
                {combo.badge && (
                  <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 mb-4">
                    {combo.badge}
                  </span>
                )}
                <h1 className="text-3xl md:text-5xl font-black text-white mb-2">{combo.name}</h1>
                <p className="text-white/50 max-w-xl mx-auto">{combo.tagline}</p>
              </div>

              {/* Customization callout banner */}
              {hasAnyCustomization && showBanner && (
                <div
                  className="max-w-3xl mx-auto rounded-2xl border border-primary/30 p-4 mb-8 flex items-center gap-4"
                  style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.07), rgba(255,140,0,0.04))' }}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">This combo is customizable</p>
                    <p className="text-xs text-white/60 mt-0.5">
                      Pick different variants or colors below — the price stays the same.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBanner(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10">
                {combo.items.map((item) => {
                  const displayed = getDisplayed(item);
                  const selectedColor = getSelectedColor(item);
                  const hasAlts = (item.alternatives?.length ?? 0) > 0;
                  const hasColors = (item.colors?.length ?? 0) > 0;

                  return (
                    <div key={item.id} className="flex flex-col items-center text-center">
                      {displayed.badge && (
                        <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 mb-4">
                          {displayed.badge}
                        </span>
                      )}
                      <div className="w-full mb-4">
                        <ProductImageSlider
                          key={displayed.id}
                          images={displayed.images}
                          productName={displayed.name}
                        />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{displayed.name}</h3>
                      {selectedColor && (
                        <p className="text-xs text-primary/80 font-bold mb-1">
                          Color: {selectedColor.name}
                        </p>
                      )}
                      <p className="text-xs text-white/40 mb-4">
                        Individual value:{' '}
                        <span className="text-white/60 font-semibold">{formatNaira(item.individualPrice)}</span>
                      </p>

                      {hasAlts && (
                        <VariantPicker
                          item={item}
                          selectedId={selections[item.id]?.alt ?? DEFAULT_ID}
                          onPick={(variantId) => pickVariant(item.id, variantId)}
                          pulse={pulse}
                        />
                      )}

                      {hasColors && (
                        <ColorPicker
                          colors={item.colors ?? []}
                          selectedId={selections[item.id]?.color}
                          onPick={(colorId) => pickColor(item.id, colorId)}
                          pulse={pulse}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selection summary + CTA */}
              <div
                className="rounded-2xl border border-primary/20 p-6 md:p-8 max-w-3xl mx-auto"
                style={{ background: 'rgba(255,215,0,0.02)' }}
              >
                {hasAnyCustomization && (
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <p className="text-xs uppercase tracking-widest text-primary/70 font-bold mb-3 text-center">
                      Your selection
                    </p>
                    <p className="text-sm text-white/80 text-center leading-relaxed">{variantSummary}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl md:text-4xl font-black text-primary">
                        {formatNaira(combo.totalPrice)}
                      </span>
                      {combo.originalPrice > combo.totalPrice && (
                        <span className="text-sm text-white/30 line-through">
                          {formatNaira(combo.originalPrice)}
                        </span>
                      )}
                    </div>
                    {savings && savings.saving > 0 && (
                      <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 mt-2">
                        SAVE {formatNaira(savings.saving)} ({savings.percent}% OFF)
                      </span>
                    )}
                  </div>
                  {combo.stockLeft > 0 && combo.stockLeft <= 10 && (
                    <span className="text-xs text-amber-400/80">Only {combo.stockLeft} left</span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={combo.stockLeft === 0}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {combo.stockLeft === 0 ? 'Out of stock' : 'Add to cart'}
                  </button>
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
                  Free nationwide delivery · 14-day returns
                </p>
              </div>
            </>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ---- Variant picker (bigger thumbnails with names) ----

function VariantPicker({
  item, selectedId, onPick, pulse,
}: {
  item: ComboItem;
  selectedId: string;
  onPick: (id: string) => void;
  pulse: boolean;
}) {
  const options = [
    { id: DEFAULT_ID, name: item.name, thumbUrl: item.images?.[0]?.url ?? '' },
    ...(item.alternatives ?? []).map((alt) => ({
      id: alt.id,
      name: alt.name,
      thumbUrl: alt.images?.[0]?.url ?? '',
    })),
  ];

  return (
    <div className="w-full mt-2">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3">
        Pick your preference
      </p>
      <div className="flex items-start justify-center gap-3 flex-wrap">
        {options.map((opt) => {
          const isSelected = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt.id)}
              title={opt.name}
              className={`group/opt flex flex-col items-center gap-1.5 transition-transform ${
                isSelected ? 'scale-105' : 'hover:scale-105'
              } ${pulse && !isSelected ? 'animate-pulse-soft' : ''}`}
            >
              <div
                className={`relative w-16 h-16 rounded-xl overflow-hidden transition-all flex-shrink-0 ${
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(255,215,0,0.4)]'
                    : 'ring-1 ring-white/15 group-hover/opt:ring-white/40 opacity-80 group-hover/opt:opacity-100'
                }`}
              >
                {opt.thumbUrl ? (
                  <img src={opt.thumbUrl} alt={opt.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-[8px] text-white/30">
                    No img
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/15 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary drop-shadow" />
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] max-w-[72px] text-center leading-tight transition-colors ${
                  isSelected ? 'text-primary font-bold' : 'text-white/50'
                }`}
              >
                {opt.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Color picker ----

function ColorPicker({
  colors, selectedId, onPick, pulse,
}: {
  colors: ComboItemColor[];
  selectedId: string | undefined;
  onPick: (id: string) => void;
  pulse: boolean;
}) {
  if (colors.length === 0) return null;

  return (
    <div className="w-full mt-4">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3">
        Pick a color
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {colors.map((color) => {
          const isSelected = color.id === selectedId;
          const hasHex = !!color.hexCode;
          if (hasHex) {
            // Color dot
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onPick(color.id)}
                title={color.name}
                className={`relative w-9 h-9 rounded-full border-2 transition-all flex-shrink-0 ${
                  isSelected
                    ? 'border-primary scale-110 shadow-[0_0_12px_rgba(255,215,0,0.6)]'
                    : 'border-white/30 hover:border-white/60 hover:scale-105'
                } ${pulse && !isSelected ? 'animate-pulse-soft' : ''}`}
                style={{ background: color.hexCode }}
                aria-label={color.name}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  </span>
                )}
              </button>
            );
          }
          // Pill label (no hex provided)
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onPick(color.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                isSelected
                  ? 'bg-primary/20 border-primary/50 text-primary scale-105'
                  : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/90'
              } ${pulse && !isSelected ? 'animate-pulse-soft' : ''}`}
            >
              {color.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
