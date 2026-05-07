/**
 * Categories landing page — /categories
 *
 * Grid of all active category cards. Click → /categories/:slug
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { fetchCategories } from '@/api/categories';

export default function Categories() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="Shop by Category"
        description="Browse Smart Combo's categories — tech, fashion, gifts, business and more."
      />
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">
              Browse
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
              Shop by Category
            </h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Find the perfect combo for who you're shopping for.
            </p>
          </div>

          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-white/40">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/categories/${cat.slug}`}
                  className="group block rounded-2xl border border-white/10 hover:border-primary/40 p-6 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className="text-4xl">{cat.icon || '📦'}</span>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h2 className="text-lg font-black text-white mb-1">{cat.name}</h2>
                  {cat.description && (
                    <p className="text-xs text-white/50 leading-relaxed">{cat.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
