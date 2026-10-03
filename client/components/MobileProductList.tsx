/**
 * MobileProductList — Jiji-style listing for phones.
 * Section title + grid/list toggle, 2-column image-led cards, or
 * horizontal rows in list view. Mobile only: render it below 768px, e.g.
 *
 *   const isMobile = useMobileLayout();
 *   {isMobile ? <MobileProductList combos={combos} title="Trending" /> : <YourDesktopGrid />}
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LayoutGrid, List, Loader2 } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';
import { cldUrl } from '@/lib/cloudinary';

interface Props {
  combos: Combo[];
  title?: string;
  isLoading?: boolean;
  categories?: { slug: string; name: string; icon?: string; image?: string }[];
  /** null = "All" */
  activeCategory?: string | null;
  onCategoryChange?: (slug: string | null) => void;
}

function metaLine(combo: Combo) {
  const parts = [combo.items.length > 1 ? `${combo.items.length}-in-1 combo` : 'Single item'];
  if (combo.stockLeft > 0 && combo.stockLeft <= 10) parts.push(`Only ${combo.stockLeft} left`);
  else parts.push('Free delivery');
  return parts.join(' • ');
}

function Card({ combo, row }: { combo: Combo; row: boolean }) {
  const { percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
  const outOfStock = combo.stockLeft === 0;
  const img = combo.items[0]?.images?.[0]?.url ?? '';

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className={`block overflow-hidden rounded-xl bg-white/[0.04] active:opacity-80 ${
        row ? 'flex' : ''
      }`}
    >
      <div
        className={`relative bg-black/40 shrink-0 ${
          row ? 'w-32 h-32' : 'w-full aspect-[4/5]'
        }`}
      >
        <img src={img} alt={combo.name} loading="lazy" className="w-full h-full object-cover" />
        {percent > 0 && (
          <span className="absolute top-1.5 left-1.5 text-[11px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">
            -{percent}%
          </span>
        )}
        {combo.badge && (
          <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-primary">
            {combo.badge}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-sm font-bold text-white">
            Out of stock
          </div>
        )}
      </div>

      <div className="p-2.5 min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[15px] font-black text-primary leading-none">
            {formatNaira(combo.totalPrice)}
          </span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-[11px] text-white/40 line-through">
              {formatNaira(combo.originalPrice)}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-[13px] font-medium text-white leading-snug line-clamp-2">
          {combo.name}
        </h3>
        <p className="mt-1 text-[11px] text-white/45 line-clamp-1">{metaLine(combo)}</p>
      </div>
    </Link>
  );
}

export function MobileProductList({
  combos,
  title = 'Trending',
  isLoading = false,
  categories = [],
  activeCategory = null,
  onCategoryChange,
}: Props) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="px-3 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <button
          type="button"
          onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
          aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/80 active:bg-white/10"
        >
          {view === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>
      </div>

      {categories.length > 0 && onCategoryChange && (() => {
        const all = [{ slug: null as string | null, name: 'All', icon: '🔥', image: '' }, ...categories];
        const LIMIT = 8; // two rows of four; the rest sit behind "More"
        const needsMore = all.length > LIMIT;
        const shown = needsMore && !expanded ? all.slice(0, LIMIT - 1) : all;
        const tile = 'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl overflow-hidden';
        return (
          <div className="grid grid-cols-4 gap-x-2 gap-y-3 mb-4">
            {shown.map((cat) => {
              const active = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug ?? 'all'}
                  type="button"
                  onClick={() => onCategoryChange(cat.slug)}
                  aria-pressed={active}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className={`${tile} ${active ? 'bg-primary/20 ring-2 ring-primary' : 'bg-white/[0.06]'}`}>
                    {cat.image ? (
                      <img
                        src={cldUrl(cat.image, 'w_128,h_128,c_fill,q_auto,f_auto')}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      cat.icon || '🛍️'
                    )}
                  </span>
                  <span
                    className={`text-xs text-center leading-tight line-clamp-2 ${
                      active ? 'text-primary font-semibold' : 'text-white/80'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
            {needsMore && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className={`${tile} bg-white/[0.06]`}>
                  <ChevronDown
                    className={`w-7 h-7 text-white/70 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </span>
                <span className="text-xs text-white/80">{expanded ? 'Less' : 'More'}</span>
              </button>
            )}
          </div>
        );
      })()}

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : combos.length === 0 ? (
        <p className="py-16 text-center text-sm text-white/50">Nothing here yet.</p>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2.5'}>
          {combos.map((c) => (
            <Card key={c.id ?? c.slug} combo={c} row={view === 'list'} />
          ))}
        </div>
      )}
    </section>
  );
}