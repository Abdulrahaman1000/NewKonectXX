import { Link } from 'react-router-dom';
import { Check, ChevronRight, ShoppingBag } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { formatNaira } from '@/lib/format';

interface Props {
  featuredCombo: Combo | null;
  whatsappLink: string;
}

export function FinalCTA({ featuredCombo, whatsappLink }: Props) {
  return (
    <section className="section-padding py-24">
      <div className="container-premium">
        <div
          className="relative rounded-3xl overflow-hidden border border-primary/25 px-8 md:px-16 py-16 text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, transparent 50%, rgba(255,140,0,0.04) 100%)',
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div
            className="absolute inset-0 -z-10"
            style={{ background: 'radial-gradient(ellipse at center top, rgba(255,215,0,0.05) 0%, transparent 65%)' }}
          />

          <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-4">Don't miss out</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Ready to Upgrade?</h2>
          <p className="text-white/45 text-lg max-w-lg mx-auto mb-2">
            Join 2,500+ Nigerians already rocking the Smart Combo lifestyle.
          </p>
          {featuredCombo && (
            <p className="text-primary/70 text-sm font-semibold mb-10">
              ⚡ Promo price ends soon — only {featuredCombo.stockLeft} packs left
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to="/checkout"
              className="btn-primary text-base px-10 py-4 flex items-center justify-center gap-2 group font-bold"
            >
              <ShoppingBag className="w-5 h-5" />
              {featuredCombo ? `Order Now — ${formatNaira(featuredCombo.totalPrice)}` : 'Order Now'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-base px-8 py-4 flex items-center justify-center gap-2"
            >
              Order on WhatsApp
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/30">
            {['Free nationwide delivery', '14-day returns', '1-year warranty', '30-day money-back guarantee'].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary/50" /> {t}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
