/**
 * FeaturedComboCard — bigger, premium-looking combo card.
 *
 * Used in the "🔥 Featured" homepage section. Spans full width.
 * Desktop/tablet (>= 768px): original layout, unchanged (image left, text right).
 * Mobile (< 768px): compact card so the price and button are visible
 * without scrolling.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Sparkles, Zap } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';
import { useMobileLayout } from '@/hooks/useMobileLayout';

interface Props {
  combo: Combo;
  rotateMs?: number;
}

export function FeaturedComboCard(props: Props) {
  const isMobile = useMobileLayout();
  return isMobile ? <MobileFeatured {...props} /> : <DesktopFeatured {...props} />;
}

/* ───────────────────────── MOBILE ───────────────────────── */

function MobileFeatured({ combo, rotateMs = 2800 }: Props) {
  const items = combo.items.slice(0, 4);
  const [idx, setIdx] = useState(0);
  const manualPauseUntil = useRef(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < manualPauseUntil.current) return;
      setIdx((p) => (p + 1) % items.length);
    }, rotateMs);
    return () => clearInterval(id);
  }, [items.length, rotateMs]);

  const setManual = (i: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    manualPauseUntil.current = Date.now() + 6000;
    setIdx(i);
  };

  const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
  const heroName = items[idx]?.name ?? '';
  const lowStock = combo.stockLeft > 0 && combo.stockLeft <= 10;

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className="block rounded-2xl overflow-hidden border border-primary/30 active:opacity-90"
      style={{
        background: 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,140,0,0.02))',
      }}
    >
      {/* Image: shorter than square so the price stays on screen */}
      <div className="relative w-full aspect-[4/3] bg-black/30 overflow-hidden">
        {items.map((item, i) => (
          <img
            key={item.id + i}
            src={item.images?.[0]?.url ?? ''}
            alt={item.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

        <span
          className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md z-10"
          style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)', color: '#000' }}
        >
          <Sparkles className="w-3 h-3" />
          Featured
        </span>

        {percent > 0 && (
          <span className="absolute top-2.5 right-2.5 text-xs font-black px-2.5 py-1 rounded-md z-10 bg-red-600 text-white">
            -{percent}% OFF
          </span>
        )}

        {/* Thumbnails double as the slide indicator */}
        {items.length > 1 && (
          <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 z-10">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => setManual(i, e)}
                aria-label={item.name}
                className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all ${
                  i === idx ? 'ring-2 ring-primary' : 'ring-1 ring-white/30 opacity-70'
                }`}
              >
                <img
                  src={item.images?.[0]?.url ?? ''}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {heroName && (
          <span className="absolute bottom-3 right-2.5 max-w-[38%] truncate text-[11px] font-semibold text-white bg-black/60 px-2 py-1 rounded-md z-10">
            {heroName}
          </span>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded tracking-wider"
            style={{ background: 'rgba(255,215,0,0.18)', color: '#FFD700' }}
          >
            {combo.items.length >= 2 ? `${combo.items.length}-IN-1 COMBO` : 'COMBO'}
          </span>
          {/* Admin badge text can be a full sentence: keep it to one line */}
          {combo.badge && (
            <span className="truncate text-[11px] font-semibold text-primary/80" title={combo.badge}>
              {combo.badge}
            </span>
          )}
        </div>

        <h2 className="text-lg font-black text-white leading-tight line-clamp-2">{combo.name}</h2>
        {combo.tagline && <p className="text-[13px] text-white/55 line-clamp-1">{combo.tagline}</p>}

        <div className="flex items-baseline gap-2 flex-wrap pt-1">
          <span className="text-2xl font-black text-primary leading-none">
            {formatNaira(combo.totalPrice)}
          </span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-xs text-white/35 line-through">
              {formatNaira(combo.originalPrice)}
            </span>
          )}
          {saving > 0 && (
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded">
              Save {formatNaira(saving)}
            </span>
          )}
        </div>

        {lowStock && (
          <p className="text-xs font-semibold text-red-300">Only {combo.stockLeft} left in stock</p>
        )}

        <div className="btn-primary flex items-center justify-center gap-1.5 h-12 text-sm font-bold">
          View & Customize
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

/* ─────────────── DESKTOP / TABLET (original, unchanged) ─────────────── */

function DesktopFeatured({ combo, rotateMs = 2800 }: Props) {
  const items = combo.items.slice(0, 4);
  const [idx, setIdx] = useState(0);
  const manualPauseUntil = useRef(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < manualPauseUntil.current) return;
      setIdx((p) => (p + 1) % items.length);
    }, rotateMs);
    return () => clearInterval(id);
  }, [items.length, rotateMs]);

  const setManual = (i: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    manualPauseUntil.current = Date.now() + 6000;
    setIdx(i);
  };

  const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
  const heroName = items[idx]?.name ?? '';

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className="group block rounded-3xl overflow-hidden border border-primary/30 hover:border-primary/60 transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,140,0,0.02))',
      }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image side */}
        <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto md:min-h-[380px] bg-black/30 overflow-hidden">
          {items.map((item, i) => (
            <img
              key={item.id + i}
              src={item.images?.[0]?.url ?? ''}
              alt={item.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: i === idx ? 1 : 0 }}
            />
          ))}

          <span
            className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md z-10"
            style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)', color: '#000' }}
          >
            <Sparkles className="w-3 h-3" />
            Featured
          </span>

          {combo.badge && (
            <span
              className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1.5 rounded-full backdrop-blur-sm border border-primary/40 text-primary z-10"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              {combo.badge}
            </span>
          )}

          {percent > 0 && (
            <span
              className="absolute bottom-3 left-3 text-xs font-black px-3 py-1.5 rounded-md z-10"
              style={{ background: '#dc2626', color: '#fff' }}
            >
              -{percent}% OFF
            </span>
          )}

          {items.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === idx ? 'w-6 h-1 bg-primary' : 'w-1.5 h-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text side */}
        <div className="flex-1 p-5 md:p-7 flex flex-col justify-between">
          <div>
            <span
              className="inline-block text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider mb-3"
              style={{ background: 'rgba(255,215,0,0.18)', color: '#FFD700' }}
            >
              {combo.items.length >= 2 ? `${combo.items.length}-IN-1 COMBO` : 'COMBO'}
            </span>

            <h2 className="text-xl md:text-3xl font-black text-white mb-2 leading-tight">
              {combo.name}
            </h2>
            <p className="text-sm text-white/55 mb-4 leading-relaxed">{combo.tagline}</p>

            <div className="flex gap-2 mb-5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => setManual(i, e)}
                  title={item.name}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                    i === idx
                      ? 'ring-2 ring-primary scale-110'
                      : 'ring-1 ring-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={item.images?.[0]?.url ?? ''}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            {heroName && (
              <p className="text-[11px] text-white/40 mb-2">
                Now showing: <span className="text-white/70 font-semibold">{heroName}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl md:text-4xl font-black text-primary leading-none">
                {formatNaira(combo.totalPrice)}
              </span>
              {combo.originalPrice > combo.totalPrice && (
                <span className="text-sm text-white/35 line-through">
                  {formatNaira(combo.originalPrice)}
                </span>
              )}
            </div>

            {saving > 0 && (
              <p className="text-xs text-emerald-400 font-bold mb-3">
                💰 Save {formatNaira(saving)} ({percent}% OFF)
              </p>
            )}

            {combo.stockLeft > 0 && combo.stockLeft <= 10 && (
              <p className="text-xs text-amber-400 flex items-center gap-1 mb-3">
                <Zap className="w-3 h-3" />
                Only {combo.stockLeft} left in stock
              </p>
            )}

            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary group-hover:gap-3 transition-all">
              View & Customize
              <span aria-hidden>→</span>
            </div>

            <p className="text-[10px] text-white/30 mt-4 flex items-center gap-1.5">
              <Check className="w-3 h-3 text-primary/60" />
              Free nationwide delivery · 14-day returns
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}