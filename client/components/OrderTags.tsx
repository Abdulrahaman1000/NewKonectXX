/**
 * Admin: small labels on an order ("Bulk", "Pre-order, waiting for goods", "In parts"),
 * and a panel that lists the parts of an order that is sent in parts.
 */
const pill = 'ml-2 inline-block rounded-full border px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide';

export function OrderTags({ order }: { order: any }) {
  const parts: any[] = order?.shipments ?? [];
  const sent = parts.filter((p) => p.status === 'shipped' || p.status === 'delivered').length;
  const waiting = Boolean(order?.awaitingGoods) && order?.status !== 'cancelled' && order?.status !== 'refunded';
  return (
    <>
      {order?.isBulk && <span className={`${pill} border-sky-400/40 text-sky-300`}>Bulk</span>}
      {order?.hasPreorder && waiting && (
        <span className={`${pill} border-amber-400/40 text-amber-300`}>Pre-order, waiting for goods</span>
      )}
      {order?.hasPreorder && !waiting && order?.status !== 'delivered' && (
        <span className={`${pill} border-white/20 text-white/60`}>Pre-order, goods here</span>
      )}
      {parts.length > 0 && (
        <span className={`${pill} border-violet-400/40 text-violet-300`}>
          In parts {sent}/{parts.length} sent
        </span>
      )}
    </>
  );
}

const STATE: Record<string, string> = {
  waiting: 'Waiting for goods (see To get)',
  to_pack: 'Ready to pack (see Fulfilment)',
  packed: 'Packed',
  shipped: 'On the way',
  delivered: 'Delivered',
};

export function OrderPartsPanel({ order }: { order: any }) {
  const parts: any[] = order?.shipments ?? [];
  if (parts.length === 0) return null;
  const items: any[] = order.items ?? [];
  return (
    <div className="rounded-2xl border border-violet-400/25 p-5" style={{ background: 'rgba(139,92,246,0.05)' }}>
      <h3 className="text-sm font-black text-white mb-3">Sent in parts</h3>
      <div className="space-y-3">
        {parts.map((p) => (
          <div key={p.n} className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-black text-white">
              Part {p.n} <span className="ml-2 font-bold text-violet-300">{STATE[p.status] ?? p.status}</span>
            </p>
            <ul className="mt-1 text-[12px] text-white/70">
              {(p.itemIdx ?? []).map((ix: number) => (
                <li key={ix}>
                  {items[ix]?.quantity} x {items[ix]?.name}
                </li>
              ))}
            </ul>
            {p.trackingNumber && <p className="mt-1 text-[11px] text-white/50">Tracking: {p.trackingNumber}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
