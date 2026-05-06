import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { ProductImageSlider } from '@/components/shared/ProductImageSlider';
import { fetchCombos } from '@/api/combos';
import { useCart } from '@/stores/cart';
import { useSettings } from '@/contexts/SettingsContext';
import { calculateSavings, formatNaira } from '@/lib/format';
import type { Combo } from '@/types/combo';
import { toast } from 'sonner';

export default function Products() {
  const { data: combos, isLoading } = useQuery({
    queryKey: ['combos'],
    queryFn: fetchCombos,
  });

  const { settings } = useSettings();
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const handleAddToCart = (combo: Combo) => {
    addItem(combo);
    toast.success(`${combo.name} added to cart`);
    openCart();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">
              All combos
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4">Our Products</h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Premium combos crafted for the modern Nigerian.
            </p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="skeleton h-64" />
                  <div className="p-5 space-y-3">
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && combos && combos.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-white/50">No combos available yet.</p>
            </div>
          )}

          {!isLoading && combos && combos.length > 0 && (
            <div
              className={
                combos.length === 1
                  ? 'flex justify-center'
                  : 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto'
              }
            >
              {combos.map((combo) => {
                const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
                return (
                  <article
                    key={combo.id}
                    className={`rounded-2xl border border-primary/20 hover:border-primary/40 transition-colors overflow-hidden flex flex-col ${
                      combos.length === 1 ? 'w-full max-w-3xl' : ''
                    }`}
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div
                      className="px-6 py-4 flex items-center justify-between border-b border-primary/15"
                      style={{
                        background: 'linear-gradient(to right, rgba(255,215,0,0.06), transparent)',
                      }}
                    >
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {combo.badge}
                      </span>
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        {percent}% OFF
                      </span>
                    </div>

                    <div className="p-5 grid grid-cols-3 gap-3 bg-black/20">
                      {combo.items.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2">
                          <ProductImageSlider images={item.images} productName={item.name} />
                          <p className="text-[9px] font-bold text-primary/80 text-center truncate">
                            {item.badge}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h2 className="text-xl font-black text-white mb-1">{combo.name}</h2>
                      <p className="text-sm text-white/50 mb-3">{combo.tagline}</p>
                      <p className="text-xs text-white/40 mb-4">
                        Includes: {combo.items.map((i) => i.name).join(', ')}
                      </p>

                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-primary">
                          {formatNaira(combo.totalPrice)}
                        </span>
                        <span className="text-sm text-white/30 line-through">
                          {formatNaira(combo.originalPrice)}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-400 font-semibold mb-3">
                        You save {formatNaira(saving)}
                      </p>
                      <p className="text-[11px] text-amber-400/80 mb-4">
                        ⚡ Only {combo.stockLeft} packs remaining
                      </p>

                      <div className="mt-auto space-y-2">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(combo)}
                          className="btn-primary w-full flex items-center justify-center gap-2 group py-3 font-bold text-sm"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Add to Cart
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        {settings && (
                          <a
                            href={settings.contact.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
                          >
                            Order via WhatsApp
                          </a>
                        )}
                        <Link
                          to="/"
                          className="block text-center text-xs text-white/40 hover:text-primary py-1 transition-colors"
                        >
                          View full details →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
