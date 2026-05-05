import { Star } from 'lucide-react';
import type { Testimonial } from '@/types/testimonial';

interface Props {
  testimonials: Testimonial[];
  rating: number;
  reviewCount: number;
}

export function Testimonials({ testimonials, rating, reviewCount }: Props) {
  if (testimonials.length === 0) return null;

  return (
    <section className="section-padding py-24">
      <div className="container-premium">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">Social proof</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3 text-white">Customer Love Stories</h2>
          <p className="text-white/45 max-w-md mx-auto text-[15px]">
            Real reviews from verified buyers across Nigeria
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <span className="text-2xl font-black text-white">{rating}</span>
          <span className="text-white/35 text-sm">from {reviewCount.toLocaleString()}+ verified buyers</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <article
              key={t.id}
              className="p-7 rounded-2xl border border-white/8 hover:border-primary/20 transition-colors flex flex-col"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              <div className="flex gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-[14px] text-white/65 leading-relaxed italic flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/8">
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-sm font-black text-primary">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{t.name}</p>
                  <p className="text-[11px] text-white/35">{t.location}, Nigeria</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
