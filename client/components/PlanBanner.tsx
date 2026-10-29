/**
 * A slim bar on every page of the site: "You still owe N25,500 on order SC-... Pay now".
 * Shown only on a phone or computer where the customer started an instalment plan, until the plan is paid or closed.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { trackOrder } from '@/api/orders';
import { listSavedPlans, planLink, removePlan, savePlan, type SavedPlan } from '@/lib/savedPlans';

const HIDE_KEY = 'smartcombo:planBarHidden';
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '');

export function PlanBanner() {
  const { pathname } = useLocation();
  const [plans, setPlans] = useState<SavedPlan[]>(() => listSavedPlans());
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Once per visit: ask the server how each saved plan stands (paid, closed, new balance)
  useEffect(() => {
    let stop = false;
    (async () => {
      for (const p of listSavedPlans()) {
        if (Date.now() - (p.checkedAt || 0) < 10 * 60 * 1000) continue;
        try {
          const o: any = await trackOrder(p.orderNumber, p.phone);
          if (stop) return;
          const v = o?.planView;
          if (!o || !o.plan || !v || v.status === 'paid' || v.status === 'lapsed' || o.status !== 'pending') removePlan(p.orderNumber);
          else savePlan({ ...p, paid: v.paidTotal ?? 0, balance: v.balance ?? p.balance, deadline: v.deadline ?? p.deadline, checkedAt: Date.now() });
        } catch {
          /* offline or server busy: keep what we have */
        }
      }
      if (!stop) setPlans(listSavedPlans());
    })();
    return () => {
      stop = true;
    };
  }, []);

  const quiet = pathname.startsWith('/admin') || pathname.startsWith('/order-tracking') || pathname.startsWith('/order-confirmation') || pathname.startsWith('/checkout');
  const open = plans.filter((p) => p.balance > 0);
  if (hidden || quiet || open.length === 0) return null;

  const first = [...open].sort((a, b) => String(a.deadline ?? '9').localeCompare(String(b.deadline ?? '9')))[0];
  const late = first.deadline ? new Date(first.deadline).getTime() < Date.now() : false;

  return (
    <div
      className={`fixed left-3 right-3 bottom-20 md:bottom-6 md:left-6 md:right-auto md:max-w-sm z-[55] rounded-2xl border p-3 shadow-2xl backdrop-blur ${late ? 'border-red-400/50 bg-red-950/90' : 'border-primary/40 bg-neutral-900/95'}`}
      role="status"
      data-testid="plan-banner"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white leading-snug">
            You still owe {formatNaira(first.balance)} on order {first.orderNumber}
            {first.deadline ? (late ? `. Your date, ${day(first.deadline)}, has passed.` : `. Pay by ${day(first.deadline)}.`) : '.'}
          </p>
          {open.length > 1 && <p className="text-[11px] text-white/55">and {open.length - 1} more plan{open.length > 2 ? 's' : ''} on this device</p>}
          <Link to={planLink(first).replace(window.location.origin, '')} className="mt-2 inline-flex min-h-[40px] items-center rounded-lg bg-primary px-4 text-[13px] font-black text-black">
            Pay now
          </Link>
        </div>
        <button
          type="button"
          aria-label="Hide for now"
          onClick={() => {
            try {
              sessionStorage.setItem(HIDE_KEY, '1');
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
          className="shrink-0 rounded-full p-1.5 text-white/60 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
