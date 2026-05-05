import { Link } from 'react-router-dom';
import { AlertCircle, Check, ChevronRight, ShoppingBag } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { ProductImageSlider } from '@/components/shared/ProductImageSlider';
import { calculateSavings, formatNaira } from '@/lib/format';
import { useCart } from '@/stores/cart';
import { toast } from 'sonner';

interface Props {
  combos: Combo[];
  whatsappLink: string;
}

export function ComboShowcase({ combos, whatsappLink }: Props) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const handleAddToCart = (combo: Combo) => {
    addItem(combo);
    toast.success(`${combo.name} added to cart`);
    openCart();
  };

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
          {combos.map((combo) => {
            const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
            const itemTotal = combo.items.reduce((s, i) => s + i.individualPrice, 0);

            return (
              <div
                key={combo.id}
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
                    <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 mb-2">
                      {combo.badge}
                    </span>
                    <h3 className="text-2xl font-black text-white">{combo.name}</h3>
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

                {/* Items */}
                <div className="p-6 md:p-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10">
                    {combo.items.map((item) => (
                      <div key={item.id} className="flex flex-col items-center text-center">
                        <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 mb-4">
                          {item.badge}
                        </span>
                        <div className="w-full mb-4">
                          <ProductImageSlider images={item.images} productName={item.name} />
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">{item.name}</h4>
                        <p className="text-xs text-white/40">
                          Individual value:{' '}
                          <span className="text-white/60 font-semibold">{formatNaira(item.individualPrice)}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Price breakdown + CTA */}
                  <div
                    className="rounded-2xl border border-primary/15 overflow-hidden"
                    style={{ background: 'rgba(255,215,0,0.015)' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-primary/10">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-bold mb-5">
                          Price Breakdown
                        </p>
                        <div className="space-y-3">
                          {combo.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-[13px]">
                              <span className="text-white/60 flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                                {item.name}
                              </span>
                              <span className="text-white/50 tabular-nums">
                                {formatNaira(item.individualPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-dashed border-white/10 mt-5 pt-5 space-y-2">
                          <div className="flex justify-between text-[13px] text-white/30">
                            <span>If bought separately</span>
                            <span className="line-through tabular-nums">{formatNaira(itemTotal)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-white text-[15px]">Combo Price</span>
                            <span className="text-2xl font-black text-primary tabular-nums">
                              {formatNaira(combo.totalPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[12px]">
                            <span className="text-emerald-400">Your savings</span>
                            <span className="text-emerald-400 font-bold tabular-nums">
                              − {formatNaira(saving)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 md:p-8 flex flex-col justify-between gap-6">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-bold mb-2">
                            Total Combo Price
                          </p>
                          <div className="text-5xl font-black text-primary leading-none mb-1">
                            {formatNaira(combo.totalPrice)}
                          </div>
                          <p className="text-[11px] text-white/30 line-through">
                            {formatNaira(combo.originalPrice)} original price
                          </p>
                          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-amber-400/80">
                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                            Only {combo.stockLeft} packs remaining
                          </div>
                        </div>
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(combo)}
                            className="btn-primary w-full flex items-center justify-center gap-2 group py-3.5 font-bold"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            Order This Combo
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
                          >
                            Order via WhatsApp
                          </a>
                          <p className="text-[11px] text-white/30 flex items-center justify-center gap-1.5 pt-1">
                            <Check className="w-3.5 h-3.5 text-primary/60" />
                            Free delivery · 14-day returns · Warranty included
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
