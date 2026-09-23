/**
 * Hero carousel — responsive, mobile-first.
 *
 * Layout inspired by LandBro-style real-estate heroes: full-bleed background
 * image with a dark overlay, centered bold headline + subtext, and a
 * floating search/category card. Adapted for combos instead of properties —
 * the "category tabs" filter by combo category instead of property type,
 * and searching navigates to /products with query params.
 *
 * The floating card now uses a dark, gold-accented glass look instead of
 * stark white, so it matches the rest of the brand instead of clashing
 * with it. Text order stays: tag → headline → subtext → card → price/CTA.
 *
 * Headline + subtext still come from editable Site Settings (settings.hero),
 * so the copy stays admin-editable. The featured combo's price/savings/stock
 * still show, in a row beneath the card.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Star,
} from 'lucide-react';
import type { Combo } from '@/types/combo';
import type { HeroSlide, HeroContent } from '@/types/settings';

interface HeroCategory {
  id: string;
  label: string;
}

interface Props {
  slides: HeroSlide[];
  featuredCombo: Combo | null;
  whatsappLink: string;
  rating: number;
  reviewCount: number;
  hero?: HeroContent;
  /** Optional — pass your real combo categories here when ready. Falls back to a short default set. */
  categories?: HeroCategory[];
}

const FALLBACK_HEADLINE = 'Wear the Culture. Own the Tech.';
const FALLBACK_SUBTEXT =
  'Bold streetwear meets smart gadgets — combos handpicked to save you money and made to stand out, wherever you go.';
const DEFAULT_CATEGORIES: HeroCategory[] = [
  { id: 'all', label: 'All' },
  { id: 'tech-gadgets', label: 'Tech' },
  { id: 'mens-fashion', label: 'Men' },
  { id: 'womens-fashion', label: 'Women' },
  { id: 'student-budget', label: 'Student' },
  { id: 'gift-combos', label: 'Gifts' },
];
// Note: this is just a fallback. Pass your real categories from the
// `categories` collection as a prop once you wire this up, e.g.
// <HeroCarousel categories={realCategories.map(c => ({ id: c.slug, label: c.name }))} ... />

export function HeroCarousel({
  slides,
  featuredCombo,
  whatsappLink,
  rating,
  reviewCount,
  hero,
  categories = DEFAULT_CATEGORIES,
}: Props) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? 'all');
  const [query, setQuery] = useState('');

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

  const slideImage = (s: any) => s?.desktopImage || s?.image || '';

  const headline = hero?.headline?.trim() || FALLBACK_HEADLINE;
  const subtext = hero?.subtext?.trim() || FALLBACK_SUBTEXT;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="relative overflow-hidden min-h-[560px] md:min-h-[78vh] flex flex-col">
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
            {/* Fallback accent gradient if a slide has no image */}
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent}`} />

            {imgSrc && (
              <div
                className="absolute inset-0"
                style={{
                  transform: transitioning ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 700ms ease-in-out',
                }}
              >
                <img src={imgSrc} alt={slide.tag} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Even dark wash across the whole image, same on mobile and desktop */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.7) 100%)',
              }}
            />
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo((p) => (p - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-primary/30 border border-white/20 hover:border-primary/60 backdrop-blur-md transition-all group"
          >
            <ChevronLeft className="w-5 h-5 text-white/80 group-hover:text-white" />
          </button>
          <button
            type="button"
            onClick={() => goTo((p) => (p + 1) % slides.length)}
            aria-label="Next slide"
            className="hidden md:flex absolute right-5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-primary/30 border border-white/20 hover:border-primary/60 backdrop-blur-md transition-all group"
          >
            <ChevronRight className="w-5 h-5 text-white/80 group-hover:text-white" />
          </button>
        </>
      )}

      {/* Text always comes first: tag, then headline, then subtext, THEN the card below */}
      <div className="relative z-10 px-4 md:px-8 pt-14 md:pt-16">
        <div className="w-full max-w-3xl mx-auto text-center space-y-3 md:space-y-4">
          <span
            className="inline-block text-[10px] md:text-[11px] tracking-[0.22em] uppercase font-bold px-4 py-2 rounded-full backdrop-blur-md border border-primary/30 text-primary"
            style={{ background: 'rgba(10,10,10,0.4)' }}
          >
            {currentSlide.tag}
          </span>

          <h1
            className="text-3xl sm:text-5xl md:text-[3.75rem] font-black leading-[1.05] tracking-tight text-white"
            style={{ textShadow: '0 6px 40px rgba(0,0,0,0.6)' }}
          >
            <span className="gradient-text">{headline}</span>
          </h1>

          <p className="text-sm md:text-base text-white/80 leading-relaxed max-w-xl mx-auto">
            {subtext}
          </p>
        </div>
      </div>

      {/* Floating search/category card — now a dark, gold-accented glass card instead of stark white */}
      <div className="relative z-20 px-4 md:px-8 mt-6 md:mt-8 -mb-10 md:-mb-14">
        <div
          className="max-w-3xl mx-auto rounded-2xl md:rounded-[1.25rem] shadow-2xl overflow-hidden border border-primary/20 backdrop-blur-xl"
          style={{ background: 'rgba(15,13,8,0.85)' }}
        >
          {/* Category tabs — grid on mobile (clean rows, no scrolling), single line on desktop */}
          <style>{`
            .cat-scroll::-webkit-scrollbar { display: none; }
            .cat-scroll { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div className="grid grid-cols-3 gap-1.5 p-2.5 md:flex md:flex-nowrap md:items-center md:justify-center md:gap-2 md:overflow-x-auto cat-scroll border-b border-primary/10 md:px-4 md:py-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`text-center md:shrink-0 md:whitespace-nowrap text-xs md:text-[15px] font-semibold px-2.5 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-full transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary text-black'
                    : 'text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search input row */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 p-3 md:p-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search combos, e.g. smart watch + earbuds"
              className="flex-1 min-w-0 text-sm md:text-[15px] text-white placeholder:text-white/35 bg-transparent px-3 py-2.5 md:py-3 outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full bg-primary text-black flex items-center justify-center hover:brightness-95 transition-all"
            >
              <Search className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              type="button"
              aria-label="Filters"
              className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full border border-primary/25 text-white/70 flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Rating / CTA — stacked, centered rows (price display removed per request) */}
      {featuredCombo && (
        <div className="relative z-10 pt-10 md:pt-14 pb-6 md:pb-8 px-4">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 md:gap-4 text-center">
            {/* Rating + stock */}
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-[11px] md:text-xs text-white/60">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Star className="w-3.5 h-3.5 fill-primary text-primary shrink-0" />
                {rating} / 5 from {reviewCount.toLocaleString()}+ buyers
              </span>
              {featuredCombo.stockLeft > 0 && (
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <AlertCircle className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
                  Only {featuredCombo.stockLeft} left
                </span>
              )}
            </div>

            {/* Row 3: buttons */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <Link
                to={`/combos/${featuredCombo.slug}`}
                className="btn-primary flex items-center justify-center gap-2 group text-sm px-6 py-2.5 font-bold whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                Order Now
                <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 text-sm px-6 py-2.5 whitespace-nowrap"
              >
                WhatsApp
              </a>
            </div>

            {/* Row 4: trust line */}
            <p className="text-[10px] md:text-[11px] text-white/40 flex items-center justify-center gap-2 pt-1 whitespace-nowrap">
              <Check className="w-3 h-3 text-primary/60 shrink-0" />
              Free nationwide delivery · 14-day returns · 1-year warranty
            </p>
          </div>
        </div>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex justify-center gap-2">
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
      )}
    </section>
  );
}