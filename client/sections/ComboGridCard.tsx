/**
 * ComboGridCard.
 * Desktop/tablet (>= 768px): unchanged original card.
 * Mobile (< 768px): compact card for a 2-column grid
 *   <div className="grid grid-cols-2 gap-2.5 px-3">
 * with price anchor, "Save" pill, stock bar and optional WhatsApp order.
 *
 * `whatsappNumber` is optional (digits only, e.g. "2348012345678"), mobile only.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';
import { useMobileLayout } from '@/hooks/useMobileLayout';


interface Props {
  combo: Combo;
  rotateMs?: number;
  whatsappNumber?: string;
}

export function ComboGridCard(props: Props) {
  const isMobile = useMobileLayout();
  return isMobile ? <MobileCard {...props} /> : <DesktopCard {...props} />;
}

/* ───────────────────────── MOBILE ───────────────────────── */

/** Stock bar is full at this many units. */
const STOCK_BAR_MAX = 20;

function MobileCard({ combo, rotateMs = 2500, whatsappNumber }: Props) {
  const items = combo.items.slice(0, 4);
  const [idx, setIdx] = useState(0);
  const isRealCombo = combo.items.length > 1;

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIdx((p) => (p + 1) % items.length), rotateMs);
    return () => clearInterval(id);
  }, [items.length, rotateMs]);

  const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
  const outOfStock = combo.stockLeft === 0;
  const lowStock = combo.stockLeft > 0 && combo.stockLeft <= 10;
  const stockPct = Math.min(100, (combo.stockLeft / STOCK_BAR_MAX) * 100);

  const openWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = encodeURIComponent(`Hi, I want to order: ${combo.name}`);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank', 'noopener');
  };

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] active:scale-[0.98] transition-transform"
    >
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

        {percent > 0 && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[11px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">
            -{percent}%
          </span>
        )}

        {isRealCombo && (
          <span className="absolute bottom-1.5 left-1.5 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-black">
            {combo.items.length} items
          </span>
        )}

        {items.length > 1 && (
          <div className="absolute bottom-2 right-1.5 z-10 flex gap-1">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === idx ? 'w-3 bg-primary' : 'w-1 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
            <span className="text-sm font-bold text-white">Out of stock</span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-2.5 gap-1.5">
        <h3 className="text-[13px] font-semibold text-white leading-snug line-clamp-2">
          {combo.name}
        </h3>

        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-base font-black text-primary leading-none">
            {formatNaira(combo.totalPrice)}
          </span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-[11px] text-white/40 line-through">
              {formatNaira(combo.originalPrice)}
            </span>
          )}
        </div>

        {saving > 0 && (
          <p className="self-start text-[11px] font-bold text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded">
            Save {formatNaira(saving)}
          </p>
        )}

        {lowStock && (
          <div>
            <p className="text-[11px] font-semibold text-red-300 mb-1">
              Only {combo.stockLeft} left
            </p>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
        )}

        {whatsappNumber && !outOfStock && (
          <button
            type="button"
            onClick={openWhatsApp}
            className="mt-auto flex items-center justify-center gap-1.5 text-xs font-bold h-10 rounded-lg border border-emerald-400/40 text-emerald-300 active:bg-emerald-400/10"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp order
          </button>
        )}
      </div>
    </Link>
  );
}

/* ─────────────── DESKTOP / TABLET (original, unchanged) ─────────────── */

function DesktopCard({ combo, rotateMs = 2500 }: Props) {
  const items = combo.items.slice(0, 4);
  const [idx, setIdx] = useState(0);
  const manualPauseUntil = useRef(0);
  const isRealCombo = combo.items.length > 1;

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

  const itemCountLabel = isRealCombo ? `${combo.items.length}-IN-1 COMBO` : null;
  const showLowStock = combo.stockLeft > 0 && combo.stockLeft <= 10;

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className="group block rounded-2xl overflow-hidden border border-white/10 hover:border-primary/40 transition-colors"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
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

        {itemCountLabel && (
          <span
            className="absolute top-2 left-2 text-[9px] font-black px-2 py-1 rounded-md tracking-wider z-10"
            style={{ background: 'rgba(255,215,0,0.95)', color: '#000' }}
          >
            {itemCountLabel}
          </span>
        )}

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

      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1 min-h-[34px]">
          {combo.name}
        </h3>
        <p className="text-[10px] text-white/40 line-clamp-1 mb-2">
          {isRealCombo && heroName ? `Now showing: ${heroName}` : combo.tagline}
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
          <p className="text-[10px] text-emerald-400 font-bold">
            💰 Save {formatNaira(saving)}
          </p>
        )}

        {combo.stockLeft === 0 && (
          <p className="text-[10px] text-red-400 font-bold mt-1">Out of stock</p>
        )}
      </div>

      {showLowStock && (
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
    </Link>
  );
}