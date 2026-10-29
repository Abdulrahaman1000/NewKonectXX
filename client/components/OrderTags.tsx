/**
 * Admin: small labels on an order ("Bulk", "Pre-order, waiting for goods", "In parts"),
 * and a panel that lists the parts of an order that is sent in parts.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { checkPlanPayments } from '@/api/instalments';
const naira = (n: any) => '\u20A6' + Math.round(Number(n) || 0).toLocaleString('en-NG');
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
      {order?.plan && (
        <span className={`${pill} border-primary/50 text-primary`}>
          {order.plan.status === 'paid'
            ? 'Instalments: fully paid'
            : order.plan.status === 'lapsed'
              ? 'Instalments: closed'
              : Number(order.plan.paidTotal ?? 0) <= 0
                ? 'Instalments: no payment yet'
                : `Part paid: ${naira(order.plan.paidTotal)} of ${naira(order.total)}, balance ${naira(Number(order.total ?? 0) - Number(order.plan.paidTotal ?? 0))}`}
        </span>
      )}
      {parts.length > 0 && (
        <span className={`${pill} border-violet-400/40 text-violet-300`}>
          In parts {sent}/{parts.length} sent
        </span>
      )}
    </>
  );
}

const dayOf = (d: any) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Admin order page: what this instalment customer has paid, what is left, and a button to ask Paystack again. */
export function PlanBox({ order }: { order: any }) {
  const plan = order?.plan;
  const [busy, setBusy] = useState(false);
  if (!plan) return null;
  const paid = Number(plan.paidTotal ?? 0);
  const total = Number(order.total ?? 0);
  const balance = Math.max(0, total - paid);
  const payments: any[] = plan.payments ?? [];
  const open = plan.status === 'awaiting_first' || plan.status === 'active';
  const check = async () => {
    setBusy(true);
    try {
      const r = await checkPlanPayments(order.orderNumber);
      if (r.recorded > 0) {
        toast.success(`${r.recorded} payment counted. Refreshing...`);
        setTimeout(() => window.location.reload(), 800);
      } else if (r.problems.length) toast.error(`Paystack answered but it could not be counted: ${r.problems[0]}`);
      else if (r.checked === 0) toast.message('No new payment was started by this customer.');
      else toast.message('Paystack says the payment was not completed.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not check');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-primary/30 p-5" style={{ background: 'rgba(255,215,0,0.04)' }}>
      <h3 className="text-sm font-black text-white mb-1">Paying in instalments</h3>
      <p className="text-[12px] text-white/55 mb-3">
        {plan.status === 'paid'
          ? 'Fully paid. This order is now a normal paid order.'
          : plan.status === 'lapsed'
            ? 'This plan was closed. The money paid is kept as store credit.'
            : 'The status stays "Pending" until the LAST payment. Do not pack or send anything before then.'}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/10 p-2"><p className="text-[10px] uppercase text-white/45">Paid</p><p className="text-sm font-black text-white">{naira(paid)}</p></div>
        <div className="rounded-xl border border-white/10 p-2"><p className="text-[10px] uppercase text-white/45">Balance</p><p className="text-sm font-black text-primary">{naira(balance)}</p></div>
        <div className="rounded-xl border border-white/10 p-2"><p className="text-[10px] uppercase text-white/45">Total</p><p className="text-sm font-black text-white">{naira(total)}</p></div>
      </div>
      {plan.deadline && open && (
        <p className="mt-2 text-[12px] text-white/60">
          Pay-by date: <b className="text-white">{dayOf(plan.deadline)}</b>
          {Number(plan.extensionDays) > 0 ? ` (customer took ${plan.extensionDays} extra days)` : ''}
        </p>
      )}
      {payments.length > 0 ? (
        <ul className="mt-2 text-[12px] text-white/70 space-y-0.5">
          {payments.map((p) => (
            <li key={p.n}>Payment {p.n}: <b className="text-white">{naira(p.amount)}</b> on {dayOf(p.paidAt)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] text-white/50">No payment has been counted yet.</p>
      )}
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={check} disabled={busy} className="rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50">
            {busy ? 'Checking...' : 'Check payment with Paystack'}
          </button>
          <span className="text-[11px] text-white/40">Use this if the customer says they paid but it is not shown.</span>
        </div>
      )}
    </div>
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
  if (parts.length === 0) return order?.plan ? <PlanBox order={order} /> : null;
  const items: any[] = order.items ?? [];
  return (
    <>
    {order?.plan && <PlanBox order={order} />}
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
    </>
  );
}
