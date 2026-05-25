/**
 * Hero carousel — responsive, mobile-first.
 *
 * Headline + subtext now come from editable Site Settings (settings.hero),
 * so the copy works platform-wide and is editable in admin. The featured
 * combo's price/savings/stock still show when one is featured.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, ChevronLeft, ChevronRight, ShoppingBag, Star } from 'lucide-react';
import type { Combo } from '@/types/combo';
import type { HeroSlide, HeroContent } from '@/types/settings';
import { formatNaira, calculateSavings } from '@/lib/format';

interface Props {
  slides: HeroSlide[];
  featuredCombo: Combo | null;
  whatsappLink: string;
  rating: number;
  reviewCount: number;
  hero?: HeroContent;
}

const FALLBACK_HEADLINE = 'Premium Combos. One Smart Price.';
const FALLBACK_SUBTEXT =
  'Curated bundles across tech, fashion & lifestyle — handpicked, quality-checked, and priced to save you thousands.';

export function HeroCarousel({ slides, featuredCombo, whatsappLink, rating, reviewCount, hero }: Props) {
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setIdx((p) => (p + 1) % slides.length);
        setTransitioning(false);
      }, 400);
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const goTo = (next: number | ((p: number) => number)) => {
    setTransitioning(true);
    setTimeout(() => {
      setIdx((p) => (typeof next === 'function' ? next(p) : next));
      setTransitioning(false);
    }, 400);
  };

  if (slides.length === 0) return null;
  const currentSlide = slides[idx];
  const savings = featuredCombo
    ? calculateSavings(featuredCombo.originalPrice, featuredCombo.totalPrice)
    : null;

  const slideImage = (s: any) => s?.desktopImage || s?.image || '';

  const headline = hero?.headline?.trim() || FALLBACK_HEADLINE;
  const subtext = hero?.subtext?.trim() || FALLBACK_SUBTEXT;

  return (
    <section className="relative overflow-hidden min-h-[640px] md:min-h-[96vh] flex items-center">
      {slides.map((slide, i) => {
        const imgSrc = slideImage(slide);
        return (
          <div
            key={slide.id}
            className="absolute inset-0"
            style={{
              opacity: i === idx ? (transitioning ? 0 : 1) : 0,
              transition: 'opacity 600ms ease-in-out',
              pointerEvents: i === idx ? 'auto' : 'none',
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent}`} />
            <div
              className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 65%)' }}
            />
            <div
              className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 65%)' }}
            />
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,215,0,1) 0px, rgba(255,215,0,1) 1px, transparent 1px, transparent 56px)',
              }}
            />
            <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />

            {imgSrc && (
              <>
                <div
                  className="absolute inset-0 md:hidden"
                  style={{
                    opacity: transitioning ? 0 : 0.25,
                    transition: 'opacity 600ms ease-in-out',
                  }}
                >
                  <img src={imgSrc} alt={slide.tag} className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)',
                    }}
                  />
                </div>

                <div
                  className="absolute right-0 top-0 h-full w-1/2 md:w-[45%] hidden md:block"
                  style={{
                    opacity: transitioning ? 0 : 1,
                    transform: transitioning ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'opacity 600ms ease-in-out, transform 600ms ease-in-out',
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={slide.tag}
                    className="w-full h-full object-cover"
                    style={{
                      maskImage:
                        'linear-gradient(to left, rgba(0,0,0,0.95) 20%, transparent 100%)',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to right, transparent 15%, rgba(6,6,20,0.6) 100%)',
                    }}
                  />
                </div>
              </>
            )}

            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo((p) => (p - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/5 hover:bg-primary/30 border border-white/15 hover:border-primary/60 backdrop-blur-md transition-all group"
          >
            <ChevronLeft className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>
          <button
            type="button"
            onClick={() => goTo((p) => (p + 1) % slides.length)}
            aria-label="Next slide"
            className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/5 hover:bg-primary/30 border border-white/15 hover:border-primary/60 backdrop-blur-md transition-all group"
          >
            <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <div className="absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === idx ? 'w-8 h-[3px] bg-primary' : 'w-[5px] h-[5px] bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-8 md:right-16 md:left-auto md:translate-x-0 z-20">
        <span
          className="text-[9px] md:text-[10px] tracking-[0.18em] md:tracking-[0.22em] uppercase font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-full backdrop-blur-md border border-primary/25 text-primary/85 whitespace-nowrap"
          style={{ background: 'rgba(255,215,0,0.05)' }}
        >
          {currentSlide.tag}
        </span>
      </div>

      <div className="hidden md:block absolute bottom-10 right-8 z-20 text-white/25 text-[11px] tracking-widest">
        0{idx + 1} / 0{slides.length}
      </div>

      <div className="container-premium section-padding py-16 md:py-32 relative z-10 w-full">
        <div className="max-w-full md:max-w-[560px] space-y-4 md:space-y-6 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="h-px w-6 md:w-10 bg-primary/60" />
            <span className="text-[10px] md:text-[11px] tracking-[0.22em] md:tracking-[0.28em] uppercase font-bold text-primary/80">
              Limited Time Offer
            </span>
            <div className="h-px w-6 md:hidden bg-primary/60" />
          </div>

          <h1
            className="text-3xl sm:text-5xl md:text-[4.5rem] font-black leading-[1.05] md:leading-[1.03] tracking-tight text-white"
            style={{ textShadow: '0 6px 48px rgba(0,0,0,0.55)' }}
          >
            <span className="gradient-text">{headline}</span>
          </h1>

          <p className="text-[13px] md:text-[15px] text-white/65 leading-relaxed max-w-full md:max-w-[440px] mx-auto md:mx-0">
            {subtext}
          </p>

          {featuredCombo && (
            <>
              <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 pt-1 flex-wrap">
                <span className="text-3xl sm:text-4xl md:text-5xl font-black text-primary leading-none">
                  {formatNaira(featuredCombo.totalPrice)}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs md:text-sm text-white/35 line-through">
                    {formatNaira(featuredCombo.originalPrice)}
                  </span>
                  {savings && savings.percent > 0 && (
                    <span className="text-[10px] md:text-[11px] font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-primary/15 text-primary border border-primary/25 whitespace-nowrap">
                      SAVE {savings.percent}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1.5 text-[11px] md:text-[12px] text-white/45 pt-1">
                <span className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-primary text-primary" />
                  {rating} / 5 from {reviewCount.toLocaleString()}+ buyers
                </span>
                {featuredCombo.stockLeft > 0 && (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary animate-pulse" />
                    Only {featuredCombo.stockLeft} left
                  </span>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 pt-2">
            <Link
              to={featuredCombo ? `/combos/${featuredCombo.slug}` : '/products'}
              className="btn-primary flex items-center justify-center gap-2 group text-sm md:text-[15px] px-6 md:px-8 py-3 md:py-3.5 font-bold"
            >
              <ShoppingBag className="w-4 h-4" />
              {featuredCombo ? 'Order Now' : 'Browse Combos'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center justify-center gap-2 text-sm md:text-[15px] px-6 md:px-7 py-3 md:py-3.5"
            >
              Order on WhatsApp
            </a>
          </div>

          <p className="text-[10px] md:text-[11px] text-white/30 flex items-center justify-center md:justify-start gap-2 pt-1">
            <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary/60" />
            Free nationwide delivery · 14-day returns · 1-year warranty
          </p>
        </div>
      </div>
    </section>
  );
}
