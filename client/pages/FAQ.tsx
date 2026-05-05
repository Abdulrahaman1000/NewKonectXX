import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { FAQSection } from '@/sections/FAQSection';
import { fetchFaqs } from '@/api/faqs';
import { useSettings } from '@/contexts/SettingsContext';

export default function FAQ() {
  const { data: faqs = [] } = useQuery({ queryKey: ['faqs'], queryFn: fetchFaqs });
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="FAQ" description="Frequently asked questions about Smart Combo products, shipping, payments, and returns." />
      <Header />
      <CartDrawer />

      <main className="flex-1">
        <div className="section-padding py-16 text-center container-premium">
          <div className="text-6xl mb-3">❓</div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Frequently Asked Questions</h1>
          <p className="text-white/50 max-w-md mx-auto">
            Everything you need to know before ordering.
          </p>
        </div>

        <FAQSection faqs={faqs} whatsappLink={settings?.contact.whatsappLink ?? '#'} />
      </main>

      <Footer />
    </div>
  );
}
