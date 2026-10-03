/**
 * Hero carousel.
 * Desktop/tablet (>= 768px): unchanged original layout.
 * Mobile (< 768px): compact layout — headline, search, scrolling chips,
 * live "Deal of the day" card, trust line.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Glasses,
  Headphones,
  Heart,
  Search,
  Shirt,
  Smartphone,
  Sparkles,
  Watch,
  SlidersHorizontal,
  ShoppingBag,
  Star,
} from 'lucide-react';
import type { Combo } from '@/types/combo';
import type { HeroSlide, HeroContent } from '@/types/settings';
import { calculateSavings, formatNaira } from '@/lib/format';
import { useMobileLayout } from '@/hooks/useMobileLayout';
import { useQuery } from '@tanstack/react-query';
import { fetchCombos } from '@/api/combos';
import { fetchCategories } from '@/api/categories';
import { cldUrl } from '@/lib/cloudinary';

interface HeroCategory {
  id: string;
  label: string;
  /** Emoji or short text shown on the mobile tile. */
  icon?: string;
  /** Picture shown on the mobile tile instead of the emoji. */
  image?: string;
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
  /** Optional: products for the mobile slider. If omitted, the hero loads them itself. */
  combos?: Combo[];
}

const FALLBACK_HEADLINE = 'Wear the Culture. Own the Tech.';
const FALLBACK_SUBTEXT =
  'Bold streetwear meets smart gadgets — combos handpicked to save you money and made to stand out, wherever you go.';
const MOBILE_SUBTEXT = 'Streetwear and gadgets in combos. Free delivery nationwide.';
const DEFAULT_CATEGORIES: HeroCategory[] = [
  { id: 'all', label: 'All', icon: '🔥' },
  { id: 'tech-gadgets', label: 'Tech', icon: '⌚' },
  { id: 'mens-fashion', label: 'Men', icon: '👔' },
  { id: 'womens-fashion', label: 'Women', icon: '👗' },
  { id: 'student-budget', label: 'Student', icon: '🎒' },
  { id: 'gift-combos', label: 'Gifts', icon: '🎁' },
];

/**
 * Mobile-only illustrated backdrop. Shown behind each slide; a real photo
 * (if one loads) covers it. The scene is picked from the slide's tag text.
 */
const SCENES = {
  fashion: { a: '#2a0f2e', b: '#0b0710', glow: 'rgba(255,215,0,0.45)', glow2: 'rgba(255,90,160,0.35)', icons: [Shirt, Glasses, ShoppingBag] },
  tech: { a: '#07203a', b: '#050912', glow: 'rgba(80,170,255,0.45)', glow2: 'rgba(255,215,0,0.30)', icons: [Watch, Headphones, Smartphone] },
  gift: { a: '#33101a', b: '#0d0609', glow: 'rgba(255,215,0,0.45)', glow2: 'rgba(255,80,100,0.35)', icons: [Gift, Heart, Sparkles] },
  mix: { a: '#241a06', b: '#0a0805', glow: 'rgba(255,215,0,0.45)', glow2: 'rgba(255,140,0,0.30)', icons: [Watch, Shirt, Gift] },
} as const;

function HeroBackdrop({ tag }: { tag: string }) {
  const t = (tag ?? '').toLowerCase();
  const key = /gift|present|love|occasion/.test(t)
    ? 'gift'
    : /tech|gadget|watch|smart|audio|phone|earbud/.test(t)
      ? 'tech'
      : /fashion|wear|cloth|style|men|women|street|glasses/.test(t)
        ? 'fashion'
        : 'mix';
  const sc = SCENES[key];
  const [I1, I2, I3] = sc.icons;
  const gold = 'rgba(255,215,0,0.30)';

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${sc.a}, ${sc.b})` }} />
      <div className="absolute -top-16 -right-12 w-64 h-64 rounded-full blur-3xl" style={{ background: sc.glow, opacity: 0.55 }} />
      <div className="absolute -bottom-20 -left-12 w-60 h-60 rounded-full blur-3xl" style={{ background: sc.glow2, opacity: 0.4 }} />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.07,
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <I1 className="absolute -right-3 top-5 w-36 h-36 rotate-12 animate-float" strokeWidth={1} style={{ color: gold }} />
      <I2 className="absolute -left-4 bottom-12 w-28 h-28 -rotate-12" strokeWidth={1} style={{ color: 'rgba(255,255,255,0.14)' }} />
      <I3 className="absolute right-20 bottom-3 w-20 h-20 rotate-6" strokeWidth={1} style={{ color: 'rgba(255,215,0,0.2)' }} />
      <Sparkles className="absolute left-8 top-6 w-5 h-5" style={{ color: 'rgba(255,215,0,0.6)' }} />
      <Sparkles className="absolute right-24 top-24 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
    </div>
  );
}

/** Ticking time-left-today. Its own component so only it re-renders each second. */
function DealCountdown() {
  const calc = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setS(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-300 tabular-nums">
      <Clock className="w-3.5 h-3.5" />
      {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </span>
  );
}

/** Auto-sliding strip of products. Swipe to browse; auto-advance pauses while touched. */
function DealSlider({ combos }: { combos: Combo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);

  useEffect(() => {
    if (combos.length <= 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el || Date.now() < pausedUntil.current) return;
      const first = el.firstElementChild as HTMLElement | null;
      const step = first ? first.offsetWidth + 10 : el.clientWidth / 2;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' });
    }, 3000);
    return () => clearInterval(id);
  }, [combos.length]);

  const pause = () => {
    pausedUntil.current = Date.now() + 6000;
  };

  return (
    <div
      ref={ref}
      onTouchStart={pause}
      onPointerDown={pause}
      onWheel={pause}
      className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {combos.map((c) => {
        const { percent } = calculateSavings(c.originalPrice, c.totalPrice);
        return (
          <Link
            key={c.id ?? c.slug}
            to={`/combos/${c.slug}`}
            className="w-[42%] shrink-0 snap-start rounded-xl overflow-hidden bg-white/[0.06] active:opacity-80"
          >
            <div className="relative aspect-square bg-black/40">
              <img
                src={c.items[0]?.images?.[0]?.url ?? ''}
                alt={c.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              {percent > 0 && (
                <span className="absolute top-1.5 left-1.5 text-[10px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">
                  -{percent}%
                </span>
              )}
              {c.items.length > 1 && (
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-black">
                  {c.items.length}-in-1
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-white line-clamp-1">{c.name}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                <span className="text-sm font-black text-primary">{formatNaira(c.totalPrice)}</span>
                {c.originalPrice > c.totalPrice && (
                  <span className="text-[10px] text-white/40 line-through">
                    {formatNaira(c.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function HeroCarousel({
  slides,
  featuredCombo,
  whatsappLink,
  rating,
  reviewCount,
  hero,
  categories: categoriesProp,
  combos: combosProp,
}: Props) {
  // Desktop keeps the original behaviour (prop or built-in list)
  const categories = categoriesProp ?? DEFAULT_CATEGORIES;
  const navigate = useNavigate();
  const isMobile = useMobileLayout();
  // Same query key as the Products page "All" list, so the cache is shared.
  const { data: allCombos = [] } = useQuery({
    queryKey: ['combos', { category: null }],
    queryFn: () => fetchCombos(),
    enabled: isMobile && !combosProp?.length,
  });
  // Mobile tiles use your real categories (same cache as the Shop page)
  const { data: apiCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isMobile && !categoriesProp,
  });
  const mobileCategories: HeroCategory[] =
    categoriesProp ??
    (apiCategories.length > 0
      ? [
          { id: 'all', label: 'All', icon: '🔥' },
          ...apiCategories.map((c) => ({ id: c.slug, label: c.name, icon: c.icon, image: c.image })),
        ]
      : DEFAULT_CATEGORIES);
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? 'all');
  const [query, setQuery] = useState('');
  const touchX = useRef<number | null>(null);

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

  // Dev-only: tells you in the browser console if no slide has an image URL.
  useEffect(() => {
    if (!import.meta.env.DEV || slides.length === 0) return;
    if (!slides.some((s: any) => s?.desktopImage || s?.image || s?.mobileImage)) {
      console.warn('[HeroCarousel] No image URL found on any slide. First slide:', slides[0]);
    }
  }, [slides]);

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
  // Same source as your original hero (desktopImage, then image). mobileImage is only a last resort.
  // Known fields first, then any other field on the slide that looks like an image URL.
  const IMG_RE = /(\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$)|^data:image\//i;
  const asUrl = (v: any): string | undefined =>
    typeof v === 'string' ? v : typeof v?.url === 'string' ? v.url : undefined;
  const slideImages = (s: any): string[] => {
    const known = [s?.desktopImage, s?.image, s?.mobileImage].map(asUrl);
    const found = Object.values(s ?? {}).map(asUrl).filter((v) => !!v && IMG_RE.test(v as string));
    return Array.from(new Set([...known, ...found].filter((v): v is string => !!v)));
  };

  const headline = hero?.headline?.trim() || FALLBACK_HEADLINE;
  const subtext = hero?.subtext?.trim() || FALLBACK_SUBTEXT;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  /* ───────────────────────── MOBILE ───────────────────────── */
  if (isMobile) {
    // Featured combo first, then every other product, no duplicates
    const deals = [featuredCombo, ...(combosProp?.length ? combosProp : allCombos)]
      .filter((c): c is Combo => !!c)
      .filter((c, i, arr) => arr.findIndex((x) => (x.id ?? x.slug) === (c.id ?? c.slug)) === i)
      .slice(0, 10);

    return (
      <section className="relative">
        {/* Banner: the slides sit behind ONLY the headline + search, so the photo stays visible */}
        <div
          className="relative overflow-hidden bg-[#0d0d0d]"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current == null || slides.length < 2) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) {
              goTo((p) => (p + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
            }
          }}
        >
          <div className="absolute inset-0">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: i === idx ? 1 : 0 }}
              >
                <HeroBackdrop tag={slide.tag} />
                {slideImages(slide)[0] && (
                  <img
                    src={slideImages(slide)[0]}
                    alt=""
                    className="w-full h-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      if (import.meta.env.DEV) {
                        console.warn('[HeroCarousel] image failed to load:', e.currentTarget.src);
                      }
                      const list = slideImages(slide);
                      const cur = list.indexOf(e.currentTarget.getAttribute('src') ?? '');
                      if (list[cur + 1]) e.currentTarget.src = list[cur + 1];
                      else e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            ))}
            {/* Light wash: dark enough for text, light enough to see the photo */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.65) 100%)',
              }}
            />
          </div>

          <div className="relative z-10 px-3 pt-6 pb-8 min-h-[260px] flex flex-col justify-center">
            <div className="text-center">
              <span className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full border border-primary/30 text-primary bg-black/50">
                {currentSlide.tag}
              </span>
              <h1
                className="mt-2 text-2xl font-black leading-tight text-white"
                style={{ textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}
              >
                {headline}
              </h1>
              <p
                className="mt-1 text-[13px] text-white/85 leading-snug"
                style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
              >
                {hero?.subtext?.trim() || MOBILE_SUBTEXT}
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-4 flex items-center rounded-full border border-primary/30 bg-black/70 pl-4 pr-1 py-1"
            >
              <input
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search combos, e.g. smart watch"
                className="flex-1 min-w-0 bg-transparent text-base text-white placeholder:text-white/40 outline-none py-2"
              />
              <button
                type="submit"
                aria-label="Search"
                className="w-11 h-11 shrink-0 rounded-full bg-primary text-black flex items-center justify-center active:scale-95 transition"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {slides.length > 1 && (
            <div className="absolute bottom-0 inset-x-0 z-10 flex justify-center gap-1.5">
              {slides.map((sl, i) => (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="py-2.5"
                >
                  <span
                    className={`block h-1 rounded-full transition-all ${
                      i === idx ? 'w-6 bg-primary' : 'w-1.5 bg-white/50'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Everything below sits on the normal page background */}
        <div className="px-3 pt-3 pb-4">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 grid grid-cols-4 gap-x-2 gap-y-3">
            {mobileCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  navigate(
                    cat.id === 'all' ? '/products' : `/products?category=${encodeURIComponent(cat.id)}`,
                  )
                }
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className="w-16 h-16 rounded-2xl bg-white/[0.08] flex items-center justify-center text-3xl overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cldUrl(cat.image, 'w_128,h_128,c_fill,q_auto,f_auto')}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    cat.icon ?? '🛍️'
                  )}
                </span>
                <span className="text-xs font-medium text-white/85 text-center leading-tight line-clamp-2">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          {deals.length > 0 && (
            <div className="mt-3 rounded-2xl border border-primary/30 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-bold text-white">Deal of the day</span>
                <DealCountdown />
              </div>
              <DealSlider combos={deals} />
              <Link
                to="/products"
                className="btn-secondary mt-3 flex items-center justify-center gap-1 h-11 text-sm font-semibold"
              >
                View all products
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <p className="mt-3 text-[11px] text-white/55 text-center flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-primary text-primary" />
              {rating}/5 · {reviewCount.toLocaleString()}+ buyers
            </span>
            <span>Free delivery</span>
            <span>14-day returns</span>
          </p>
        </div>
      </section>
    );
  }

  /* ─────────────── DESKTOP / TABLET (original, unchanged) ─────────────── */
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

      <div className="relative z-20 px-4 md:px-8 mt-6 md:mt-8 -mb-10 md:-mb-14">
        <div
          className="max-w-3xl mx-auto rounded-2xl md:rounded-[1.25rem] shadow-2xl overflow-hidden border border-primary/20 backdrop-blur-xl"
          style={{ background: 'rgba(15,13,8,0.85)' }}
        >
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

      {featuredCombo && (
        <div className="relative z-10 pt-10 md:pt-14 pb-6 md:pb-8 px-4">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 md:gap-4 text-center">
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