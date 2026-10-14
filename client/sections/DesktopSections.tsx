/**
 * Desktop home sections (tablets and computers). Index.tsx renders these when
 * useMobileLayout() is false. They bring the desktop page level with the phone page.
 *
 *  <DesktopCategoryStrip />   category tiles, right under the hero
 *  <DesktopDeals />           "Deal of the day" row: featured first, then your latest items
 *  <DesktopProducts />        single products (one item), bought on their own
 *  <DesktopPartnerSection />  "Become a partner" block + sign-up popup
 *
 * Nothing here is used on phones, so the phone page is untouched.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { cldUrl } from '@/lib/cloudinary';
import { ComboGridCard } from '@/sections/ComboGridCard';
import { ResellerSignupModal } from '@/components/shared/ResellerSignupModal';

/* ───────────────────────── Categories ───────────────────────── */

interface QuickCategory {
  slug: string;
  name: string;
  icon?: string;
  image?: string;
}

export function DesktopCategoryStrip({
  categories,
  allImage,
}: {
  categories: QuickCategory[];
  allImage?: string;
}) {
  const tiles: QuickCategory[] = [
    { slug: '', name: 'All', icon: '🔥', image: allImage },
    ...categories,
  ];


  return (
    <section className="section-padding py-10">
      <div className="container-premium">
        <div className="mb-6 text-center">
          <div>
            <h2 className="text-2xl font-black text-white">Shop by category</h2>
            <p className="mt-1 text-sm text-white/55">Pick a category to see what's inside.</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {tiles.map((cat) => (
            <Link
              key={cat.slug || 'all'}
              to={cat.slug ? `/categories/${cat.slug}` : '/products'}
              className="group flex w-36 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.06]"
            >
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.08] text-4xl">
                {cat.image ? (
                  <img
                    src={cldUrl(cat.image, 'w_160,h_160,c_fill,q_auto,f_auto')}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  cat.icon ?? '🛍️'
                )}
              </span>
              <span className="line-clamp-2 text-center text-sm font-medium leading-tight text-white/85 group-hover:text-white">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Deal of the day ───────────────────────── */

/**
 * Featured combo first, then the rest (no duplicates, active only).
 * No countdown here on purpose: a timer that resets at midnight would be a fake deadline.
 */
export function DesktopDeals({
  featuredCombo,
  combos,
}: {
  featuredCombo: Combo | null;
  combos: Combo[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const deals = [featuredCombo, ...combos]
    .filter((c): c is Combo => !!c && c.isActive !== false)
    .filter((c, i, arr) => arr.findIndex((x) => (x.id ?? x.slug) === (c.id ?? c.slug)) === i)
    .slice(0, 10);
  if (deals.length === 0) return null;

  const scrollBy = (dir: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="section-padding py-10 md:py-14">
      <div className="container-premium">
        <div className="mb-5 flex items-end justify-between md:mb-7">
          <div>
            <h2 className="text-lg font-black text-white md:text-2xl">Deal of the day</h2>
            <p className="mt-1 text-sm text-white/55">Hand-picked combos and products at their best price.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-primary/60 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-primary/60 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={rowRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {deals.map((c) => (
            <div key={c.id ?? c.slug} className="w-[260px] shrink-0 snap-start lg:w-[calc(25%-15px)]">
              <ComboGridCard combo={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Single products ───────────────────────── */

/** Items with exactly one product in them. Bought on their own, no combo needed. */
export function DesktopProducts({ combos }: { combos: Combo[] }) {
  const products = combos.filter((c) => c.isActive !== false && c.items.length <= 1).slice(0, 8);
  if (products.length === 0) return null;

  return (
    <section className="section-padding py-10 md:py-14">
      <div className="container-premium">
        <div className="mb-5 flex items-end justify-between md:mb-7">
          <div>
            <h2 className="text-lg font-black text-white md:text-2xl">Shop single products</h2>
            <p className="mt-1 text-sm text-white/55">Not into combos? Buy any product on its own.</p>
          </div>
          <Link
            to="/products"
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {products.map((p) => (
            <ComboGridCard key={p.id ?? p.slug} combo={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Become a partner ───────────────────────── */

const STEPS = [
  { title: 'Register', text: 'Create your partner account. We review every application.' },
  {
    title: 'Promote',
    text: 'Approved partners get a personal link and ready-made ads to share on WhatsApp, Instagram and TikTok.',
  },
  { title: 'Sell', text: 'Customers order through your link and the sale is credited to you.' },
  { title: 'Earn', text: 'You earn commission on every successful sale, paid every week.' },
] as const;

export function DesktopPartnerSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="reseller" className="section-padding scroll-mt-24 py-10 md:py-14">
      <div className="container-premium">
        <div className="grid gap-10 rounded-3xl border border-primary/30 bg-gradient-to-br from-[#1b1a14] to-[#0e0e0e] p-8 lg:grid-cols-[1fr_1.1fr] lg:p-12">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Partner program</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-white lg:text-4xl">
              Share products, earn 5-10% on every sale.
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/65">
              Share your link from your phone. No stock to buy, and nothing to ship.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn-primary flex h-12 items-center gap-2 px-6 text-base font-bold"
              >
                Become a partner
                <ChevronRight className="h-5 w-5" />
              </button>
              <p className="text-sm text-white/55">
                Already a partner?{' '}
                <Link to="/partner" className="font-semibold text-primary underline">
                  Log in
                </Link>
              </p>
            </div>
            <p className="mt-5 text-xs text-white/45">
              Commission is based on successful sales, not clicks or sign-ups.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-black">
                  {i + 1}
                </span>
                <p className="mt-3 text-base font-bold text-white">{step.title}</p>
                <p className="mt-1 text-sm leading-snug text-white/60">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ResellerSignupModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
