/**
 * ComboGridCard — Temu-style compact combo card.
 *
 * Designed for Nigerian mobile shoppers: clear, dense, image-led.
 * Auto-rotates through the combo items + tappable thumbnail strip.
 * Whole card links to /combos/:slug for full customization.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';

interface Props {
  combo: Combo;
  rotateMs?: number;
}

export function ComboGridCard({ combo, rotateMs = 2500 }: Props) {
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

  const itemCountLabel =
    combo.items.length >= 2 ? `${combo.items.length}-IN-1 COMBO` : 'COMBO';

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className="group block rounded-2xl overflow-hidden border border-white/10 hover:border-primary/40 transition-colors"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Hero image area */}
      <div className="relative w-full aspect-square bg-black/40 overflow-hidden">
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

        {combo.badge && (
          <span
            className="absolute top-2 right-2 text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm border border-primary/40 text-primary z-10"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            {combo.badge}
          </span>
        )}

        <span
          className="absolute top-2 left-2 text-[9px] font-black px-2 py-1 rounded-md tracking-wider z-10"
          style={{ background: 'rgba(255,215,0,0.95)', color: '#000' }}
        >
          {itemCountLabel}
        </span>

        {percent > 0 && (
          <span
            className="absolute bottom-2 left-2 text-[10px] font-black px-2 py-1 rounded-md z-10"
            style={{ background: '#dc2626', color: '#fff' }}
          >
            -{percent}%
          </span>
        )}

        {items.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {items.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === idx ? 'w-4 h-[3px] bg-primary' : 'w-[4px] h-[4px] bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="px-2.5 pt-2 flex gap-1.5 justify-center">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => setManual(i, e)}
              title={item.name}
              className={`relative w-9 h-9 rounded-md overflow-hidden flex-shrink-0 transition-all ${
                i === idx
                  ? 'ring-2 ring-primary'
                  : 'ring-1 ring-white/15 opacity-70 hover:opacity-100'
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
      )}

      {/* Text */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1 min-h-[34px]">
          {combo.name}
        </h3>
        <p className="text-[10px] text-white/40 line-clamp-1 mb-2">
          {heroName ? `Now showing: ${heroName}` : combo.tagline}
        </p>

        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-lg font-black text-primary leading-none">
            {formatNaira(combo.totalPrice)}
          </span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-[11px] text-white/35 line-through">
              {formatNaira(combo.originalPrice)}
            </span>
          )}
        </div>

        {saving > 0 && (
          <p className="text-[10px] text-emerald-400 font-bold mb-2">
            💰 Save {formatNaira(saving)}
          </p>
        )}

        {combo.stockLeft > 0 && combo.stockLeft <= 10 && (
          <p className="text-[10px] text-amber-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Only {combo.stockLeft} left
          </p>
        )}
        {combo.stockLeft === 0 && (
          <p className="text-[10px] text-red-400 font-bold">Out of stock</p>
        )}
      </div>
            {combo.stockLeft > 0 && combo.stockLeft <= 10 && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
              </span>
              <span className="text-red-400">Only {combo.stockLeft} left in stock</span>
            </div>
          </div>
        )}
        {/* STOCK_URGENCY_BOOSTED */}
      </Link>
  );
}
