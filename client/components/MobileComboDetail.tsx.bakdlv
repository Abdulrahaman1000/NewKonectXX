/**
 * MobileComboDetail — mobile e-commerce product page.
 *
 * Top to bottom: swipeable gallery (counter + thumbnails) -> name & price ->
 * your variant/colour pickers (slot) -> delivery/returns trust row ->
 * description -> what's in the combo -> sticky Add to cart bar.
 *
 * Your logic stays yours:
 *  - `customizer`: your existing VariantPicker / ColorPicker UI.
 *  - `onOrder`:    your add-to-cart handler (defaults to a WhatsApp order).
 *  - `photos`:     pass from getDisplayed() so the gallery follows variants.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import type { Combo } from '@/types/combo';
import { calculateSavings, formatNaira } from '@/lib/format';

interface Props {
  combo: Combo;
  whatsappLink: string;
  photos?: { url: string; label: string }[];
  description?: string;
  onOrder?: () => void;
  ctaLabel?: string;
  onOpenCart?: () => void;
  customizer?: ReactNode;
}

/** Stock bar is full at this many units. */
const STOCK_BAR_MAX = 20;

export function MobileComboDetail({
  combo,
  whatsappLink,
  photos: photosProp,
  description,
  onOrder,
  ctaLabel = 'Add to cart',
  onOpenCart,
  customizer,
}: Props) {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const photos =
    photosProp ??
    combo.items.flatMap((it) => (it.images ?? []).map((im) => ({ url: im.url, label: it.name })));

  // Back to the first photo when the photo set changes (e.g. a variant is picked)
  const photoSig = photos.map((p) => p.url).join('|');
  useEffect(() => {
    scroller.current?.scrollTo({ left: 0 });
    setSlide(0);
  }, [photoSig]);

  const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);
  const outOfStock = combo.stockLeft === 0;
  const lowStock = combo.stockLeft > 0 && combo.stockLeft <= 10;
  const stockPct = Math.min(100, (combo.stockLeft / STOCK_BAR_MAX) * 100);

  const waUrl = (text: string) =>
    `${whatsappLink}${whatsappLink.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`;
  const openWhatsApp = () =>
    window.open(waUrl(`Hi, I want to order: ${combo.name}`), '_blank', 'noopener');

  const onScroll = () => {
    const el = scroller.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goToSlide = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const addToCart = () => (onOrder ? onOrder() : openWhatsApp());

  return (
    <div className="bg-background min-h-screen pb-28">
      {/* Gallery */}
      <div className="relative bg-black">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {(photos.length ? photos : [{ url: '', label: combo.name }]).map((p, i) => (
            <img
              key={i}
              src={p.url}
              alt={p.label}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="w-full shrink-0 snap-center aspect-square object-cover"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="absolute top-3 left-3 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Open cart"
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        )}

        {percent > 0 && (
          <span className="absolute bottom-2.5 left-2.5 text-xs font-black px-2 py-1 rounded-md bg-red-600 text-white">
            -{percent}%
          </span>
        )}
        {photos.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 text-xs font-semibold text-white bg-black/70 px-2 py-1 rounded-md">
            {slide + 1}/{photos.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto px-3 pt-2.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToSlide(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden ${
                i === slide ? 'ring-2 ring-primary' : 'ring-1 ring-white/15 opacity-70'
              }`}
            >
              <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pt-3 space-y-2.5">
        {/* Name & price */}
        <div className="rounded-xl bg-white/[0.04] p-3.5">
          {combo.badge && (
            <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25 mb-2">
              {combo.badge}
            </span>
          )}
          <h1 className="text-lg font-bold text-white leading-snug">{combo.name}</h1>
          {combo.tagline && <p className="mt-1 text-sm text-white/50">{combo.tagline}</p>}

          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-black text-primary">{formatNaira(combo.totalPrice)}</span>
            {combo.originalPrice > combo.totalPrice && (
              <span className="text-sm text-white/40 line-through">
                {formatNaira(combo.originalPrice)}
              </span>
            )}
          </div>
          {saving > 0 && (
            <p className="mt-2 inline-block text-xs font-bold text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded">
              You save {formatNaira(saving)} ({percent}% off)
            </p>
          )}

          {lowStock && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-red-300 mb-1">
                Only {combo.stockLeft} left, selling fast
              </p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                  style={{ width: `${stockPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Your variant / colour pickers */}
        {customizer && <div className="rounded-xl bg-white/[0.04] p-3.5">{customizer}</div>}

        {/* Delivery & returns */}
        <div className="rounded-xl bg-white/[0.04] py-3.5 grid grid-cols-3 text-center text-xs text-white/75">
          {[
            { Icon: Truck, label: 'Free delivery', sub: 'Nationwide' },
            { Icon: RotateCcw, label: '14-day returns', sub: 'Easy & free' },
            { Icon: ShieldCheck, label: '1-year warranty', sub: 'Included' },
          ].map(({ Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-1">
              <Icon className="w-6 h-6 text-primary" />
              <span className="font-semibold text-white/90">{label}</span>
              <span className="text-white/45">{sub}</span>
            </div>
          ))}
        </div>

        {description && (
          <div className="rounded-xl bg-white/[0.04] p-3.5">
            <h2 className="text-[15px] font-bold text-white mb-1.5">Description</h2>
            <p className="text-sm text-white/65 leading-relaxed">{description}</p>
          </div>
        )}

        {/* What's in the combo */}
        {combo.items.length > 1 && (
          <div className="rounded-xl bg-white/[0.04] p-3.5">
            <h2 className="text-[15px] font-bold text-white mb-2.5 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              What's in this combo ({combo.items.length})
            </h2>
            <ul className="space-y-2.5">
              {combo.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  <img
                    src={it.images?.[0]?.url ?? ''}
                    alt={it.name}
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover bg-black/40"
                  />
                  <span className="text-sm text-white/90 leading-snug">{it.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sticky buy bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-background/95 backdrop-blur px-3 pt-2.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.625rem)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 pr-1">
            <p className="text-lg font-black text-primary leading-none">
              {formatNaira(combo.totalPrice)}
            </p>
            {saving > 0 && (
              <p className="text-[11px] text-emerald-300 mt-1">Save {formatNaira(saving)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={openWhatsApp}
            aria-label="Order on WhatsApp"
            className="w-12 h-12 shrink-0 rounded-xl border border-emerald-400/50 text-emerald-300 flex items-center justify-center active:bg-emerald-400/10"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={addToCart}
            disabled={outOfStock}
            className="btn-primary flex-1 h-12 flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4" />
            {outOfStock ? 'Out of stock' : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}