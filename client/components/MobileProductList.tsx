/**
 * MobileProductList — product listing for phones (SC-UI redesign).
 * Title + item count, grid/list switch, category tiles, then 2-column image-led cards (or rows in list view).
 * Same props and same links as before: only the look changed. Render it below 768px, e.g.
 *
 *   const isMobile = useMobileLayout();
 *   {isMobile ? <MobileProductList combos={combos} title="Trending" /> : <YourDesktopGrid />}
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Flame, LayoutGrid, Layers, List, Loader2, Truck } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';
import { cldUrl } from '@/lib/cloudinary';
import { useSettings } from '@/contexts/SettingsContext';

interface Props {
  combos: Combo[];
  title?: string;
  isLoading?: boolean;
  categories?: { slug: string; name: string; icon?: string; image?: string }[];
  /** null = "All" */
  activeCategory?: string | null;
  onCategoryChange?: (slug: string | null) => void;
}

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/70';
const chip = 'inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-[3px] text-[11px] font-semibold text-white/65';

function Card({ combo, row }: { combo: Combo; row: boolean }) {
  const { percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
  const save = Math.max(0, combo.originalPrice - combo.totalPrice);
  const outOfStock = combo.stockLeft === 0;
  const low = combo.stockLeft > 0 && combo.stockLeft <= 10;
  const img = combo.items[0]?.images?.[0]?.url ?? '';
  const count = combo.items.length;

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className={`group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] motion-safe:transition-transform active:scale-[0.985] ${FOCUS} ${row ? 'flex' : ''}`}
    >
      <div className={`relative bg-black/40 shrink-0 overflow-hidden ${row ? 'w-[132px] self-stretch min-h-[132px]' : 'w-full aspect-[4/5]'}`}>
        <img src={img} alt={combo.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
        {percent > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-[3px] text-[11px] font-black leading-none text-white shadow">
            -{percent}%
          </span>
        )}
        {combo.badge && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/70 px-2 py-[3px] text-[10.5px] font-bold text-primary backdrop-blur-sm">
            {combo.badge}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-black/70">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-bold text-white">Out of stock</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[17px] font-black text-primary leading-none tabular-nums">{formatNaira(combo.totalPrice)}</span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-[11.5px] text-white/40 line-through tabular-nums">{formatNaira(combo.originalPrice)}</span>
          )}
        </div>
        {save > 0 && <p className="mt-1 text-[12px] font-bold text-emerald-300 tabular-nums">You save {formatNaira(save)}</p>}
        <h3 className="mt-1.5 text-[13.5px] font-semibold text-white leading-snug line-clamp-2">{combo.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={chip}><Layers className="w-3 h-3" aria-hidden />{count > 1 ? `${count}-in-1 combo` : 'Single item'}</span>
          {low ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-[3px] text-[11px] font-bold text-orange-300">
              <Flame className="w-3 h-3" aria-hidden />Only {combo.stockLeft} left
            </span>
          ) : !outOfStock ? (
            <span className={chip}><Truck className="w-3 h-3" aria-hidden />Nationwide</span>
          ) : null}
        </div>
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
  const { settings } = useSettings();

  const seg = (on: boolean) =>
    `w-10 h-10 rounded-lg grid place-items-center motion-safe:transition-colors ${FOCUS} ${on ? 'bg-primary text-black' : 'text-white/65'}`;

  return (
    <section className="px-3 py-3">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-[22px] leading-tight font-black text-white">{title}</h2>
          {!isLoading && combos.length > 0 && <p className="text-[12.5px] text-white/50 mt-0.5">{combos.length} {combos.length === 1 ? 'item' : 'items'}</p>}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Layout">
          <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Grid view" className={seg(view === 'grid')}><LayoutGrid className="w-[18px] h-[18px]" /></button>
          <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="List view" className={seg(view === 'list')}><List className="w-[18px] h-[18px]" /></button>
        </div>
      </div>

      {categories.length > 0 && onCategoryChange && (() => {
        const all = [{ slug: null as string | null, name: 'All', icon: '🔥', image: settings?.allCategoryImage ?? '' }, ...categories];
        const LIMIT = 8; // two rows of four; the rest sit behind "More"
        const needsMore = all.length > LIMIT;
        const shown = needsMore && !expanded ? all.slice(0, LIMIT - 1) : all;
        const tile = 'w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl overflow-hidden motion-safe:transition-colors';
        return (
          <div className="grid grid-cols-4 gap-x-2 gap-y-3 mb-5">
            {shown.map((cat) => {
              const active = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug ?? 'all'}
                  type="button"
                  onClick={() => onCategoryChange(cat.slug)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl active:scale-95 motion-safe:transition-transform ${FOCUS}`}
                >
                  <span className={`${tile} ${active ? 'bg-primary/20 ring-2 ring-primary' : 'bg-white/[0.06] border border-white/10'}`}>
                    {cat.image ? (
                      <img src={cldUrl(cat.image, 'w_128,h_128,c_fill,q_auto,f_auto')} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      cat.icon || '🛍️'
                    )}
                  </span>
                  <span className={`text-xs text-center leading-tight line-clamp-2 ${active ? 'text-primary font-bold' : 'text-white/75 font-medium'}`}>{cat.name}</span>
                </button>
              );
            })}
            {needsMore && (
              <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}
                className={`flex flex-col items-center gap-1.5 rounded-2xl active:scale-95 motion-safe:transition-transform ${FOCUS}`}>
                <span className={`${tile} bg-white/[0.06] border border-white/10`}>
                  <ChevronDown className={`w-7 h-7 text-white/70 motion-safe:transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </span>
                <span className="text-xs font-medium text-white/75">{expanded ? 'Less' : 'More'}</span>
              </button>
            )}
          </div>
        );
      })()}

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : combos.length === 0 ? (
        <p className="py-16 text-center text-sm text-white/50">Nothing here yet.</p>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
          {combos.map((c) => <Card key={c.id ?? c.slug} combo={c} row={view === 'list'} />)}
        </div>
      )}
    </section>
  );
}
