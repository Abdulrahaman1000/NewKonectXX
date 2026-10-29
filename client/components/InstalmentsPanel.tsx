/**
 * Admin (Fulfilment > Instalments): who is paying in parts, who is late, and the store credit that came from closed plans.
 * Nothing here runs by itself: you reach out, give days or close the plan.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNaira } from '@/lib/format';
import {
  checkPlanPayments,
  closePlan,
  getInstalmentCounts,
  giveMoreDays,
  listCredits,
  listInstalments,
  spendCredit,
  type AdminPlan,
} from '@/api/instalments';

const FILTERS: Array<[string, string]> = [
  ['awaiting_first', 'No payment yet'],
  ['active', 'Open'],
  ['overdue', 'Overdue'],
  ['due_soon', 'Due soon'],
  ['ready_to_lapse', 'Ready to close'],
  ['paid', 'Paid'],
  ['lapsed', 'Closed'],
];

const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** 0803... becomes 234803... for a WhatsApp link */
function waNumber(phone: string) {
  const d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('234')) return d;
  if (d.startsWith('0')) return '234' + d.slice(1);
  return d;
}

function reminder(p: AdminPlan) {
  const link = `${window.location.origin}/order-tracking?order=${encodeURIComponent(p.orderNumber)}&phone=${encodeURIComponent(p.phone)}`;
  const text = p.overdue
    ? `Hello ${p.customer}, this is Smart Combo. Your payment date for order ${p.orderNumber} has passed. The balance is ${formatNaira(p.balance)}. You can pay it or ask for more days here: ${link}`
    : `Hello ${p.customer}, this is Smart Combo. A reminder: the balance on your order ${p.orderNumber} is ${formatNaira(p.balance)}, due by ${day(p.deadline)}. Pay here: ${link}`;
  return `https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(text)}`;
}

export function InstalmentsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('active');
  const [daysFor, setDaysFor] = useState<Record<string, number>>({});

  const counts = useQuery({ queryKey: ['inst-counts'], queryFn: getInstalmentCounts, retry: false });
  const list = useQuery({ queryKey: ['inst-list', filter], queryFn: () => listInstalments(filter), retry: false });
  const credits = useQuery({ queryKey: ['inst-credits'], queryFn: listCredits, retry: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['inst-counts'] });
    qc.invalidateQueries({ queryKey: ['inst-list'] });
    qc.invalidateQueries({ queryKey: ['inst-credits'] });
  };
  const onErr = (e: any) => toast.error(e?.message || 'Something went wrong');

  const days = useMutation({
    mutationFn: (v: { n: string; d: number }) => giveMoreDays(v.n, v.d),
    onSuccess: () => {
      toast.success('Days added');
      refresh();
    },
    onError: onErr,
  });
  const check = useMutation({
    mutationFn: (n: string) => checkPlanPayments(n),
    onSuccess: (r) => {
      if (r.recorded > 0) toast.success(`${r.recorded} payment counted`);
      else if (r.problems.length) toast.error(`Paystack answered but it could not be counted: ${r.problems[0]}`);
      else if (r.checked === 0) toast.message('No new payment was started by this customer.');
      else toast.message('Paystack says the payment was not completed.');
      refresh();
    },
    onError: onErr,
  });
  const close = useMutation({
    mutationFn: (n: string) => closePlan(n),
    onSuccess: (r) => {
      toast.success(`Plan closed. ${formatNaira(r.creditAmount)} kept as store credit.`);
      refresh();
    },
    onError: onErr,
  });
  const used = useMutation({
    mutationFn: (v: { id: string; amount: number; note: string }) => spendCredit(v.id, v.amount, v.note),
    onSuccess: () => {
      toast.success('Credit updated');
      refresh();
    },
    onError: onErr,
  });

  const c = counts.data;
  const forbidden = (list.error as any)?.status === 403;

  return (
    <div>
      <p className="text-sm text-white/55 mb-4">
        Customers paying in parts. Their goods are sent only after the last payment. Nothing closes by itself: you remind them, give days, or close the plan.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(([k, label]) => {
          const n = k === 'active' ? c?.active : k === 'overdue' ? c?.overdue : k === 'due_soon' ? c?.dueSoon : k === 'ready_to_lapse' ? c?.readyToLapse : undefined;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter === k ? 'bg-primary text-black border-primary' : 'border-white/15 text-white/70 hover:bg-white/5'}`}
            >
              {label}
              {n !== undefined ? ` (${n})` : ''}
            </button>
          );
        })}
      </div>

      {list.isLoading && (
        <p className="text-sm text-white/45 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      )}
      {forbidden && <p className="text-sm text-amber-300">Only the owner can see instalment plans.</p>}
      {list.error && !forbidden && <p className="text-sm text-red-300">Could not load the plans.</p>}
      {!list.isLoading && !list.error && (list.data ?? []).length === 0 && (
        <p className="text-sm text-white/45 py-8 text-center">Nothing here.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(list.data ?? []).map((p) => (
          <div key={p.orderNumber} className={`rounded-xl border p-4 ${p.overdue ? 'border-red-400/40' : 'border-white/10'}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">{p.customer}</p>
                <p className="text-[11px] text-white/45 truncate">
                  {p.orderNumber} · {p.itemName}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  p.overdue ? 'border-red-400/50 text-red-300' : p.dueSoon ? 'border-amber-400/50 text-amber-300' : 'border-white/20 text-white/60'
                }`}
              >
                {p.status === 'paid'
                  ? 'Paid'
                  : p.status === 'lapsed'
                    ? 'Closed'
                    : p.status === 'awaiting_first'
                      ? 'No payment yet'
                      : p.overdue
                        ? `Overdue ${Math.abs(p.daysLeft ?? 0)}d`
                        : p.dueSoon
                          ? `Due in ${p.daysLeft}d`
                          : `${p.daysLeft ?? ''}d left`}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-white/75">
              Paid <b className="text-white">{formatNaira(p.paidTotal)}</b> of {formatNaira(p.total)}
              {p.status === 'active' ? (
                <>
                  {' '}
                  · left <b className="text-primary">{formatNaira(p.balance)}</b>
                </>
              ) : null}
            </p>
            {(p.payments ?? []).length > 0 && (
              <ul className="mt-1 text-[11px] text-white/55">
                {p.payments.map((x, i) => (
                  <li key={i}>
                    Payment {i + 1}: {formatNaira(x.amount)} on {day(x.paidAt)}
                  </li>
                ))}
              </ul>
            )}
            {p.deadline && p.status === 'active' && (
              <p className="text-[11px] text-white/45">
                Deadline {day(p.deadline)}
                {p.extensionDays > 0 ? ` (customer took ${p.extensionDays} extra days)` : ''}
              </p>
            )}
            <p className="text-[11px] text-white/45">
              <a href={`tel:${p.phone}`} className="text-primary hover:underline">
                {p.phone}
              </a>
            </p>

            {(p.status === 'active' || p.status === 'awaiting_first') && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={check.isPending}
                  onClick={() => check.mutate(p.orderNumber)}
                  className="rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {check.isPending ? 'Checking...' : 'Check payment'}
                </button>
                {p.status === 'active' && (
                  <>
                <a
                  href={reminder(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10"
                >
                  WhatsApp reminder
                </a>
                <select
                  value={daysFor[p.orderNumber] ?? 3}
                  onChange={(e) => setDaysFor((s) => ({ ...s, [p.orderNumber]: Number(e.target.value) }))}
                  className="rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-[11px] text-white"
                  aria-label="Days to give"
                >
                  {[1, 2, 3, 5, 7, 10, 14].map((n) => (
                    <option key={n} value={n}>
                      +{n} days
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={days.isPending}
                  onClick={() => days.mutate({ n: p.orderNumber, d: daysFor[p.orderNumber] ?? 3 })}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/5 disabled:opacity-50"
                >
                  Give days
                </button>
                <button
                  type="button"
                  disabled={close.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Close the plan for ${p.customer}? The item goes back on sale and the ${formatNaira(p.paidTotal)} they paid becomes store credit (no cash refund).`,
                      )
                    )
                      close.mutate(p.orderNumber);
                  }}
                  className="rounded-lg border border-red-400/40 px-3 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Close plan
                </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="text-sm font-black text-white mt-10 mb-1">Store credit</h3>
      <p className="text-[12px] text-white/45 mb-3">
        Money from closed plans. It is not paid back in cash. When the customer uses it on a later order, mark how much was used.
      </p>
      {(credits.data ?? []).length === 0 && <p className="text-sm text-white/40">No store credit yet.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(credits.data ?? []).map((cr) => (
          <div key={cr.id} className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-sm font-black text-white">{cr.name || cr.phone}</p>
            <p className="text-[11px] text-white/45">
              {cr.phone} · from {cr.orderNumber}
            </p>
            <p className="mt-1 text-[13px] text-white/75">
              Left <b className="text-primary">{formatNaira(cr.remaining)}</b> of {formatNaira(cr.amount)}
            </p>
            <p className={`text-[11px] ${cr.expired ? 'text-red-300' : 'text-white/45'}`}>
              {cr.expired ? 'Expired' : 'Valid until'} {day(cr.expiresAt)}
            </p>
            {cr.remaining > 0 && !cr.expired && (
              <button
                type="button"
                onClick={() => {
                  const a = Number(window.prompt(`How much of this credit was used? (up to ${cr.remaining})`) || 0);
                  if (a > 0) used.mutate({ id: cr.id, amount: a, note: 'used on a later order' });
                }}
                className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/5"
              >
                Mark some as used
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
