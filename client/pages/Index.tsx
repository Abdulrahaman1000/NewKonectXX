import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { HeroCarousel } from '@/sections/HeroCarousel';
import { TrustBar } from '@/sections/TrustBar';
import { PromoCountdown } from '@/sections/PromoCountdown';
import { ComboShowcase } from '@/sections/ComboShowcase';
import { DemoVideo } from '@/sections/DemoVideo';
import { Features } from '@/sections/Features';
import { WhyChooseUs } from '@/sections/WhyChooseUs';
import { Testimonials } from '@/sections/Testimonials';
import { FAQSection } from '@/sections/FAQSection';
import { FinalCTA } from '@/sections/FinalCTA';
import { fetchCombos, fetchFeaturedCombo } from '@/api/combos';
import { fetchTestimonials } from '@/api/testimonials';
import { fetchFaqs } from '@/api/faqs';
import { fetchHeroSlides } from '@/api/heroSlides';
import { useSettings } from '@/contexts/SettingsContext';

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

  // Wait for settings before first render — they drive most sections.
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
      <ComboShowcase combos={combos} whatsappLink={settings.contact.whatsappLink} />
      <DemoVideo video={settings.video} />
      <Features />
      <WhyChooseUs />
      <Testimonials
        testimonials={testimonials}
        rating={settings.trustStats.rating}
        reviewCount={settings.trustStats.reviewCount}
      />
      <FAQSection faqs={faqs} />
      <FinalCTA whatsappLink={settings.contact.whatsappLink} />
      <Footer />
    </div>
  );
}
