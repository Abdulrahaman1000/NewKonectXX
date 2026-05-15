/**
 * Homepage.
 *
 * Layout (top → bottom):
 *  - Hero carousel
 *  - Trust bar
 *  - Promo countdown
 *  - 🔥 Featured combo (if any combo is marked featured)
 *  - Category sections (one per category that has combos)
 *  - Fallback: if no combos have categories yet, show all in a single grid
 *  - Demo video, features, why-choose-us, testimonials, FAQ, final CTA, footer
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { HeroCarousel } from '@/sections/HeroCarousel';
import { TrustBar } from '@/sections/TrustBar';
import { PromoCountdown } from '@/sections/PromoCountdown';
import { DemoVideo } from '@/sections/DemoVideo';
import { Features } from '@/sections/Features';
import { WhyChooseUs } from '@/sections/WhyChooseUs';
import { Testimonials } from '@/sections/Testimonials';
import { FAQSection } from '@/sections/FAQSection';
import { FinalCTA } from '@/sections/FinalCTA';
import { FeaturedComboCard } from '@/sections/FeaturedComboCard';
import { CategorySection } from '@/sections/CategorySection';
import { ComboGridCard } from '@/sections/ComboGridCard';
import { fetchCombos, fetchFeaturedCombo } from '@/api/combos';
import { fetchTestimonials } from '@/api/testimonials';
import { fetchFaqs } from '@/api/faqs';
import { fetchHeroSlides } from '@/api/heroSlides';
import { fetchCategories } from '@/api/categories';
import { useSettings } from '@/contexts/SettingsContext';
import { Sparkles } from 'lucide-react';

export default function Index() {
  const { settings, isLoading: settingsLoading } = useSettings();

  const { data: featuredCombo } = useQuery({
    queryKey: ['featuredCombo'],
    queryFn: fetchFeaturedCombo,
  });

  const { data: combos = [] } = useQuery({
    queryKey: ['combos'],
    queryFn: () => fetchCombos(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: fetchTestimonials,
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs'],
    queryFn: fetchFaqs,
  });

  const { data: heroSlides = [] } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: fetchHeroSlides,
  });

  // Group combos by category. A combo can belong to multiple categories,
  // so it might appear in multiple sections (intentional — easier discovery).
  // The featured combo is shown in its own section AND excluded from category
  // sections to avoid duplication.
  const combosByCategory = useMemo(() => {
    const map = new Map<string, typeof combos>();
    for (const cat of categories) {
      const list = combos.filter(
        (c) =>
          c.id !== featuredCombo?.id &&
          (c.categorySlugs ?? []).includes(cat.slug),
      );
      map.set(cat.slug, list);
    }
    return map;
  }, [categories, combos, featuredCombo]);

  // Fallback: combos with no category (or if there are no categories defined)
  const uncategorizedCombos = useMemo(() => {
    return combos.filter(
      (c) =>
        c.id !== featuredCombo?.id &&
        (!c.categorySlugs || c.categorySlugs.length === 0),
    );
  }, [combos, featuredCombo]);

  // If we have categories defined AND some have combos, use category layout.
  // Otherwise show a plain grid of all combos.
  const useCategoryLayout =
    categories.length > 0 &&
    Array.from(combosByCategory.values()).some((list) => list.length > 0);

  const nonFeaturedCombos = combos.filter((c) => c.id !== featuredCombo?.id);

  if (settingsLoading || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO />
      <Header />
      <CartDrawer />

      <HeroCarousel
        slides={heroSlides}
        featuredCombo={featuredCombo ?? null}
        whatsappLink={settings.contact.whatsappLink}
        rating={settings.trustStats.rating}
        reviewCount={settings.trustStats.reviewCount}
      />

      <TrustBar />
      <PromoCountdown promo={settings.promo} />

      {/* Featured combo section */}
      {featuredCombo && (
        <section className="section-padding py-10 md:py-14">
          <div className="container-premium">
            <div className="flex items-center gap-2 mb-5 md:mb-7">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg md:text-2xl font-black text-white">Featured</h2>
            </div>
            <FeaturedComboCard combo={featuredCombo} />
          </div>
        </section>
      )}

      {/* Category sections — only show categories with combos */}
      {useCategoryLayout ? (
        <>
          {categories.map((cat) => {
            const catCombos = combosByCategory.get(cat.slug) ?? [];
            return (
              <CategorySection
                key={cat.slug}
                category={cat}
                combos={catCombos}
              />
            );
          })}
          {/* Uncategorized combos, if any */}
          {uncategorizedCombos.length > 0 && (
            <section className="section-padding py-10 md:py-14">
              <div className="container-premium">
                <h2 className="text-lg md:text-2xl font-black text-white mb-5 md:mb-7">
                  More Combos
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                  {uncategorizedCombos.map((combo) => (
                    <ComboGridCard key={combo.id} combo={combo} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        nonFeaturedCombos.length > 0 && (
          <section className="section-padding py-10 md:py-14">
            <div className="container-premium">
              <h2 className="text-lg md:text-2xl font-black text-white mb-5 md:mb-7">
                Our Combos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                {nonFeaturedCombos.map((combo) => (
                  <ComboGridCard key={combo.id} combo={combo} />
                ))}
              </div>
            </div>
          </section>
        )
      )}

      <DemoVideo video={settings.video} />
      <Features />
      <WhyChooseUs />
      <Testimonials
        testimonials={testimonials}
        rating={settings.trustStats.rating}
        reviewCount={settings.trustStats.reviewCount}
      />
      <FAQSection faqs={faqs} whatsappLink={settings.contact.whatsappLink} />
      <FinalCTA whatsappLink={settings.contact.whatsappLink} />
      <Footer />
    </div>
  );
}
