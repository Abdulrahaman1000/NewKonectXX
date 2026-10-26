/**
 * Customer-facing: what is happening with an order that has pre-order pieces.
 * Plain words, one block per part. Used on the tracking page.
 */
import { HelpLine } from '@/components/HelpLine';

const WORDS: Record<string, string> = {
  waiting: 'We are getting these items for you.',
  to_pack: 'Ready. We are preparing it.',
  packed: 'Packed. It leaves us soon.',
  shipped: 'On the way to you.',
  delivered: 'Delivered.',
};

const when = (d?: string) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '');

export function OrderParts({ order }: { order: any }) {
  const items: any[] = order?.items ?? [];
  const shipments: any[] = order?.shipments ?? [];
  const pre = items.filter((i) => i.preorder);
  if (pre.length === 0) return null;
  if (order.status === 'cancelled' || order.status === 'refunded') return null;

  const min = Math.min(...pre.map((i) => Number(i.leadDaysMin) || 5));
  const max = Math.max(...pre.map((i) => Number(i.leadDaysMax) || 10));
  const paid = order.status !== 'pending';

  return (
    <div className="rounded-2xl border border-primary/30 p-5 md:p-6" style={{ background: 'rgba(255,200,40,0.06)' }} data-testid="order-parts">
      <p className="text-[10px] uppercase tracking-widest text-primary/80 font-bold mb-2">
        {shipments.length > 0 ? 'Your order comes in parts' : 'Pre-order'}
      </p>

      {shipments.length > 0 ? (
        <div className="space-y-3">
          {shipments.map((s) => (
            <div key={s.n} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-black text-white">
                Part {s.n} of {shipments.length}
              </p>
              <ul className="mt-1 text-[13px] text-white/75">
                {(s.itemIdx ?? []).map((ix: number) => (
                  <li key={ix}>
                    {items[ix]?.quantity} x {items[ix]?.variantSummary || items[ix]?.name}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[13px] font-bold text-primary">
                {WORDS[s.status] ?? ''}
                {s.status === 'waiting' && paid ? ` Expected in ${min} to ${max} business days after payment.` : ''}
                {s.status === 'shipped' && s.shippedAt ? ` Sent ${when(s.shippedAt)}.` : ''}
                {s.status === 'delivered' && s.deliveredAt ? ` ${when(s.deliveredAt)}.` : ''}
              </p>
              {s.trackingNumber && s.status === 'shipped' && (
                <p className="text-[12px] text-white/60">Tracking: {s.trackingNumber}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/80 leading-relaxed">
          {!paid
            ? `Your order has pre-order items. We start getting them once you pay. They arrive in ${min} to ${max} business days after payment.`
            : order.awaitingGoods
              ? `We are getting your items. They arrive in ${min} to ${max} business days after payment. We will pack and send your whole order as soon as they are here.`
              : 'Your items are here with us. We are preparing your order.'}
        </p>
      )}

      <HelpLine className="mt-4" topic={`order ${order.orderNumber ?? ''}`} />
    </div>
  );
}
