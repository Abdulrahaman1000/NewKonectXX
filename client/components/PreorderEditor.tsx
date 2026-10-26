/**
 * Admin: Pre-order switch on the product edit page. Owner only.
 * When on and the product has no stock, customers can still order and pay online.
 * You buy the item after payment, then press Got it on the To get page.
 */
import { useAuth } from '@/contexts/AuthContext';

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';

export function PreorderEditor({
  preorder,
  min,
  max,
  onChange,
}: {
  preorder: boolean;
  min: number;
  max: number;
  onChange: (patch: { preorder?: boolean; leadDaysMin?: number; leadDaysMax?: number }) => void;
}) {
  const { can } = useAuth();
  if (!can('owner')) return null;
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h2 className="text-sm font-black text-white mb-1">Pre-order</h2>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={preorder}
          onChange={(e) => onChange({ preorder: e.target.checked })}
          className="mt-1 w-5 h-5 accent-yellow-400"
        />
        <span>
          <span className="block text-sm font-bold text-white">Sell it even when there is no stock</span>
          <span className="block text-xs text-white/50 mt-0.5">
            When this is on and stock is 0, customers can still order and must pay online. You buy the item after they pay.
            Their order waits on the <b>To get</b> page until you press Got it, then it goes to Fulfilment.
          </span>
        </span>
      </label>
      {preorder && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="block">
            <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Waiting time from (business days)</span>
            <input
              type="number"
              min={1}
              value={min || ''}
              onChange={(e) => onChange({ leadDaysMin: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">to (business days)</span>
            <input
              type="number"
              min={1}
              value={max || ''}
              onChange={(e) => onChange({ leadDaysMax: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
          </label>
          <p className="col-span-2 text-[11px] text-white/45">
            Customers see: "It arrives in {min || 5} to {max || 10} business days. If we cannot get it, you get your money back."
          </p>
        </div>
      )}
    </div>
  );
}
