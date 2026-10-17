/**
 * Mobile home sections — phones only. Index.tsx renders these when
 * useMobileLayout() is true. HeroCarousel (desktop) is not touched.
 *
 *  <MobileHero />            headline, two buttons, a swipeable slider of your real combos
 *                            (more than one item; featured first), one trust row
 *  <MobileQuickShop />       search + your category grid, unchanged in look
 *  <MobileDeals />           "Deal of the day" card, same as before
 *  <MobileProducts />        single products (one item), bought on their own
 *  <MobileResellerSection /> "Become a partner" block + sign-up popup, based on the Partner Program plan
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Gift,
  Layers,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';
import { GIFT_THRESHOLD } from '@/stores/cart';
import { cldUrl } from '@/lib/cloudinary';
import { useTheme } from '@/lib/theme';
import { ResellerSignupModal } from '@/components/shared/ResellerSignupModal';

/** Same pictures as the desktop hero (root public/ folder). */
const HERO_BG_DARK = '/hero-bg-dark.jpg';
const HERO_BG_LIGHT = '/hero-bg-light.jpg';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** One item = a plain product. More than one item = a combo. */
const isCombo = (c: Combo) => c.items.length > 1;

/**
 * Featured first, then the rest. No duplicates, inactive ones skipped.
 * comboOnly drops single products (used by the hero slider).
 */
function orderCombos(
  featured: Combo | null,
  combos: Combo[],
  limit: number,
  comboOnly = false,
): Combo[] {
  return [featured, ...combos]
    .filter((c): c is Combo => !!c && c.isActive !== false && (!comboOnly || isCombo(c)))
    .filter((c, i, arr) => arr.findIndex((x) => (x.id ?? x.slug) === (c.id ?? c.slug)) === i)
    .slice(0, limit);
}

/* ───────────────────────────── Hero ───────────────────────────── */

interface MobileHeroProps {
  featuredCombo: Combo | null;
  combos: Combo[];
}

export function MobileHero({ featuredCombo, combos }: MobileHeroProps) {
  const list = orderCombos(featuredCombo, combos, 12, true);
  const { resolved: themeMode } = useTheme();
  const isLight = themeMode === 'light';

  return (
    <section
      className="relative isolate overflow-hidden px-4 pt-6 pb-5"
      style={{
        background:
          'radial-gradient(120% 55% at 90% 0%, rgba(255,200,0,0.16), transparent 60%), hsl(var(--background))',
      }}
    >
      {/* Studio picture behind the headline. It fades out before the buttons. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[270px]"
        style={{
          backgroundImage: `url(${isLight ? HERO_BG_LIGHT : HERO_BG_DARK})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[270px]"
        style={{
          background: isLight
            ? 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1))'
            : 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15))',
        }}
      />
      <h1 className="max-w-[18ch] text-[28px] font-black leading-[1.12] text-white">
        Build your Smart Combo. Get a free gift.
      </h1>

      <p className="mt-3 max-w-[34ch] text-[15px] leading-snug text-white/70">
        Pick a ready-made combo or build your own. Orders over {formatNaira(GIFT_THRESHOLD)} come
        with a free gift.
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        <Link
          to="/products?mode=combo-builder"
          className={`btn-primary flex h-14 items-center justify-center gap-2 px-4 text-base font-bold ${FOCUS}`}
        >
          <Layers className="h-5 w-5" />
          Build Your Combo
        </Link>
        <Link
          to="/products"
          className={`btn-ghost flex h-12 items-center justify-center gap-1 px-4 text-sm font-semibold ${FOCUS}`}
        >
          Shop All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <a
        href="#reseller"
        className={`mt-3 flex items-center justify-center gap-1 py-2 text-sm text-white/60 ${FOCUS}`}
      >
        Want to earn? <span className="font-semibold text-primary">Become a partner</span>
      </a>

      {list.length > 0 && <ComboSlider combos={list} />}

      {/* Only claims that are always true. Warranty, returns and review counts are left out on purpose. */}
      <ul className="mt-5 grid grid-cols-3 text-center text-[11px] leading-tight text-white/60">
        <li className="flex flex-col items-center gap-1.5 px-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Pay securely online
        </li>
        <li className="flex flex-col items-center gap-1.5 border-l border-white/10 px-2">
          <Truck className="h-5 w-5 text-primary" />
          Nationwide delivery
        </li>
        <li className="flex flex-col items-center gap-1.5 border-l border-white/10 px-2">
          <Gift className="h-5 w-5 text-primary" />
          Free gift over {formatNaira(GIFT_THRESHOLD)}
        </li>
      </ul>
    </section>
  );
}

/** Swipeable, one card at a time with the next one peeking. Dots show where you are. */
function ComboSlider({ combos }: { combos: Combo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const step = () => {
    const card = ref.current?.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + 12 : 0; // 12 = gap-3
  };

  const onScroll = () => {
    const el = ref.current;
    const s = step();
    if (!el || !s) return;
    setActive(Math.min(combos.length - 1, Math.max(0, Math.round(el.scrollLeft / s))));
  };

  const goTo = (i: number) => ref.current?.scrollTo({ left: i * step(), behavior: 'smooth' });

  return (
    <div className="force-dark mt-4">
      <div
        ref={ref}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: 'none', scrollPaddingLeft: '1rem' }}
      >
        {combos.map((combo) => (
          <ComboCard key={combo.id ?? combo.slug} combo={combo} />
        ))}
      </div>

      {combos.length > 1 && (
        <div className="mt-2 flex justify-center">
          {combos.map((c, i) => (
            <button
              key={c.id ?? c.slug}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show combo ${i + 1} of ${combos.length}`}
              className="px-1 py-2"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tile sizes and tilt by how many product photos the combo has. */
const TILE_W = { 1: 'w-[56%]', 2: 'w-[44%]', 3: 'w-[36%]' } as const;
const TILT = { 1: [0], 2: [-4, 4], 3: [-5, 0, 5] } as const;

function ComboCard({ combo }: { combo: Combo }) {
  const { percent } = calculateSavings(combo.originalPrice, combo.totalPrice);

  const photos = combo.items
    .map((item) => ({ url: item.images?.[0]?.url, alt: item.name }))
    .filter((p) => !!p.url)
    .slice(0, 3);
  if (photos.length === 0 && combo.heroImage) photos.push({ url: combo.heroImage, alt: combo.name });
  const n = Math.max(1, photos.length) as 1 | 2 | 3;

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className={`block w-[80%] shrink-0 snap-start overflow-hidden rounded-3xl border border-primary/25 bg-white/[0.04] active:opacity-90 ${FOCUS}`}
    >
      <div className="relative flex h-44 items-center justify-center bg-gradient-to-b from-[#1b1a14] to-[#0e0e0e]">
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl" />

        <div className="relative flex w-full items-center justify-center px-4">
          {photos.map((p, i) => (
            <div
              key={i}
              className={`aspect-square overflow-hidden rounded-2xl bg-neutral-100 shadow-xl shadow-black/60 ring-1 ring-primary/40 ${TILE_W[n]} ${
                i > 0 ? '-ml-4' : ''
              } ${n === 3 && i === 1 ? 'relative z-10 scale-110' : ''}`}
              style={{ transform: `${n === 3 && i === 1 ? 'scale(1.1) ' : ''}rotate(${TILT[n][i]}deg)` }}
            >
              <img
                src={cldUrl(p.url as string, 'w_320,h_320,c_fill,q_auto,f_auto')}
                alt={p.alt}
                loading="lazy"
                className="h-full w-full object-contain p-1"
              />
            </div>
          ))}
        </div>

        {percent > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-red-600 px-2 py-1 text-[11px] font-black text-white">
            -{percent}%
          </span>
        )}
        {combo.items.length > 1 && (
          <span className="absolute right-2.5 top-2.5 rounded-md bg-primary px-2 py-1 text-[11px] font-black text-black">
            {combo.items.length}-in-1
          </span>
        )}
      </div>

      <div className="space-y-1 p-3.5">
        <p className="line-clamp-1 text-[15px] font-bold text-white">{combo.name}</p>
        {combo.tagline && <p className="line-clamp-1 text-xs text-white/55">{combo.tagline}</p>}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-xl font-black leading-none text-primary">
            {formatNaira(combo.totalPrice)}
          </span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-xs text-white/40 line-through">
              {formatNaira(combo.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────── Quick shop ─────────────────────────── */

interface QuickCategory {
  slug: string;
  name: string;
  icon?: string;
  image?: string;
}

interface MobileQuickShopProps {
  /** The same category list Index.tsx already fetches: whatever you add in admin shows here. */
  categories: QuickCategory[];
  allImage?: string;
}

export function MobileQuickShop({ categories, allImage }: MobileQuickShopProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const tiles: QuickCategory[] = [
    { slug: '', name: 'All', icon: '🔥', image: allImage },
    ...categories,
  ];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <section className="force-dark px-4 pb-4">
      <form
        onSubmit={onSearch}
        className="flex items-center rounded-full border border-white/10 bg-white/[0.05] py-1 pl-4 pr-1 focus-within:border-primary/60"
      >
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, e.g. smart watch"
          aria-label="Search products"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          aria-label="Search"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black active:scale-95 ${FOCUS}`}
        >
          <Search className="h-5 w-5" />
        </button>
      </form>

      <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        {tiles.map((cat) => (
          <Link
            key={cat.slug || 'all'}
            to={cat.slug ? `/products?category=${encodeURIComponent(cat.slug)}` : '/products'}
            className={`flex flex-col items-center gap-1.5 transition-transform active:scale-95 ${FOCUS}`}
          >
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.08] text-3xl">
              {cat.image ? (
                <img
                  src={cldUrl(cat.image, 'w_128,h_128,c_fill,q_auto,f_auto')}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                cat.icon ?? '🛍️'
              )}
            </span>
            <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-white/85">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Deal of the day ───────────────────────── */

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
    <span className="force-dark flex items-center gap-1 text-xs font-bold tabular-nums text-red-300">
      <Clock className="h-3.5 w-3.5" />
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
      className="force-dark flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {combos.map((c) => {
        const { percent } = calculateSavings(c.originalPrice, c.totalPrice);
        return (
          <Link
            key={c.id ?? c.slug}
            to={`/combos/${c.slug}`}
            className="force-dark w-[42%] shrink-0 snap-start overflow-hidden rounded-xl bg-white/[0.06] active:opacity-80"
          >
            <div className="relative aspect-square bg-black/40">
              <img
                src={c.items[0]?.images?.[0]?.url ?? ''}
                alt={c.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {percent > 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                  -{percent}%
                </span>
              )}
              {c.items.length > 1 && (
                <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {c.items.length}-in-1
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="line-clamp-1 text-xs font-medium text-white">{c.name}</p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
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

export function MobileDeals({ featuredCombo, combos }: MobileHeroProps) {
  const deals = orderCombos(featuredCombo, combos, 10);
  if (deals.length === 0) return null;

  return (
    <section className="force-dark px-4 pb-4">
      <div className="rounded-2xl border border-primary/30 bg-white/[0.04] p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Deal of the day</span>
          <DealCountdown />
        </div>
        <DealSlider combos={deals} />
        <Link
          to="/products"
          className="btn-secondary mt-3 flex h-11 items-center justify-center gap-1 text-sm font-semibold"
        >
          View all products
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ───────────────────────── Single products ───────────────────────── */

/** Items with exactly one product in them. Bought on their own, no combo needed. */
export function MobileProducts({ combos }: { combos: Combo[] }) {
  const products = combos.filter((c) => c.isActive !== false && !isCombo(c)).slice(0, 6);
  if (products.length === 0) return null;

  return (
    <section className="force-dark px-4 pb-6">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-black text-white">Shop single products</h2>
        <Link to="/products" className={`py-1 text-sm font-semibold text-primary ${FOCUS}`}>
          See all
        </Link>
      </div>
      <p className="mb-3 mt-0.5 text-sm text-white/55">Not into combos? Buy any product on its own.</p>

      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => {
          const { percent } = calculateSavings(p.originalPrice, p.totalPrice);
          const photo = p.items[0]?.images?.[0]?.url || p.heroImage;
          return (
            <Link
              key={p.id ?? p.slug}
              to={`/combos/${p.slug}`}
              className={`block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:opacity-90 ${FOCUS}`}
            >
              <div className="relative aspect-square bg-neutral-100">
                {photo && (
                  <img
                    src={cldUrl(photo, 'w_360,h_360,c_fill,q_auto,f_auto')}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-contain p-2"
                  />
                )}
                {percent > 0 && (
                  <span className="absolute left-2 top-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-black text-white">
                    -{percent}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-white">
                  {p.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-base font-black text-primary">{formatNaira(p.totalPrice)}</span>
                  {p.originalPrice > p.totalPrice && (
                    <span className="text-[11px] text-white/40 line-through">
                      {formatNaira(p.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        to="/products"
        className={`btn-ghost mt-3 flex h-12 items-center justify-center gap-1 px-4 text-sm font-semibold ${FOCUS}`}
      >
        View all products
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/* ───────────────────────── Become a partner ───────────────────────── */

/** Mirrors sections 1, 5 and 6 of the Partner Program plan. These four really are a sequence, so they are numbered. */
const RESELLER_STEPS = [
  { title: 'Register', text: 'Create your partner account. We review every application.' },
  {
    title: 'Promote',
    text: 'Approved partners get a personal link and ready-made ads to share on WhatsApp, Instagram and TikTok.',
  },
  { title: 'Sell', text: 'Customers order through your link and the sale is credited to you.' },
  { title: 'Earn', text: 'You earn commission on every successful sale, paid every week.' },
] as const;

export function MobileResellerSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="reseller" className="force-dark scroll-mt-20 px-4 py-8">
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-[#1b1a14] to-[#0e0e0e] p-5">
        <h2 className="text-2xl font-black leading-tight text-white">
          Share products, earn 5-10% on every sale.
        </h2>
        <p className="mt-2 text-sm leading-snug text-white/65">
          Share your link from your phone. No stock to buy, and nothing to ship.
        </p>

        <ol className="mt-5 space-y-4">
          {RESELLER_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-bold text-white">{step.title}</p>
                <p className="text-sm leading-snug text-white/60">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-xs leading-snug text-white/45">
          Commission is based on successful sales, not clicks or sign-ups.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`btn-primary mt-4 flex h-14 w-full items-center justify-center gap-2 px-4 text-base font-bold ${FOCUS}`}
        >
          Become a partner
          <ChevronRight className="h-5 w-5" />
        </button>

        <p className="mt-3 text-center text-sm text-white/55">
          Already a partner?{' '}
          <Link to="/partner" className="font-semibold text-primary underline">
            Log in
          </Link>
        </p>
      </div>

      <ResellerSignupModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
