/**
 * Customer: the instalment plan of an order (SC-INST). Shown on the tracking page and the confirmation page.
 * Shows what was paid, what is left, the deadline, a box to pay the next part, and the button to ask for extra days.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNaira } from '@/lib/format';
import { trackOrder } from '@/api/orders';
import { askExtraDays, payInstalment } from '@/api/instalments';
import { HelpLine } from '@/components/HelpLine';
import { planLink, removePlan, savePlan } from '@/lib/savedPlans';

const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/** Opens Google Calendar with an all-day reminder on the pay-by date. */
function calendarUrl(order: any, v: any) {
  const d = new Date(v.deadline);
  const ymd = (x: Date) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
  const next = new Date(d.getTime() + 86_400_000);
  const link = planLink({ orderNumber: order.orderNumber, phone: order.shipping?.phone ?? '' });
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(`Pay the rest: Smart Combo order ${order.orderNumber}`)}` +
    `&dates=${ymd(d)}/${ymd(next)}` +
    `&details=${encodeURIComponent(`Balance ${formatNaira(v.balance ?? 0)}. Pay here: ${link}`)}`
  );
}

const LABEL: Record<string, string> = {
  awaiting_first: 'Waiting for your first payment',
  active: 'In progress',
  paid: 'Fully paid',
  lapsed: 'Closed',
};

/** Fallback when the server did not send planView (for example right after checkout). */
function viewOf(order: any) {
  const p = order.plan;
  const v = order.planView;
  if (v) return v;
  const paidTotal = p.paidTotal ?? 0;
  return {
    status: p.status,
    paidTotal,
    balance: Math.max(0, order.total - paidTotal),
    payments: p.payments ?? [],
    deadline: p.deadline ?? null,
    daysLeft: null,
    overdue: false,
    canExtend: false,
    extensionDays: p.extensionDays ?? 0,
    nextSuggested: (p.payments?.length ?? 0) === 0 ? p.firstAmount : Math.max(0, order.total - paidTotal),
  };
}

export function InstalmentPanel({ order, onUpdated }: { order: any; onUpdated?: (o: any) => void }) {
  const [cur, setCur] = useState<any>(order);
  const [amount, setAmount] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);
  const [err, setErr] = useState('');

  useEffect(() => setCur(order), [order]);
  const plan = cur?.plan;
  const v: any = plan ? viewOf(cur) : null;
  useEffect(() => {
    if (v) setAmount(String(v.nextSuggested || ''));
  }, [v?.nextSuggested, v?.status]); // eslint-disable-line

  // Remember an open plan on this device (so the site can show a "Pay now" bar); forget it when finished
  useEffect(() => {
    if (!cur?.plan || !v) return;
    const phone = cur.shipping?.phone ?? '';
    if ((v.status === 'awaiting_first' || v.status === 'active') && cur.status === 'pending' && phone && (v.paidTotal ?? 0) > 0) {
      savePlan({ orderNumber: cur.orderNumber, phone, total: cur.total, paid: v.paidTotal ?? 0, balance: v.balance ?? 0, deadline: v.deadline ?? null, checkedAt: Date.now() });
    } else if (v.status === 'paid' || v.status === 'lapsed' || cur.status !== 'pending') {
      removePlan(cur.orderNumber);
    }
  }, [cur?.orderNumber, cur?.status, v?.status, v?.paidTotal, v?.balance, v?.deadline]); // eslint-disable-line

  if (!plan || !v) return null;

  const total: number = cur.total;
  const pct = Math.min(100, Math.round(((v.paidTotal ?? 0) / Math.max(1, total)) * 100));
  const open = (v.status === 'awaiting_first' || v.status === 'active') && cur.status === 'pending';

  const pay = async (value: number) => {
    setErr('');
    setBusy(true);
    try {
      try {
        sessionStorage.setItem(`order:${cur.orderNumber}:phone`, cur.shipping?.phone ?? '');
      } catch {
        /* private mode: fine */
      }
      const r = await payInstalment(cur.orderNumber, Math.round(value));
      window.location.href = r.authorizationUrl;
    } catch (e: any) {
      setErr(e?.message || 'Could not start the payment. Please try again.');
      setBusy(false);
    }
  };

  const extend = async () => {
    setErr('');
    setBusy(true);
    try {
      await askExtraDays(cur.orderNumber, cur.shipping?.phone ?? '', days);
      toast.success(`${days} extra days added`);
      const fresh = await trackOrder(cur.orderNumber, cur.shipping?.phone ?? '');
      if (fresh) {
        setCur(fresh);
        onUpdated?.(fresh);
      }
    } catch (e: any) {
      setErr(e?.message || 'Could not add the days.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 p-5 md:p-6 mb-5" style={{ background: 'rgba(255,200,40,0.05)' }} data-testid="instalment-panel">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] uppercase tracking-widest text-primary/80 font-bold">Your instalment plan</p>
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
          {LABEL[v.status] ?? v.status}
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden" aria-hidden>
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-white/70">
          Paid <b className="text-white">{formatNaira(v.paidTotal ?? 0)}</b> of {formatNaira(total)}
        </span>
        {v.status !== 'paid' && v.status !== 'lapsed' && (
          <span className="text-white/70">
            Left to pay <b className="text-primary">{formatNaira(v.balance ?? 0)}</b>
          </span>
        )}
      </div>

      {v.status === 'active' && v.deadline && (
        <p className={`mt-2 text-[13px] ${v.overdue ? 'text-red-300 font-bold' : 'text-white/70'}`}>
          {v.overdue
            ? `Your payment date, ${day(v.deadline)}, has passed. Please pay what is left now, or ask for more days below.`
            : `Pay everything by ${day(v.deadline)}${v.daysLeft != null ? ` (${v.daysLeft} day${v.daysLeft === 1 ? '' : 's'} left)` : ''}.`}
        </p>
      )}
      {v.status === 'awaiting_first' && (
        <p className="mt-2 text-[13px] text-white/70">Your plan starts when your first payment goes through. Your item is kept for you meanwhile.</p>
      )}
      {v.status === 'paid' && (
        <p className="mt-2 text-[13px] text-emerald-300 font-bold">Everything is paid. We are preparing your order.</p>
      )}
      {v.status === 'lapsed' && (
        <div className="mt-2 space-y-2">
          <p className="text-[13px] text-white/75">
            This plan was closed because it was not completed. What you paid is kept for you as store credit for your phone number for 90 days. To use it,
            talk to our customer service.
          </p>
          <HelpLine topic="my store credit" />
        </div>
      )}

      {(v.payments?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1 text-[12px] text-white/60">
          {v.payments.map((p: any, i: number) => (
            <li key={i}>
              Payment {i + 1}: {formatNaira(p.amount)} on {day(p.paidAt)}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[12px] font-bold text-white mb-2">{v.status === 'awaiting_first' ? 'Make your first payment' : 'Pay the next part'}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Amount to pay"
              className="min-h-[44px] flex-1 basis-36 rounded-lg bg-black/30 border border-white/10 px-3 text-sm text-white focus:border-primary/40 focus:outline-none"
            />
            <button
              type="button"
              disabled={busy || !Number(amount)}
              onClick={() => pay(Number(amount))}
              className="btn-primary min-h-[44px] px-4 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Pay {formatNaira(Number(amount) || 0)}
            </button>
          </div>
          {v.status === 'active' && (v.balance ?? 0) > 0 && Number(amount) !== v.balance && (
            <button
              type="button"
              disabled={busy}
              onClick={() => pay(v.balance)}
              className="mt-2 text-[12px] font-bold text-primary underline disabled:opacity-50"
            >
              Pay everything left ({formatNaira(v.balance)})
            </button>
          )}
        </div>
      )}

      {open && v.status === 'active' && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4" data-testid="pay-later-box">
          <p className="text-[14px] font-black text-white">How to pay the rest later</p>
          <ol className="mt-2 space-y-1.5 text-[13px] text-white/75 list-decimal pl-5">
            <li>Open our website and tap <b className="text-white">Track Order</b> (or open your link below).</li>
            <li>
              Enter your order number <b className="text-white">{cur.orderNumber}</b> and the phone number you used.
            </li>
            <li>Tap <b className="text-white">Pay</b>. Pay everything at once or part by part, before <b className="text-white">{day(v.deadline)}</b>.</li>
            <li>After your last payment, we send your order.</li>
          </ol>
          <p className="mt-2 text-[12px] text-white/55">
            On this phone, our website will also show a <b className="text-white/80">Pay now</b> bar until you finish. Save your link so you never lose it:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const link = planLink({ orderNumber: cur.orderNumber, phone: cur.shipping?.phone ?? '' });
                const done = () => toast.success('Link copied. Paste it in your notes or WhatsApp.');
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, () => window.prompt('Copy this link:', link));
                else window.prompt('Copy this link:', link);
              }}
              className="min-h-[42px] rounded-lg border border-primary/50 px-3 text-[12px] font-bold text-primary hover:bg-primary/10"
            >
              Copy my link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`My Smart Combo order ${cur.orderNumber}. Pay the rest (${formatNaira(v.balance ?? 0)}) before ${day(v.deadline)} here: ${planLink({ orderNumber: cur.orderNumber, phone: cur.shipping?.phone ?? '' })}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] rounded-lg border border-white/15 px-3 text-[12px] font-bold text-white/80 hover:bg-white/5 flex items-center"
            >
              Send the link to my WhatsApp
            </a>
            {v.deadline && (
              <a
                href={calendarUrl(cur, v)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] rounded-lg border border-white/15 px-3 text-[12px] font-bold text-white/80 hover:bg-white/5 flex items-center"
              >
                Remind me on my calendar
              </a>
            )}
          </div>
        </div>
      )}

      {open && v.status === 'active' && v.canExtend && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
          <p className="text-[12px] font-bold text-white mb-2">Need more time?</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Extra days"
              className="min-h-[44px] rounded-lg bg-black/30 border border-white/10 px-3 text-sm text-white"
            >
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} more days
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={extend}
              className="min-h-[44px] rounded-lg border border-amber-400/50 px-4 text-sm font-bold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
            >
              Ask for more days
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-white/50">You can do this once.</p>
        </div>
      )}
      {open && (v.extensionDays ?? 0) > 0 && (
        <p className="mt-3 text-[12px] text-white/60">You were given {v.extensionDays} extra days.</p>
      )}

      {err && <p className="mt-3 text-[13px] text-red-300">{err}</p>}

      {open && (
        <p className="mt-4 text-[11px] leading-relaxed text-white/40">
          Your goods are sent after your last payment. Payments are not refunded if you change your mind. If you stop paying, what you paid is kept as store
          credit for 90 days.
        </p>
      )}
    </div>
  );
}
