/** SC-VTU  /pay/result?reference=... : where Paystack sends the customer back. Checks the payment, then follows the purchase until it ends. */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { getPurchase, type VtuView } from '@/api/vtu';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
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
          <div className="rounded-2xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {state === 'wait' && <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />}
            {state === 'ok' && <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />}
            {state === 'fail' && <XCircle className="w-12 h-12 mx-auto text-red-400" />}
            {(state === 'unpaid' || state === 'check') && <Clock className="w-12 h-12 mx-auto text-amber-300" />}

            <h1 className="text-xl font-black text-white mt-3">
              {state === 'ok' ? 'Done!' : state === 'fail' ? 'We could not complete it' : state === 'unpaid' ? 'Payment not completed' : state === 'check' ? 'We are checking your payment' : stillWorking ? 'Sending it now...' : 'Confirming your payment...'}
            </h1>
            {o && (
              <p className="text-sm text-white/70 mt-1">
                {what}{o.phone ? ` · ${o.phone}` : ''}{o.meter ? ` · meter ${o.meter.number}` : ''} · <strong>{naira(o.amount)}</strong>
              </p>
            )}
            {state === 'ok' && o?.token && (
              <div className="mt-4 rounded-xl border border-primary/40 p-4" style={{ background: 'rgba(255,200,40,0.08)' }}>
                <p className="text-xs text-white/60">Your electricity token</p>
                <p className="text-xl font-black tracking-wider text-primary break-all my-1">{o.token}</p>
                {o.units && <p className="text-xs text-white/60">{o.units}</p>}
                <button type="button" className="mt-2 min-h-[44px] px-4 rounded-xl border border-primary text-primary font-bold text-sm inline-flex items-center gap-2"
                  onClick={() => { navigator.clipboard?.writeText(o.token).then(() => setCopied(true)).catch(() => {}); }}>
                  <Copy className="w-4 h-4" /> {copied ? 'Copied' : 'Copy token'}
                </button>
              </div>
            )}
            {state === 'ok' && !o?.token && <p className="text-sm text-white/70 mt-3">It has been sent. It can take a minute to show on the phone.</p>}
            {state === 'fail' && <p className="text-sm text-white/75 mt-3">{REFUND[o?.refundStatus ?? 'required'] ?? REFUND.required}</p>}
            {state === 'unpaid' && <p className="text-sm text-white/75 mt-3">No money was taken. You can try again.</p>}
            {state === 'check' && <p className="text-sm text-white/75 mt-3">The amount paid did not match this purchase. We will sort it out and contact you.</p>}
            {stillWorking && <p className="text-xs text-white/55 mt-3">This can take up to a minute. You can keep this page open.</p>}
            {err && !o && <p className="text-sm text-red-400 mt-3">{err}</p>}
            {o && <p className="text-[11px] text-white/40 mt-4 break-all">Reference: {o.reference}</p>}
          </div>
          <div className="mt-5 flex gap-2">
            <Link to="/pay" className="flex-1 min-h-[48px] rounded-xl bg-primary text-black font-black inline-flex items-center justify-center">Buy again</Link>
            <Link to="/" className="flex-1 min-h-[48px] rounded-xl border border-white/20 text-white font-bold inline-flex items-center justify-center">Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
