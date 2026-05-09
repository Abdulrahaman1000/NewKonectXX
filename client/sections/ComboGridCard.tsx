/**
 * ComboGridCard — compact card used in grid layouts.
 *
 * Shows:
 *  - A horizontal strip of all item images (so customer sees "watch + glasses + bracelet")
 *  - Combo name + tagline
 *  - Price (current + original) + savings badge
 *  - Add to cart button
 *
 * Clicking anywhere on the card (except Add to cart) navigates to /combos/:slug.
 */

import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/stores/cart';
import { calculateSavings, formatNaira } from '@/lib/format';
import { cldUrl } from '@/lib/cloudinary';
import type { Combo } from '@/types/combo';
import { toast } from 'sonner';

interface Props {
  combo: Combo;
}

export function ComboGridCard({ combo }: Props) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const { saving, percent } = calculateSavings(combo.originalPrice, combo.totalPrice);

  const itemThumbs = (combo.items ?? [])
    .map((item) => ({
      url: item.images?.[0]?.url,
      name: item.name,
      badge: item.badge,
    }))
    .filter((t) => !!t.url);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(combo);
    toast.success(`${combo.name} added to cart`);
    openCart();
  };

  return (
    <Link
      to={`/combos/${combo.slug}`}
      className="group block rounded-2xl border border-white/10 hover:border-primary/40 transition-colors overflow-hidden flex flex-col"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="relative bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 border-b border-white/5">
        {combo.badge && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-primary/95 text-black backdrop-blur">
              {combo.badge}
            </span>
          </div>
        )}

        {percent > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/90 text-black">
              -{percent}%
            </span>
          </div>
        )}

        {itemThumbs.length === 0 ? (
          <div className="aspect-[16/9] flex items-center justify-center text-white/30 text-xs">
            No images
          </div>
        ) : itemThumbs.length === 1 ? (
          <div className="aspect-square overflow-hidden">
            <img
              src={cldUrl(itemThumbs[0].url!, 'w_500,h_500,c_fill,q_auto,f_auto')}
              alt={itemThumbs[0].name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div
            className="grid gap-0.5 aspect-[16/10]"
            style={{ gridTemplateColumns: `repeat(${Math.min(itemThumbs.length, 4)}, 1fr)` }}
          >
            {itemThumbs.slice(0, 4).map((thumb, i) => (
              <div key={i} className="relative overflow-hidden">
                <img
                  src={cldUrl(thumb.url!, 'w_300,h_400,c_fill,q_auto,f_auto')}
                  alt={thumb.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {thumb.badge && (
                  <div className="absolute bottom-1 left-1 right-1">
                    <span className="block text-[8px] font-bold uppercase tracking-wide text-white/90 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-center truncate">
                      {thumb.badge}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-black text-white mb-1 line-clamp-1">{combo.name}</h3>
        {combo.tagline && (
          <p className="text-[11px] text-white/50 mb-3 line-clamp-1">{combo.tagline}</p>
        )}

        {itemThumbs.length > 0 && (
          <p className="text-[10px] text-white/40 mb-3 line-clamp-1">
            {itemThumbs.length} item{itemThumbs.length > 1 ? 's' : ''}: {itemThumbs.map((t) => t.name).join(' · ')}
          </p>
        )}

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xl font-black text-primary tabular-nums">
            {formatNaira(combo.totalPrice)}
          </span>
          {combo.originalPrice > combo.totalPrice && (
            <span className="text-xs text-white/30 line-through tabular-nums">
              {formatNaira(combo.originalPrice)}
            </span>
          )}
        </div>
        {saving > 0 && (
          <p className="text-[10px] font-bold text-emerald-400 mb-4">
            Save {formatNaira(saving)}
          </p>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleAddToCart}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold mt-2"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Add to cart
        </button>

        {combo.stockLeft <= 5 && combo.stockLeft > 0 && (
          <p className="text-[10px] text-amber-400/80 text-center mt-2">
            Only {combo.stockLeft} left
          </p>
        )}
      </div>
    </Link>
  );
}
