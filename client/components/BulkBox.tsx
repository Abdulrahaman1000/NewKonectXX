/**
 * "Buy more, pay less" box for a product page.
 * Shows the price levels, a quantity box, the total, and a button to add that many pieces.
 * It shows nothing for products that have no bulk prices.
 *
 * Plain words on purpose: one job (pick how many), big buttons, the total always visible.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingBag, MessageCircle, Truck } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { fetchComboBySlug } from '@/api/combos';
import { useSettings } from '@/contexts/SettingsContext';
import { BULK_DELIVERY_FEE, priceForQty, tiersOf } from '@/lib/bulk';
import { preorderInfo } from '@/lib/preorder';
import type { Combo } from '@/types/combo';
import { HelpLine } from '@/components/HelpLine';

const MAX_QTY = 1000;

export function BulkBox({ combo, onAdd }: { combo?: Combo; onAdd: (qty: number) => void }) {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSettings();
  const { data: fetched } = useQuery({
    queryKey: ['combo', slug],
    queryFn: () => fetchComboBySlug(slug!),
    enabled: !combo && !!slug,
  });
  const c: any = combo ?? fetched;
  const tiers = tiersOf(c);
  const [qtyText, setQtyText] = useState('');
  const [touched, setTouched] = useState(false);

  if (!c || tiers.length === 0 || c.isActive === false) return null;

  const firstMin = tiers[0].minQty;
  const qty = !touched ? firstMin : Math.min(MAX_QTY, Math.max(1, parseInt(qtyText, 10) || 1));
  const unit = priceForQty(c.totalPrice, tiers, qty);
  const total = unit * qty;
  const stock = Number(c.stockLeft) || 0;
  const pre = preorderInfo(c);
  // Pre-order switch on and we have some, but not enough: the ready pieces come from stock, the rest are fetched.
  const partial = !pre.active && stock > 0 && qty > stock && Boolean(c.preorder);
  const tooMany = !pre.active && !partial && qty > stock;
  const isBulk = qty >= firstMin;

  const setQty = (n: number) => {
    setTouched(true);
    setQtyText(String(Math.min(MAX_QTY, Math.max(1, n))));
  };

  const waBase = settings?.contact?.whatsappLink ?? '#';
  const waUrl = `${waBase}${waBase.includes('?') ? '&' : '?'}text=${encodeURIComponent(
    `Hello Smart Combo, I want ${qty} pieces of ${c.name}.`,
  )}`;

  // Rows: the normal price, then each price level
  const rows = [
    { label: firstMin - 1 === 1 ? '1 piece' : `1 to ${firstMin - 1} pieces`, price: c.totalPrice, from: 1 },
    ...tiers.map((t) => ({ label: `${t.minQty}+ pieces`, price: t.unitPrice, from: t.minQty })),
  ];
  const activeFrom = [...rows].reverse().find((r) => qty >= r.from)?.from ?? 1;

  return (
    <div
      className="mt-6 rounded-2xl border border-primary/25 p-4 md:p-5"
      style={{ background: 'rgba(255,255,255,0.03)' }}
      data-testid="bulk-box"
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-base font-black text-white">Buy more, pay less</h3>
        <span className="text-xs text-white/50">Price for each piece:</span>
      </div>

      <div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
        {rows.map((r) => (
          <div
            key={r.from}
            className={`flex items-center justify-between px-3 py-2.5 text-[15px] ${
              r.from === activeFrom ? 'bg-primary/10 text-white font-bold' : 'text-white/75'
            }`}
          >
            <span>{r.label}</span>
            <span className={r.from === activeFrom ? 'text-primary font-black' : 'font-semibold'}>
              {formatNaira(r.price)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[15px] text-white/80 font-semibold">How many?</span>
        <div className="flex items-center rounded-xl border border-white/15">
          <button
            type="button"
            onClick={() => setQty(qty - 1)}
            aria-label="Fewer"
            className="w-12 h-12 flex items-center justify-center rounded-l-xl hover:bg-white/10"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QTY}
            value={touched ? qtyText : String(firstMin)}
            onChange={(e) => {
              setTouched(true);
              setQtyText(e.target.value);
            }}
            onBlur={() => setQtyText(String(qty))}
            aria-label="Number of pieces"
            className="w-16 h-12 bg-transparent text-center text-lg font-black text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            aria-label="More"
            className="w-12 h-12 flex items-center justify-center rounded-r-xl hover:bg-white/10"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-black/20 px-3 py-3">
        <span className="text-sm text-white/70">
          {qty} {qty === 1 ? 'piece' : 'pieces'} at {formatNaira(unit)}
        </span>
        <span className="text-xl font-black text-primary" data-testid="bulk-total">
          {formatNaira(total)}
        </span>
      </div>

      {isBulk && (
        <div className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-white/60">
          <Truck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <p>
            Delivery in Ilorin: {formatNaira(BULK_DELIVERY_FEE)} for your whole bulk order. Elsewhere we send through
            Jumia. You pay Jumia when it arrives. We add no fee. Bulk orders are paid online.
          </p>
        </div>
      )}

      {pre.active && (
        <p className="mt-3 text-[13px] leading-relaxed text-primary/90">
          Pre-order: we get these for you after you pay. They arrive in {pre.min} to {pre.max} business days. If we cannot
          get them, you get your money back.
        </p>
      )}

      {partial && (
        <div className="mt-3 space-y-3">
          <p className="text-[13px] leading-relaxed text-primary/90">
            We have {stock} ready now. The other {qty - stock} we get for you after you pay. They arrive in {pre.min} to{' '}
            {pre.max} business days. At checkout you choose to have the ready pieces sent first (Ilorin) or everything
            together.
          </p>
          <HelpLine topic={`${qty} pieces of ${c.name}`} />
        </div>
      )}

      {tooMany && (
        <p className="mt-3 text-[13px] text-amber-300">
          {stock > 0
            ? `We have ${stock} ready. Please choose ${stock} or fewer, or get a price on WhatsApp.`
            : 'This item is out of stock right now.'}
        </p>
      )}

      <button
        type="button"
        onClick={() => onAdd(qty)}
        disabled={tooMany || (stock === 0 && !pre.active)}
        className="btn-primary mt-4 w-full min-h-[48px] flex items-center justify-center gap-2 text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingBag className="w-4 h-4" />
        {pre.active ? 'Pre-order' : 'Add'} {qty} {qty === 1 ? 'piece' : 'pieces'}{pre.active ? '' : ' to cart'}
      </button>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary mt-2 w-full min-h-[48px] flex items-center justify-center gap-2 text-[15px] font-bold"
      >
        <MessageCircle className="w-4 h-4" />
        Get a price on WhatsApp
      </a>
    </div>
  );
}
