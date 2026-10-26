/**
 * "To get" list: paid pre-order pieces you still have to buy. Buy them, then press Got it.
 * Used as a tab inside Fulfilment and on the older /admin/to-get page.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PackageCheck, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { getToGet, markGotIt } from '@/api/adminToGet';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function ToGetPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-to-get'], queryFn: getToGet });
  const got = useMutation({
    mutationFn: markGotIt,
    onSuccess: () => {
      toast.success('Done. It is now in Fulfilment > To pack.');
      qc.invalidateQueries({ queryKey: ['admin-to-get'] });
      qc.invalidateQueries({ queryKey: ['admin-fulfilment'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Something went wrong'),
  });

  return (
    <div>
      <p className="text-sm text-white/45 mb-6">
        Pre-order pieces that customers have already paid for. Buy them, then press Got it on each order.
      </p>

      {isLoading && <p className="text-sm text-white/45 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</p>}
      {error && <p className="text-sm text-red-300">Could not load the list.</p>}
      {!isLoading && !error && (data?.orders.length ?? 0) === 0 && (
        <p className="text-sm text-white/45 py-10 text-center">Nothing to buy right now.</p>
      )}

      {(data?.list.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-primary/25 p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" /> Buy these
          </h2>
          <div className="divide-y divide-white/10">
            {data!.list.map((l) => (
              <div key={l.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-white/85">{l.name}</span>
                <span className="text-primary font-black">
                  {l.quantity} {l.quantity === 1 ? 'piece' : 'pieces'}
                  <span className="text-white/40 font-normal"> ({l.orders} {l.orders === 1 ? 'order' : 'orders'})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.orders.map((o) => (
          <div key={o._id} className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-white">{o.orderNumber}</p>
                <p className="text-xs text-white/50">{o.customer} - {o.phone}</p>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${o.late ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-white/5 text-white/70 border-white/15'}`}>
                {o.late ? 'Late: promised ' : 'Promised by '}{day(o.promisedBy)}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">Paid {day(o.paidAt)}</p>
            <ul className="mt-3 space-y-1.5">
              {o.items.map((i, k) => (
                <li key={k} className="flex justify-between text-sm text-white/80">
                  <span>{i.variantSummary || i.name}</span>
                  <span className="font-bold text-primary">x {i.quantity}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={got.isPending}
              onClick={() => got.mutate(o._id)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-primary text-black text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" /> Got it
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
