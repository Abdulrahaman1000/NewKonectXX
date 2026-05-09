/**
 * Single combo detail page — /combos/:slug
 *
 * Uses the rich ComboShowcase to display one combo full-page.
 * Reached when customers click a card in the grid view.
 *
 * Has its own URL so:
 *  - Customers can share the link
 *  - Each combo gets its own SEO page
 *  - Browser back button works naturally
 */

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { ComboShowcase } from '@/sections/ComboShowcase';
import { fetchComboBySlug } from '@/api/combos';
import { useSettings } from '@/contexts/SettingsContext';

export default function ComboDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSettings();

  const { data: combo, isLoading } = useQuery({
    queryKey: ['combo', slug],
    queryFn: () => fetchComboBySlug(slug!),
    enabled: !!slug,
  });

  const whatsappLink = settings?.contact?.whatsappLink ?? '#';

  if (!isLoading && !combo) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <CartDrawer />
        <main className="flex-1 section-padding py-20">
          <div className="container-premium text-center">
            <h1 className="text-2xl font-black text-white mb-4">Combo not found</h1>
            <p className="text-white/50 mb-6">
              This combo may no longer be available.
            </p>
            <Link
              to="/products"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              Browse all combos
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title={combo?.name ?? 'Combo'}
        description={combo?.tagline}
      />
      <Header />
      <CartDrawer />

      <main className="flex-1">
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : combo ? (
          <>
            <div className="section-padding pt-8">
              <div className="container-premium">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to all combos
                </Link>
              </div>
            </div>
            <ComboShowcase combos={[combo]} whatsappLink={whatsappLink} />
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
