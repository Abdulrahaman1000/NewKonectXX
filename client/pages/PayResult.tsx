/** SC-VTU  /pay/result?reference=... : where Paystack sends the customer back. Checks the payment, then follows the purchase until it ends. */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Clock, Copy, Loader2, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { ServiceBadge, naira } from '@/components/vtu/brand';
import { getPurchase, type VtuView } from '@/api/vtu';

const groups = (t: string) => (/^\d{12,}$/.test(t.replace(/\D/g, '')) && /^[\d\s-]+$/.test(t) ? t.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : t);
const REFUND: Record<string, string> = {
  required: 'Your refund is being arranged.', refund_requested: 'Your refund has been sent to Paystack. It can take a few days to show in your account.',
  refunded: 'Your refund has been made.', failed: 'We are arranging your refund by hand. We will contact you.',
};

export default function PayResult() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const [o, setO] = useState<VtuView | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const tries = useRef(0);

  useEffect(() => {
    if (!reference) { setErr('No purchase reference.'); return; }
    let stop = false; let timer: any;
    const run = async () => {
      try {
        const v = await getPurchase(reference);
        if (stop) return;
        setO(v); setErr('');
        const open = v.paymentStatus === 'pending' || (v.paymentStatus === 'paid' && (v.fulfilmentStatus === 'pending' || v.fulfilmentStatus === 'processing'));
        if (open && ++tries.current < 40) timer = setTimeout(run, 3000);
      } catch (e: any) { if (!stop) { setErr(e.message); if (++tries.current < 5) timer = setTimeout(run, 4000); } }
    };
    run();
    return () => { stop = true; clearTimeout(timer); };
  }, [reference]);

  const state: 'wait' | 'ok' | 'fail' | 'unpaid' | 'check' =
    !o ? 'wait'
    : o.fulfilmentStatus === 'successful' ? 'ok'
    : o.fulfilmentStatus === 'failed' ? 'fail'
    : o.paymentStatus === 'failed' ? 'unpaid'
    : o.paymentStatus === 'mismatch' ? 'check'
    : o.paymentStatus === 'pending' ? 'wait'
    : 'wait';
  const stillWorking = o && o.paymentStatus === 'paid' && o.fulfilmentStatus !== 'successful' && o.fulfilmentStatus !== 'failed';
  const what = o ? (o.service === 'electricity' ? `${o.network} electricity` : `${o.network} ${o.planName}`) : '';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Your purchase | Smart Combo" description="Status of your recharge." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-10 md:py-14">
        <div className="container-premium max-w-lg">
          <div className="rounded-3xl border border-white/10 px-5 py-8 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="mx-auto grid place-items-center w-[72px] h-[72px] rounded-full"
              style={{ background: state === 'ok' ? 'rgba(52,211,153,0.15)' : state === 'fail' ? 'rgba(248,113,113,0.15)' : 'rgba(255,200,40,0.14)' }}>
              {state === 'wait' && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
              {state === 'ok' && <Check className="w-9 h-9 text-emerald-300" strokeWidth={3} />}
              {state === 'fail' && <X className="w-9 h-9 text-red-300" strokeWidth={3} />}
              {(state === 'unpaid' || state === 'check') && <Clock className="w-9 h-9 text-amber-300" />}
            </div>

            <h1 className="text-[26px] leading-tight font-black text-white mt-4">
              {state === 'ok' ? 'Payment successful' : state === 'fail' ? 'We could not complete it' : state === 'unpaid' ? 'Payment not completed' : state === 'check' ? 'We are checking your payment' : stillWorking ? 'Sending it now' : 'Confirming your payment'}
            </h1>
            {o && state === 'ok' && <p className="text-[34px] leading-none font-black text-primary tabular-nums mt-3">{naira(o.amount)}</p>}

            {o && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                <ServiceBadge k={o.service} size={40} solid />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white leading-tight">{what}</p>
                  <p className="text-xs text-white/55 mt-0.5 break-all">{o.meter ? `Meter ${o.meter.number}` : o.phone ? `To ${o.phone}` : ''}</p>
                </div>
                {state !== 'ok' && <p className="text-sm font-bold text-white tabular-nums">{naira(o.amount)}</p>}
              </div>
            )}

            {state === 'ok' && o?.token && (
              <div className="mt-4 rounded-2xl border border-primary/40 p-4 text-left" style={{ background: 'rgba(255,200,40,0.08)' }}>
                <p className="text-[13px] font-bold text-white/70">Your electricity token</p>
                <p className="text-[26px] leading-tight font-black tracking-[0.08em] text-primary break-all my-2 tabular-nums">{groups(o.token)}</p>
                {o.units && <p className="text-xs text-white/60">{o.units}</p>}
                <button type="button" className="mt-3 w-full min-h-[48px] rounded-xl bg-primary text-black font-black text-sm inline-flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  onClick={() => { navigator.clipboard?.writeText(o.token).then(() => setCopied(true)).catch(() => {}); }}>
                  {copied ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy token'}
                </button>
              </div>
            )}
            {state === 'ok' && !o?.token && <p className="text-sm text-white/70 mt-4">It has been sent. It can take a minute to show on the phone.</p>}
            {state === 'fail' && <p className="text-sm text-white/75 mt-4">{REFUND[o?.refundStatus ?? 'required'] ?? REFUND.required}</p>}
            {state === 'unpaid' && <p className="text-sm text-white/75 mt-4">No money was taken. You can try again.</p>}
            {state === 'check' && <p className="text-sm text-white/75 mt-4">The amount paid did not match this purchase. We will sort it out and contact you.</p>}
            {stillWorking && <p className="text-xs text-white/55 mt-4">This can take up to a minute. You can keep this page open.</p>}
            {err && !o && <p className="text-sm text-red-300 mt-4">{err}</p>}
            {o && <p className="text-[11px] text-white/40 mt-5 break-all">Reference: {o.reference}</p>}
          </div>
          <div className="mt-5 flex gap-2">
            <Link to="/pay" className="flex-1 min-h-[52px] rounded-2xl bg-primary text-black font-black inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white/70">Buy again</Link>
            <Link to="/" className="flex-1 min-h-[52px] rounded-2xl border border-white/20 text-white font-bold inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/70">Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
