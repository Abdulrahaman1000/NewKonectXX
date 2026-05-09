/**
 * Products page — uses ComboList which auto-switches between
 * rich showcase (1-2 combos) and grid (3+ combos).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { ComboList } from '@/sections/ComboList';
import { fetchCombos } from '@/api/combos';
import { fetchCategories } from '@/api/categories';
import { useSettings } from '@/contexts/SettingsContext';

export default function Products() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { settings } = useSettings();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos', { category: activeCategory }],
    queryFn: () => fetchCombos(activeCategory ?? undefined),
  });

  const whatsappLink = settings?.contact?.whatsappLink ?? '#';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Products" />
      <Header />
      <CartDrawer />

      <main className="flex-1">
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
      </main>

      <Footer />
    </div>
  );
}
