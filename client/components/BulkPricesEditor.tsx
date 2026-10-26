/**
 * Admin: the "Bulk prices" box on the product edit page. Owner only.
 * Each row means: from this many pieces, each one costs this much.
 * Shows a red warning when a price is below what you paid.
 */
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface BulkTierForm {
  minQty: number;
  unitPrice: number;
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

export function BulkPricesEditor({
  tiers,
  onChange,
  sellingPrice,
  cost,
}: {
  tiers: BulkTierForm[];
  onChange: (t: BulkTierForm[]) => void;
  sellingPrice: number;
  /** what one piece costs you (0 when not entered yet) */
  cost: number;
}) {
  const { can } = useAuth();
  if (!can('owner')) return null;

  const setRow = (i: number, patch: Partial<BulkTierForm>) =>
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addRow = () => {
    const last = tiers[tiers.length - 1];
    onChange([
      ...tiers,
      { minQty: last ? last.minQty * 2 : 10, unitPrice: last ? Math.max(0, last.unitPrice - 500) : Math.max(0, sellingPrice - 1000) },
    ]);
  };
  const removeRow = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h2 className="text-sm font-black text-white mb-1">Bulk prices</h2>
      <p className="text-xs text-white/50 mb-4">
        Lower price each when a customer buys more. Example: from 10 pieces, each costs a bit less. Leave empty for no bulk prices.
        Customers see these on the product page. Bulk orders are paid online and Ilorin delivery is a flat {naira(2000)}.
      </p>

      {tiers.length > 0 && (
        <div className="space-y-2">
          {tiers.map((t, i) => {
            const below = cost > 0 && t.unitPrice > 0 && t.unitPrice < cost;
            const notLower = t.unitPrice > 0 && sellingPrice > 0 && t.unitPrice >= sellingPrice;
            const prev = i > 0 ? tiers[i - 1] : null;
            const orderWrong = (prev && t.minQty <= prev.minQty) || t.minQty < 2;
            return (
              <div key={i} className="rounded-xl border border-white/10 p-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <label className="block">
                    <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">From pieces</span>
                    <input
                      type="number"
                      min={2}
                      value={t.minQty || ''}
                      onChange={(e) => setRow(i, { minQty: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Price each ({'₦'})</span>
                    <input
                      type="number"
                      min={0}
                      value={t.unitPrice || ''}
                      onChange={(e) => setRow(i, { unitPrice: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label="Remove this price level"
                    className="h-[42px] w-[42px] flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-red-300 hover:border-red-400/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {orderWrong && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    From pieces must be 2 or more, and bigger than the row above.
                  </p>
                )}
                {notLower && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    This price is not lower than the normal price ({naira(sellingPrice)}).
                  </p>
                )}
                {below && (
                  <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[12px] font-semibold text-red-200">
                    Selling below cost. You pay {naira(cost)} for one, so you lose {naira(cost - t.unitPrice)} on each piece.
                  </p>
                )}
                {!below && cost > 0 && t.unitPrice > 0 && (
                  <p className="mt-2 text-[11px] text-emerald-300/80">
                    Profit each: {naira(t.unitPrice - cost)} ({Math.round(((t.unitPrice - cost) / t.unitPrice) * 100)}%)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/40 text-primary text-xs font-bold hover:bg-primary/10"
      >
        <Plus className="w-3.5 h-3.5" />
        Add a price level
      </button>
      {cost === 0 && tiers.length > 0 && (
        <p className="mt-3 text-[11px] text-white/40">Enter your cost price above to see a warning when a bulk price is below it.</p>
      )}
    </div>
  );
}
