/**
 * Single category page — /categories/:slug
 * Uses ComboList which auto-switches between rich showcase and grid.
 */

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { ComboList } from '@/sections/ComboList';
import { fetchCategoryBySlug } from '@/api/categories';
import { fetchCombos } from '@/api/combos';
import { useSettings } from '@/contexts/SettingsContext';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSettings();

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: !!slug,
  });

  const { data: combos = [], isLoading: combosLoading } = useQuery({
    queryKey: ['combos', { category: slug }],
    queryFn: () => fetchCombos(slug),
    enabled: !!slug,
  });

  const whatsappLink = settings?.contact?.whatsappLink ?? '#';
  const isLoading = catLoading || combosLoading;

  if (!isLoading && !category) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <CartDrawer />
        <main className="flex-1 section-padding py-20">
          <div className="container-premium text-center">
            <h1 className="text-2xl font-black text-white mb-4">Category not found</h1>
            <Link to="/categories" className="text-primary hover:underline text-sm">
              ← Back to all categories
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title={category?.name ?? 'Category'} description={category?.description} />
      <Header />
      <CartDrawer />

      <main className="flex-1">
        <section className="section-padding pt-12 pb-6">
          <div className="container-premium max-w-6xl">
            <Link
              to="/categories"
              className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-6"
            >
              <ArrowLeft className="w-3 h-3" />
              All categories
            </Link>

            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
            ) : (
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">{category?.icon || '📦'}</div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
                  {category?.name}
                </h1>
                {category?.description && (
                  <p className="text-white/50 max-w-xl mx-auto">{category.description}</p>
                )}
                <p className="text-xs text-white/40 mt-4">
                  {combos.length} {combos.length === 1 ? 'combo' : 'combos'}
                </p>
              </div>
            )}
          </div>
        </section>

        {!isLoading && (
          combos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/50 mb-4">No combos in this category yet.</p>
              <Link to="/products" className="text-primary text-sm hover:underline">
                Browse all combos →
              </Link>
            </div>
          ) : (
            <ComboList combos={combos} whatsappLink={whatsappLink} />
          )
        )}
      </main>

      <Footer />
    </div>
  );
}
